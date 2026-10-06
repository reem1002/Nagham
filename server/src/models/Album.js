import mongoose from 'mongoose';

const albumSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    key: { type: String, required: true },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
    year: { type: Number },
    cover: { type: String, default: '' },
  },
  { timestamps: true }
);

albumSchema.index({ owner: 1, artist: 1, key: 1 }, { unique: true });

export default mongoose.model('Album', albumSchema);
