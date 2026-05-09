import mongoose from 'mongoose';

const recentlyPlayedSchema = new mongoose.Schema(
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
    playedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

recentlyPlayedSchema.index({ userId: 1, playedAt: -1 });

export default mongoose.model('RecentlyPlayed', recentlyPlayedSchema);
