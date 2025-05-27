// backend/server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// --- Load Environment Variables ---
dotenv.config();

// --- Import Custom Modules ---
import { port } from './config/config.js';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import classRoutes from './routes/classRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import cityRoutes from './routes/cityRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';

// --- Define __dirname for ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const startServer = async () => {
  try {
    await connectDB();
    console.log('MongoDB Connected...');

    const app = express();

    // --- Core Middleware ---
    app.use(cors());
    app.use(helmet({
       crossOriginResourcePolicy: { policy: "cross-origin" }
     }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    if (process.env.NODE_ENV === 'development') {
        app.use(morgan('dev'));
    }



    // --- API Routes ---
    app.use('/api/users', userRoutes);
    app.use('/api/classes', classRoutes);
    app.use('/api/attendance', attendanceRoutes);
    app.use('/api/cities', cityRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api/registrations', registrationRoutes);

    // --- Basic Root Route ---
    app.get('/', (req, res) => {
      res.send('Stand Strong API is running...');
    });

    // --- Error Handling Middleware ---
    app.use((err, req, res, next) => {
        console.error("ERROR => ", err.message);
        const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
        res.status(statusCode);
        res.json({
          message: err.message,
          stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
        });
    });

    // --- Start Server ---
    const PORT = port || 5001;
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

  } catch (error) {
      console.error(`Error starting server: ${error.message}`);
      process.exit(1);
  }
};

startServer();