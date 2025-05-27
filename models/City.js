import mongoose from 'mongoose'; // Use import instead of require

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

export default City; // Use export default instead of module.exports