const express = require('express');
const City = require('../models/City');
const upload = require('../middleware/uploadMiddleware');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/cities — Add new city
router.post('/', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !imageUrl) {
      return res.status(400).json({ message: 'City name and image are required.' });
    }

    const city = new City({ name, imageUrl });
    await city.save();

    res.status(201).json(city);
  } catch (err) {
    console.error('Error creating city:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/cities — List all cities
router.get('/', async (req, res) => {
  try {
    const cities = await City.find({});
    res.json(cities);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch cities' });
  }
});

// DELETE /api/cities/:id — Delete a city
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    res.json({ message: 'City deleted successfully' });
  } catch (err) {
    console.error('Error deleting city:', err);
    res.status(500).json({ message: 'Failed to delete city' });
  }
});

// PUT /api/cities/:id — Update city name and/or image
router.put('/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;

    const city = await City.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }

    res.json(city);
  } catch (err) {
    console.error('Error updating city:', err);
    res.status(500).json({ message: 'Failed to update city' });
  }
});

module.exports = router;
