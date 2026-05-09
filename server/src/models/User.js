import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      sparse: true, // Allow null for anonymous users
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    passwordHash: String,
    avatar: String,
    xp: {
      type: Number,
      default: 0,
    },
    coins: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      enum: ['player', 'admin'],
      default: 'player',
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    anonymousSessionToken: String,
    anonymousSessionExpires: Date,
    visitCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding anonymous sessions
userSchema.index({ anonymousSessionToken: 1, anonymousSessionExpires: 1 });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ username: 1 });

export default mongoose.model('User', userSchema);
