// frontend/utils/generateToken.js
import jwt from 'jsonwebtoken'; // Use import for the library
import { jwtSecret } from '../config/config.js'; // Use import for your config, add .js extension

const generateToken = (id) => {
  // The logic inside the function remains the same
  return jwt.sign({ id }, jwtSecret, { // Ensure jwtSecret is exported correctly from config.js
    expiresIn: '30d', // Token expires in 30 days
  });
};

// Export the function as the default export
export default generateToken;