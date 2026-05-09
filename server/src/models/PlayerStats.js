import mongoose from 'mongoose';

const playerStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    wins: {
      type: Number,
      default: 0,
    },
    losses: {
      type: Number,
      default: 0,
    },
    draws: {
      type: Number,
      default: 0,
    },
    highestScore: {
      type: Number,
      default: 0,
    },
    totalPlays: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Create unique index for user + game combination
playerStatsSchema.index({ userId: 1, gameId: 1 }, { unique: true });

export default mongoose.model('PlayerStats', playerStatsSchema);
