// server/routes/uploadRoutes.js
import express from 'express';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// POST /api/upload - Upload a single file
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  res.status(201).json({
    filePath: `/uploads/${req.file.filename}`
  });
});

export default router;
