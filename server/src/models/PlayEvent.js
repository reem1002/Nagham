import mongoose from 'mongoose';

// One document per listen. Powers "Recently played" and listening stats.
const playEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true },
    playedAt: { type: Date, default: Date.now, index: true },
    secondsListened: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
  },
  { versionKey: false }
);

playEventSchema.index({ user: 1, playedAt: -1 });

export default mongoose.model('PlayEvent', playEventSchema);
