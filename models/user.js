import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    // Password is only required for local auth users, not Google OAuth users
    required: function() {
      return !this.googleId;
    }
  },
  refreshTokens: {
    type: [String],
    default: [],
  },
  googleId: { 
    type: String, 
    unique: true, 
    sparse: true // Allows multiple null values
  },
  profilePicture: {
    type: String,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  }
}, {
  timestamps: true
});

// Instance method to compare passwords (for local auth)
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public user data
userSchema.methods.toPublic = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    profilePicture: this.profilePicture,
    emailVerified: this.emailVerified,
    authProvider: this.authProvider,
    createdAt: this.createdAt
  };
};

// Static method to find or create Google user
userSchema.statics.findOrCreateGoogleUser = async function(profile) {
  try {
    // Check if user already exists with Google ID
    let user = await this.findOne({ googleId: profile.id });
    
    if (user) {
      return user;
    }
    
    // Check if user exists with same email
    user = await this.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.profilePicture = user.profilePicture || profile.photos[0]?.value;
      user.emailVerified = true;
      user.authProvider = user.authProvider === 'local' ? 'local' : 'google';
      await user.save();
      return user;
    }
    
    // Create new user
    user = await this.create({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      profilePicture: profile.photos[0]?.value,
      emailVerified: true,
      authProvider: 'google'
    });
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Prevent model recompilation in development
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;