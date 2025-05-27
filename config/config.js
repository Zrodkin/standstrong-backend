import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const port = process.env.PORT || 5000;
export const mongoUri = process.env.MONGO_URI;
export const jwtSecret = process.env.JWT_SECRET;
export const nodeEnv = process.env.NODE_ENV;