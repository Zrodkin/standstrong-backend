// backend/server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv'; // For environment variables like NODE_ENV, PORT, JWT_SECRET
import path from 'path';     // Node.js path module
import { fileURLToPath } from 'url'; // To get __dirname in ESM

// --- Load Environment Variables ---
// Needs 'dotenv' package: npm install dotenv
dotenv.config(); // Load variables from .env file into process.env

// --- Import Custom Modules (add .js extension) ---
import { port } from './config/config.js'; // Assuming 'port' is a named export
import connectDB from './config/db.js';     // Assuming connectDB is a default export
import userRoutes from './routes/userRoutes.js';
import classRoutes from './routes/classRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import cityRoutes from './routes/cityRoutes.js';
// Optional: Import custom error middleware if you create it
// import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// --- Define __dirname for ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Connect to MongoDB ---
// Using await here ensures connection before starting server (requires async context or top-level await support)
// Let's wrap the server start in an async function to use await reliably
const startServer = async () => {
  try {
    await connectDB(); // Wait for DB connection
    console.log('MongoDB Connected...');

    // Initialize Express app
    const app = express();

    // --- Core Middleware ---
    app.use(cors()); // Enable Cross-Origin Resource Sharing
    app.use(helmet({ // Basic security headers
       crossOriginResourcePolicy: { policy: "cross-origin" } // Needed if serving uploads cross-origin
     }));
    app.use(express.json()); // Parse JSON request bodies
    app.use(express.urlencoded({ extended: false })); // Parse URL-encoded request bodies

    // Logging Middleware (only in development)
    if (process.env.NODE_ENV === 'development') {
        app.use(morgan('dev'));
    }

    // --- API Routes ---
    app.use('/api/users', userRoutes);
    app.use('/api/classes', classRoutes);
    app.use('/api/attendance', attendanceRoutes);
    app.use('/api/cities', cityRoutes);

    // --- Static File Serving ---
    // Serve files from the 'uploads' directory
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // --- Basic Root Route ---
    app.get('/', (req, res) => {
      res.send('Stand Strong API is running...');
    });

    // --- Error Handling Middleware ---
    // Optional: Add a 404 Not Found handler (if using separate errorMiddleware.js)
    // app.use(notFound);

    // Your custom global error handler (keep it last)
    app.use((err, req, res, next) => {
        console.error("ERROR => ", err.message); // Log the error message
        const statusCode = res.statusCode === 200 ? 500 : res.statusCode; // Ensure status code is set appropriately
        res.status(statusCode);
        res.json({
          message: err.message,
          // Only show stack trace in development
          stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
        });
      });


    // --- Start Server ---
    const PORT = port || 5001; // Use port from config or default
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

  } catch (error) {
      console.error(`Error starting server: ${error.message}`);
      process.exit(1); // Exit process with failure
  }
};

// --- Execute Server Start ---
startServer();