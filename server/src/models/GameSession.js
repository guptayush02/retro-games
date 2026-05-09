import mongoose from 'mongoose';

const gameSessionSchema = new mongoose.Schema(
  {
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    roomName: String,
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'playing', 'finished'],
      default: 'waiting',
    },
    maxPlayers: Number,
    currentPlayers: {
      type: Number,
      default: 1,
    },
    endedAt: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('GameSession', gameSessionSchema);
