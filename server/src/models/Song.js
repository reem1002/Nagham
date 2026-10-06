import mongoose from 'mongoose';

const songSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true, index: true },
    album: { type: mongoose.Schema.Types.ObjectId, ref: 'Album', index: true },
    genre: { type: String, default: '' },
    year: { type: Number },
    trackNo: { type: Number },
    duration: { type: Number, default: 0 }, // seconds
    lyrics: { type: String, default: '' },
    cover: { type: String, default: '' }, // relative URL e.g. /media/covers/xxx.jpg
    file: {
      path: { type: String, required: true }, // file name inside uploads/audio
      storage: { type: String, default: 'local' }, // 'local' | 'cloudinary'
      url: { type: String }, // Cloudinary delivery URL
      publicId: { type: String },
      mime: { type: String, default: 'audio/mpeg' },
      size: { type: Number, default: 0 },
      hash: { type: String, index: true }, // sha1 – used to skip duplicates
      originalName: { type: String },
    },
    playCount: { type: Number, default: 0 },
    lastPlayedAt: { type: Date },
  },
  { timestamps: true }
);

songSchema.index({ title: 'text' });

songSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  obj.streamUrl = `/api/songs/${obj._id}/stream`;
  delete obj.__v;
  if (obj.file) {
    delete obj.file.path;
    delete obj.file.url;
    delete obj.file.publicId;
  }
  return obj;
};

export default mongoose.model('Song', songSchema);
