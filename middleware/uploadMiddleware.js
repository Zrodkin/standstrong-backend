// server/middleware/uploadMiddleware.js
import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Needed to check and create folder if missing
import { fileURLToPath } from 'url'; // To get __dirname in ESM

// --- Define __dirname for ESM ---
// This provides the absolute path to the directory containing this file (uploadMiddleware.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // Should resolve to /path/to/project/backend/middleware

// --- Define the Absolute Path for Uploads ---
// Use path.join(__dirname, '..', ...) to go up one level from 'middleware' to 'backend'
// Then into 'uploads' and 'partner-logos'.
// This ensures the path is correct regardless of where the node process is started.
const partnerLogosUploadPath = path.join(__dirname, '..', 'uploads', 'partner-logos');

// --- Ensure Upload Directory Exists ---
// It's good practice to ensure the directory exists when the module loads.
try {
  if (!fs.existsSync(partnerLogosUploadPath)) {
    // recursive: true creates parent directories ('uploads') if they don't exist either
    fs.mkdirSync(partnerLogosUploadPath, { recursive: true });
    console.log(`Upload directory created: ${partnerLogosUploadPath}`);
  }
} catch (error) {
  // Log a more critical error if the directory can't be created, as uploads will fail.
  console.error(`FATAL: Could not create upload directory ${partnerLogosUploadPath}. Check permissions.`, error);
  // Consider if the application should exit if uploads are essential and the dir fails
  // process.exit(1);
}


// --- Multer Storage Configuration ---
const storage = multer.diskStorage({
  destination(req, file, cb) {
    // Use the pre-calculated absolute path for reliability
    cb(null, partnerLogosUploadPath);
  },
  filename(req, file, cb) {
    // Generate a unique filename while preserving the original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // path.extname() correctly extracts '.png', '.jpg', etc.
    const extension = path.extname(file.originalname);
    // Callback with the generated filename (e.g., partner-1678886400000-123456789.png)
    cb(null, 'partner-' + uniqueSuffix + extension);
  }
});

// --- File Filter Function ---
// Checks both extension and MIME type for allowed image formats
function checkFileType(file, cb) {
  // Define allowed file extensions (regex, case-insensitive)
  const filetypes = /jpeg|jpg|png|gif/;
  // Check the file extension (using path.extname and converting to lowercase)
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check the MIME type provided by the browser/client
  const mimetype = filetypes.test(file.mimetype);

  // Optional logging to help debug file uploads
  // console.log(`Checking file: ${file.originalname}, extname check: ${extname}, mimetype check: ${mimetype}`);

  if (mimetype && extname) {
    // Both checks passed, file type is allowed
    return cb(null, true);
  } else {
    // File type is not allowed - pass an error back to Multer.
    // This error can be caught by the error handler in uploadRoutes.js
    cb(new Error('Error: Images Only! (jpeg, jpg, png, gif)'), false);
  }
}

// --- Configure Multer Instance ---
const upload = multer({
  storage: storage, // Use the configured disk storage
  limits: {
    fileSize: 1024 * 1024 * 5 // Limit file size to 5MB (5 * 1024 * 1024 bytes)
  },
  fileFilter: function (req, file, cb) {
    // Apply the custom file filter function for each file
    checkFileType(file, cb);
  }
});

// Export the configured Multer middleware for use in routes
export default upload;