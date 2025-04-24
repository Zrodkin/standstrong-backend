const multer = require('multer');
const path = require('path');

// Multer config: store images in /uploads and use original filename
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

module.exports = upload;
