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
    sparse: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  emailVerifiedAt: {
    type: Date,
    default: null
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublic = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    profilePicture: this.profilePicture,
    emailVerified: this.emailVerified,
    authProvider: this.authProvider,
    createdAt: this.createdAt,
    emailVerifiedAt: this.emailVerifiedAt
  };
};

userSchema.methods.markEmailAsVerified = async function() {
  this.emailVerified = true;
  this.emailVerifiedAt = new Date();
  this.emailVerificationToken = null;
  this.emailVerificationExpires = null;
  return this.save();
};

userSchema.methods.isEmailVerificationExpired = function() {
  if (!this.emailVerificationExpires) return true;
  return new Date() > this.emailVerificationExpires;
};

userSchema.statics.findOrCreateGoogleUser = async function(profile) {
  try {
    let user = await this.findOne({ googleId: profile.id });
    
    if (user) {
      user.lastLoginAt = new Date();
      await user.save();
      return user;
    }
    
    user = await this.findOne({ email: profile.emails[0].value.toLowerCase() });
    
    if (user) {
      user.googleId = profile.id;
      user.profilePicture = user.profilePicture || profile.photos[0]?.value;
      user.emailVerified = true; // Google emails are auto-verified
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      user.lastLoginAt = new Date();
      
      if (user.authProvider !== 'local') {
        user.authProvider = 'google';
      }
      await user.save();
      return user;
    }
    
    user = await this.create({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value.toLowerCase(),
      profilePicture: profile.photos[0]?.value,
      emailVerified: true, // Google emails are auto-verified
      emailVerifiedAt: new Date(),
      authProvider: 'google',
      lastLoginAt: new Date()
    });
    
    return user;
  } catch (error) {
    throw error;
  }
};

userSchema.statics.createUnverifiedUser = async function(userData) {
  const { name, email, password } = userData;
  
  const existingUser = await this.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    if (existingUser.emailVerified) {
      throw new Error('User already exists with this email');
    } else {
      existingUser.name = name;
      if (password) {
        const salt = await bcrypt.genSalt(12);
        existingUser.password = await bcrypt.hash(password, salt);
      }
      return existingUser.save();
    }
  }
  
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  const user = await this.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    emailVerified: false,
    authProvider: 'local'
  });
  
  return user;
};

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.index({ 
  emailVerificationExpires: 1 
}, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { 
    emailVerified: false,
    emailVerificationExpires: { $exists: true }
  }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;