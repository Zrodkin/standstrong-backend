const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  imageUrl: {
    type: String,
    required: true,
  }
}, {
  timestamps: true,
});

const City = mongoose.model('City', citySchema);
module.exports = City;
