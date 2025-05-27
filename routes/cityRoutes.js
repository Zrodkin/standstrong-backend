import express from 'express'; // Use import
import City from '../models/City.js'; // Use import, add .js extension
import { protect, admin } from '../middleware/authMiddleware.js'; // Use import, add .js extension

const router = express.Router();

// POST /api/cities — Add new city
// Middleware usage (protect, admin, upload.single) remains the same
router.post('/', protect, admin, upload.single('image'), async (req, res, next) => { // Add next for error handling
  try {
    const { name } = req.body;
    // Check if req.file exists BEFORE trying to access its properties
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !imageUrl) {
      // Added check specifically for image upload success via req.file
      return res.status(400).json({ message: 'City name and image upload are required.' });
    }

    // Consider checking if city name already exists if it should be unique
    const existingCity = await City.findOne({ name });
    if (existingCity) {
      return res.status(409).json({ message: 'City with this name already exists.' }); // 409 Conflict
    }

    const city = new City({ name, imageUrl });
    await city.save();

    res.status(201).json(city);
  } catch (err) {
    console.error('Error creating city:', err);
    // Pass error to global error handler (if you have one)
    next(err);
    // Or send response directly (less ideal if you have a global handler)
    // res.status(500).json({ message: 'Server error creating city' });
  }
});

// GET /api/cities — List all cities
router.get('/', async (req, res, next) => { // Add next
  try {
    const cities = await City.find({});
    res.json(cities);
  } catch (err) {
    console.error('Error fetching cities:', err);
    next(err); // Pass error to global handler
    // res.status(500).json({ message: 'Failed to fetch cities' });
  }
});

// DELETE /api/cities/:id — Delete a city
router.delete('/:id', protect, admin, async (req, res, next) => { // Add next
  try {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    // Optionally: Delete the associated image file from /uploads
    // Requires 'fs' module and care with path manipulation
    res.json({ message: 'City deleted successfully' });
  } catch (err) {
    console.error('Error deleting city:', err);
    next(err); // Pass error to global handler
    // res.status(500).json({ message: 'Failed to delete city' });
  }
});

// PUT /api/cities/:id — Update city name and/or image
router.put('/:id', protect, admin, upload.single('image'), async (req, res, next) => { // Add next
  try {
    const { name } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    // Check if a new file was uploaded before setting imageUrl
    if (req.file) {
        updateData.imageUrl = `/uploads/${req.file.filename}`;
        // Optionally: Delete the old image file associated with the city before updating
    }

    // Ensure at least one field is being updated
    if (!name && !req.file) {
        return res.status(400).json({ message: 'No update data provided (name or image).' });
    }

    const city = await City.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }

    res.json(city);
  } catch (err) {
    console.error('Error updating city:', err);
    next(err); // Pass error to global handler
    // res.status(500).json({ message: 'Failed to update city' });
  }
});

export default router; // Use export default