require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

// ================== MIDDLEWARE ==================
app.use(cors());

app.use(express.json());

// ================== DB ==================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ Mongo error:", err));

// ================== SCHEMA ==================
const parkingSchema = new mongoose.Schema({
  site: String,
  row: String,
  spaceNumber: Number,
  plateNumber: String,
  personnel: String,
  date: String,
});

parkingSchema.index(
  { site: 1, row: 1, spaceNumber: 1, date: 1 },
  { unique: true }
);

const Parking = mongoose.model("Parking", parkingSchema);

const userSchema = new mongoose.Schema({
  userEmail: String,
  userName: String,
  password: String,
  role: { type: String, default: "officer" }, // officer | manager
});

const User = mongoose.model("User", userSchema);

// ================== AUTH ==================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// ================== DATE ==================
function normalizeDate(date) {
  return date.split("T")[0];
}

// ================== DAY COUNT ==================
async function getDayCount(e) {
  let count = 1;
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

    if (!prev) break;

    count++;
  }

  return count;
}

// ================== SIGNUP ==================
app.post("/signup", async (req, res) => {
  try {
    const { userEmail, password, userName, role } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    await new User({
      userEmail,
      userName,
      password: hashed,
      role: role || "officer",
    }).save();

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

// ================== LOGIN ==================
app.post("/login", async (req, res) => {
  try {
    const { userEmail, password } = req.body;

    const user = await User.findOne({ userEmail });
    if (!user) return res.json({ success: false });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.json({ success: false });

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
    console.log(err);
    res.status(500).json({ success: false });
  }
});

// ================== SUBMIT (SECURITY) ==================
app.post("/submit-batch", authMiddleware, async (req, res) => {
  console.log(req.body)
  try {
    // if (req.user.role !== "officer") {
    //   return res.status(403).json({ message: "Only officers can submit" });
    // }

    const { site, date, entries } = req.body;

    const cleanDate = normalizeDate(date);

    const data = entries.map((e) => ({
      site,
      row: e.row,
      spaceNumber: Number(e.spaceNumber),
      plateNumber: e.plateNumber,
      personnel: req.user.userName,
      date: cleanDate,
    }));

    await Parking.insertMany(data, { ordered: false });

    res.json({ success: true });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({
        success: false,
        message: "Duplicate space ❌",
      });
    }

    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================== REPORT (MANAGER) ==================
app.get("/reports", authMiddleware, async (req, res) => {
  try {
    // if (req.user.role !== "manager") {
    //   return res.status(403).json({ message: "Access denied" });
    // }

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
        longStay: days >= 5,
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Report error" });
  }
});
const path = require("path");
const PDFDocument = require("pdfkit");

app.get("/reports/download", authMiddleware, async (req, res) => {

  function formatDate(date) {
    const d = new Date(date);

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  }

  try {
    const { site, date } = req.query;
    const cleanDate = normalizeDate(date);

    const data = await Parking.find({ site, date: cleanDate });

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=parking-report.pdf"
    );

    doc.pipe(res);

    // ================== LOGO (TOP CENTER) ==================
    const logoPath = path.join(__dirname, "manguard.png");

    try {
      const imgWidth = 140;

      const x = (doc.page.width - imgWidth) / 2;
      const y = 20; 

      doc.image(logoPath, x, y, {
        width: imgWidth,
      });
    } catch (err) {
      console.log("Logo error:", err);
    }

    // LOGO ALTINA BOŞLUK VER
    doc.moveDown(6);

    // ================== TITLE ==================
    doc
      .fontSize(20)
      .fillColor("black")
      .text("Parking Report", { align: "center" });

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor("gray")
      .text(`Generated: ${formatDate(new Date())}`, {
        align: "center",
      });

    doc.moveDown(2);

    // ================== INFO ==================
doc
  .fontSize(12)
  .fillColor("black")
  .text(`Site: ${site}`)
  .text(`Date: ${formatDate(cleanDate)}`)
  .text(`Security Officer: ${req.user.userName}`) 
  .moveDown();
    // ================== TABLE HEADER ==================
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

    // ================== TABLE DATA ==================
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

    // ================== SUMMARY ==================
    doc.moveDown(2);

    doc
      .fontSize(12)
      .text("Summary", { underline: true })
      .moveDown(0.5)
      .text(`Total Cars: ${total}`)
      .text(`Long Stay (5+ days): ${longStayCount}`);

    // ================== FOOTER ==================
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

// ================== TEST ==================
app.get("/test", (req, res) => {
  res.json({ message: "API WORKING 🚀" });
});

// ================== START ==================
app.listen(5001, () => {
  console.log("🚀 Server running on port 5001");
});
