import mongoose from 'mongoose';

const artistSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    // Normalised key used to merge "Fairuz", "fairuz ", "FAIRUZ" into one artist
    key: { type: String, required: true },
    // Other spellings that should land on this artist, e.g. "فيروز", "fairouz"
    aliases: [{ type: String }],
    bio: { type: String, default: '' },
    image: { type: String, default: '' },
  },
  { timestamps: true }
);

artistSchema.index({ owner: 1, key: 1 }, { unique: true });
artistSchema.index({ owner: 1, aliases: 1 });

export default mongoose.model('Artist', artistSchema);
