import express from 'express';
import City from '../models/City.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/cities — List all cities
router.get('/', async (req, res, next) => {
  try {
    const cities = await City.find({});
    res.json(cities);
  } catch (err) {
    console.error('Error fetching cities:', err);
    next(err);
  }
});

// POST /api/cities — Add new city (without image)
router.post('/', protect, admin, async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'City name is required.' });
    }

    // Check if city already exists
    const existingCity = await City.findOne({ name });
    if (existingCity) {
      return res.status(409).json({ message: 'City with this name already exists.' });
    }

    const city = new City({ name, imageUrl: '' }); // Empty imageUrl for now
    await city.save();

    res.status(201).json(city);
  } catch (err) {
    console.error('Error creating city:', err);
    next(err);
  }
});

// DELETE /api/cities/:id — Delete a city
router.delete('/:id', protect, admin, async (req, res, next) => {
  try {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    res.json({ message: 'City deleted successfully' });
  } catch (err) {
    console.error('Error deleting city:', err);
    next(err);
  }
});

export default router;