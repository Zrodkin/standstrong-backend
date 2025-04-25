import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Needed to check and create folder if missing

// Multer config: store images in /uploads and use a unique filename
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadPath = 'uploads/partner-logos/'; // <-- store all partner logos here
    // Ensure the folder exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'partner-' + uniqueSuffix + extension); // Example: partner-1678886400000-123456789.png
  }
});

// File filter function to allow only specific image types
function checkFileType(file, cb) {
  // Define allowed file extensions
  const filetypes = /jpeg|jpg|png|gif/;
  // Check the file extension using the 'path' module
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check the MIME type reported by the browser
  const mimetype = filetypes.test(file.mimetype);

  console.log(`Checking file: ${file.originalname}, extname: ${extname}, mimetype: ${mimetype}`); // Optional logging

  if (mimetype && extname) {
    // Both MIME type and extension match allowed types
    return cb(null, true);
  } else {
    // File type is not allowed
    // Pass an error message back to Multer
    cb(new Error('Error: Images Only! (jpeg, jpg, png, gif)'), false);
  }
}

// Configure Multer with storage, limits, and file filter
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // Limit file size to 5MB (adjust as needed)
  },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb); // Apply the file filter function
  }
});

// Export the configured Multer middleware as the default export
export default upload;