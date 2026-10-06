import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 300 },
    cover: { type: String, default: '' },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Playlist', playlistSchema);
