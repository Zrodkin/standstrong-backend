// backend/routes/uploadRoutes.js
import express from 'express';
import upload, { processAndSaveImage } from '../middleware/uploadMiddleware.js'; // Import processing function
import multer from 'multer';

const router = express.Router();

router.post('/', upload.single('file'), async (req, res, next) => {
  console.log("=== UPLOAD ROUTE HIT ===");
  console.log("Upload request received. Type:", req.query.type);
  console.log("File received:", !!req.file);
  
  if (!req.file) {
    console.log('Upload attempt failed: No file received or file rejected early.');
    return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
  }
  
  const uploadType = req.query.type || 'logo';
  const subfolder = uploadType === 'image' ? 'class-images' : 'partner-logos';

  try {
    // Process the image to create WebP version
    const imagePaths = await processAndSaveImage(req.file);
    
    // Store the path without extension - we'll add it when serving
    const baseFilename = req.file.filename.replace(/\.[^/.]+$/, '');
    const filePath = `/uploads/${subfolder}/${baseFilename}`;

    console.log(`File uploaded via uploadRoutes: ${filePath} (Type: ${uploadType})`);
    console.log(`WebP version: ${imagePaths.webp ? 'Created' : 'Failed'}`);

    res.status(201).json({
      message: 'File uploaded successfully',
      filePath: filePath,
      hasWebP: !!imagePaths.webp
    });
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    // Fallback to basic upload if processing fails
    const filePath = `/uploads/${subfolder}/${req.file.filename}`;
    res.status(201).json({
      message: 'File uploaded successfully (WebP conversion failed)',
      filePath: filePath,
      hasWebP: false
    });
  }
});

// Optional but Recommended: Add specific error handling for this route
router.use((err, req, res, next) => {
  console.error("Error in upload route:", err); // Log the actual error

  if (err instanceof multer.MulterError) {
    // Handle specific Multer errors (e.g., file size limit)
    return res.status(400).json({ message: `File upload error: ${err.message}` });
  } else if (err) {
    // Handle errors from fileFilter or other unexpected errors
    // Check if it's the specific error message from your filter
    if (err.message && err.message.includes('Invalid file type')) {
         return res.status(400).json({ message: err.message });
    }
    // Generic error
    return res.status(500).json({ message: err.message || 'An unexpected error occurred during file upload.' });
  }
  // If no error handled here, pass to next error handler if any
  next();
});


export default router;