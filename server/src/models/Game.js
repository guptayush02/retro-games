import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    genre: String,
    thumbnail: String,
    gameType: {
      type: String,
      enum: ['single-player', 'multiplayer'],
      default: 'single-player',
    },
    maxPlayers: {
      type: Number,
      default: 1,
    },
    sourceType: {
      type: String,
      enum: ['native', 'embed', 'external-link'],
      default: 'native',
    },
    launchUrl: {
      type: String,
      trim: true,
      default: '',
    },
    provider: {
      type: String,
      trim: true,
      default: 'internal',
    },
    licenseStatus: {
      type: String,
      enum: ['unknown', 'licensed', 'restricted'],
      default: 'unknown',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

gameSchema.index({ title: 1, provider: 1 }, { unique: true });

export default mongoose.model('Game', gameSchema);
