require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

// ================== MIDDLEWARE ==================
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://parkingmanagementsysstem.netlify.app",
    ],
  })
);

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

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    userEmail: String,
    userName: String,
    password: String,
  })
);

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

// ================== LOGIN ==================
app.post("/login", async (req, res) => {
  try {
    const { userEmail, password } = req.body;

    const user = await User.findOne({ userEmail });
    if (!user) return res.json({ success: false });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.json({ success: false });

    const token = jwt.sign(
      { userEmail: user.userEmail, userName: user.userName },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ success: true, token });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

// ================== SIGNUP ==================
app.post("/signup", async (req, res) => {
  const { userEmail, password, userName } = req.body;

  const hashed = await bcrypt.hash(password, 10);
  await new User({ userName, password: hashed, userEmail }).save();

  res.json({ success: true });
});

// ================== SUBMIT ==================
app.post("/submit-batch", authMiddleware, async (req, res) => {
  try {
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

// ================== REPORT ==================
app.post("/report", authMiddleware, async (req, res) => {
  try {
    const { site, date, user } = req.body;
    const cleanDate = normalizeDate(date);

    const data = await Parking.find({ site, date: cleanDate });

    const doc = new PDFDocument();
    let buffers = [];

    doc.text(`SITE: ${site}`);
    doc.text(`DATE: ${cleanDate}`);
    doc.text(`Security Officer: ${user.userName}`);
    doc.moveDown();

    let longStay = [];

    for (const e of data) {
      const days = await getDayCount(e);

      if (days >= 5) {
        doc.fillColor("red");
        longStay.push({ ...e, days });
      } else {
        doc.fillColor("black");
      }

      doc.text(
        `${e.row} | space ${e.spaceNumber} | ${e.plateNumber} | ${days} days`
      );
    }

    if (longStay.length > 0) {
      doc.moveDown();
      doc.fillColor("red");
      doc.text("LONG STAY (5+ DAYS)");
    }

    longStay.forEach((e) => {
      doc.text(`${e.plateNumber} → ${e.days} days`);
    });

    // PDF oluşturmayı await et
    const pdf = await new Promise((resolve, reject) => {
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);
      doc.end();
    });

    // EMAIL (await!)
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Parking Report",
      attachments: [{ filename: "report.pdf", content: pdf }],
    });

    console.log("📧 Mail sent");

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Report error" });
  }
});

// ================== TEST ==================
app.get("/test", (req, res) => {
  res.json({ message: "API TEST!!" });
});

// ================== START ==================
app.listen(5001, () => {
  console.log("🚀 Server running on port 5001");
});
