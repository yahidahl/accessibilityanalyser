import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  url: String,
  score: Number,
  issues: [String],
  userId: String,
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);
