import mongoose from 'mongoose';

const leaderboardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
    },
    score: Number,
    rank: Number,
    period: {
      type: String,
      enum: ['daily', 'weekly', 'all-time'],
      default: 'all-time',
    },
  },
  {
    timestamps: true,
  }
);

leaderboardSchema.index({ rank: 1, period: 1 });

export default mongoose.model('Leaderboard', leaderboardSchema);
