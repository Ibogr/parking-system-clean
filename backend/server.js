require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

// ================== MIDDLEWARE ==================
// Enable CORS for cross-origin requests
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// ================== DATABASE CONNECTION ==================
// Connect to MongoDB using environment variable
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ Mongo error:", err));

// ================== SCHEMAS ==================

// Parking schema represents each parking record
const parkingSchema = new mongoose.Schema({
  site: String, // Site name
  row: String, // Parking row (e.g., A, B, C)
  spaceNumber: Number, // Parking space number
  plateNumber: String, // Vehicle plate number
  personnel: String, // Officer who recorded the entry
  date: String, // Date (YYYY-MM-DD)

  // Manual override for day count (used when historical data is missing)
  manualDays: { type: Number, default: null },
});

// Prevent duplicate entries for same space on same day
parkingSchema.index(
  { site: 1, row: 1, spaceNumber: 1, date: 1 },
  { unique: true }
);

const Parking = mongoose.model("Parking", parkingSchema);

// User schema for authentication
const userSchema = new mongoose.Schema({
  userEmail: String,
  userName: String,
  password: String,
  role: { type: String, default: "officer" }, // officer or admin
});

const User = mongoose.model("User", userSchema);

// ================== AUTH MIDDLEWARE ==================
// Protect routes using JWT authentication
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// ================== UTIL FUNCTIONS ==================

// Normalize date to YYYY-MM-DD format
function normalizeDate(date) {
  return date.split("T")[0];
}

// ================== DAY COUNT LOGIC ==================
/*
  Calculates how many consecutive days a vehicle has been parked.

  Logic:
  - If current record has manualDays → use it as starting point
  - Then check previous days in DB
  - If a previous record has manualDays → continue from there
  - Otherwise, keep counting backward
*/
async function getDayCount(e) {
  let count = e.manualDays || 1;
  let d = new Date(e.date);

  while (true) {
    d.setDate(d.getDate() - 1);
    const prevDate = d.toISOString().split("T")[0];

    const prev = await Parking.findOne({
      site: e.site,
      row: e.row,
      spaceNumber: e.spaceNumber,
      plateNumber: e.plateNumber,
      date: prevDate,
    });

    // Stop if no previous record
    if (!prev) break;

    // If previous record has manualDays, continue from there
    if (prev.manualDays && prev.manualDays > 0) {
      count = prev.manualDays + 1;
      break;
    }

    count++;
  }

  return count;
}

// ================== AUTH ROUTES ==================

// User signup
app.post("/signup", async (req, res) => {
  try {
    const { userEmail, password, userName, role } = req.body;

    // Hash password before saving
    const hashed = await bcrypt.hash(password, 10);

    await new User({
      userEmail,
      userName,
      password: hashed,
      role: role || "officer",
    }).save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// User login
app.post("/login", async (req, res) => {
  try {
    const { userEmail, password } = req.body;

    const user = await User.findOne({ userEmail });
    if (!user) return res.json({ success: false });

    // Compare password
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.json({ success: false });

    // Generate JWT token
    const token = jwt.sign(
      {
        userEmail: user.userEmail,
        userName: user.userName,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ================== SUBMIT PARKING ==================

// Submit multiple parking entries
app.post("/submit-batch", authMiddleware, async (req, res) => {
  try {
    // Only officers can submit
    if (req.user.role !== "officer") {
      return res.status(403).json({ message: "Only officers can submit" });
    }

    const { site, date, entries } = req.body;
    const cleanDate = normalizeDate(date);

    // Prepare data for insertion
    const data = entries.map((e) => ({
      site,
      row: e.row,
      spaceNumber: Number(e.spaceNumber),
      plateNumber: e.plateNumber,
      personnel: req.user.userName,
      date: cleanDate,

      // Optional manual override
      manualDays: e.manualDays || null,
    }));

    await Parking.insertMany(data, { ordered: false });

    res.json({ success: true });
  } catch (err) {
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.json({
        success: false,
        message: "Duplicate space ❌",
      });
    }

    res.status(500).json({ error: "Server error" });
  }
});

// ================== REPORT ==================

// Get parking report with calculated day counts
app.get("/reports", authMiddleware, async (req, res) => {
  try {
    const { site, date } = req.query;

    let filter = {};
    if (site) filter.site = site;
    if (date) filter.date = normalizeDate(date);

    const data = await Parking.find(filter).sort({ date: -1 });

    const result = [];

    for (const e of data) {
      const days = await getDayCount(e);

      result.push({
        site: e.site,
        row: e.row,
        spaceNumber: e.spaceNumber,
        plateNumber: e.plateNumber,
        personnel: e.personnel,
        date: e.date,
        days,
        longStay: days >= 5, // flag for long stay vehicles
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: "Report error" });
  }
});


// ================== PDF ==================
const path = require("path");
const PDFDocument = require("pdfkit");

app.get("/reports/download", authMiddleware, async (req, res) => {
  try {
    const { site, date } = req.query;
    const cleanDate = normalizeDate(date);

    const data = await Parking.find({ site, date: cleanDate });

    // Officer name from first record
    const officerName =
      data.length > 0 ? data[0].personnel : "No Officer";

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=parking-report.pdf"
    );

    doc.pipe(res);

    // LOGO
    const logoPath = path.join(__dirname, "manguard.png");

    try {
      const imgWidth = 140;
      const x = (doc.page.width - imgWidth) / 2;

      doc.image(logoPath, x, 20, { width: imgWidth });
    } catch (err) {
      console.log("Logo error:", err);
    }

    doc.moveDown(6);

    // TITLE
    doc.fontSize(20).text("Parking Report", { align: "center" });

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor("gray")
      .text(`Generated: ${formatDate(new Date())}`, {
        align: "center",
      });

    doc.moveDown(2);

    // INFO
    doc
      .fontSize(12)
      .fillColor("black")
      .text(`Site: ${site}`)
      .text(`Date: ${formatDate(date)}`)
      .text(`Security Officer: ${officerName}`)
      .moveDown();

    // TABLE HEADER
    const startY = doc.y;

    doc
      .fontSize(11)
      .text("Row", 40, startY)
      .text("Space", 100, startY)
      .text("Plate", 170, startY)
      .text("Days", 300, startY);

    doc
      .moveTo(40, startY + 15)
      .lineTo(500, startY + 15)
      .stroke();

    // TABLE DATA
    let y = startY + 25;
    let total = 0;
    let longStayCount = 0;

    for (const e of data) {
      const days = await getDayCount(e);
      total++;

      if (days >= 5) {
        doc.fillColor("red");
        longStayCount++;
      } else {
        doc.fillColor("black");
      }

      doc
        .fontSize(10)
        .text(e.row, 40, y)
        .text(String(e.spaceNumber), 100, y)
        .text(e.plateNumber, 170, y)
        .text(String(days), 300, y);

      y += 20;

      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    }

    doc.fillColor("black");

    // SUMMARY
    doc
      .moveDown(2)
      .fontSize(12)
      .text("Summary", { underline: true })
      .moveDown(0.5)
      .text(`Total Cars: ${total}`)
      .text(`Long Stay (5+ days): ${longStayCount}`);

    // FOOTER
    doc
      .fontSize(8)
      .fillColor("gray")
      .text("Generated by Ibrahim Gurses", 40, doc.page.height - 50, {
        align: "center",
      });

    doc.end();
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "PDF error" });
  }
});
// ================== START SERVER ==================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
