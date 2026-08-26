require("dotenv").config();

const path = require("path");
const express = require("express");
const multer = require("multer");
const { MongoClient, GridFSBucket, ObjectId } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Thieu bien moi truong MONGO_URI. Tao file .env va them MONGO_URI=... roi chay lai.");
  process.exit(1);
}

// Phuc vu toan bo tool ghep anh (index.html, app.js, ...) tu thu muc public/
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // toi da 15MB / anh
});

let bucket;

async function start() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db("ghepanh_data"); // ten database rieng, khong lien quan shop
  bucket = new GridFSBucket(db, { bucketName: "ghepanh_images" });
  console.log("Da ket noi MongoDB (ghepanh_data) - luu anh vinh vien qua GridFS.");

  // Upload 1 anh -> luu vao GridFS, tra ve url de FE luu lai
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) return res.status(400).json({ ok: false, error: "Thieu file anh" });

    const stream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype
    });
    stream.end(req.file.buffer);

    stream.on("finish", () => {
      res.json({ ok: true, fileId: stream.id.toString(), url: `/api/images/${stream.id}` });
    });
    stream.on("error", (err) => {
      res.status(500).json({ ok: false, error: err.message });
    });
  });

  // Tai lai 1 anh theo id
  app.get("/api/images/:id", (req, res) => {
    let objectId;
    try {
      objectId = new ObjectId(req.params.id);
    } catch {
      return res.status(400).end();
    }
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    bucket.openDownloadStream(objectId)
      .on("error", () => res.status(404).end())
      .pipe(res);
  });

  app.listen(PORT, () => {
    console.log(`Server dang chay: http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Khong ket noi duoc MongoDB:", err.message);
  process.exit(1);
});
