const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  mobile: { type: String, required: true, unique: true },
  dob: { type: String }, // Store as string for simplicity (DD/MM/YYYY)
  address: { type: String },
  profileImage: { type: String },
  kycStatus: { type: String, enum: ['verify', 'pending', 'verified','rejected'], default: 'verify' },
  kycType: { type: String },
  kycFrontImage: { type: String },
  kycBackImage: { type: String },
  notifications: [{
    title: String,
    message: String,
    date: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }],
  otp: { type: String },
  otpExpires: { type: Date }
});

module.exports = mongoose.model('User', userSchema);
