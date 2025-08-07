const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mobile: { type: String, required: true, unique: true },
  otp: { type: String },
  otpExpires: { type: Date }
});

module.exports = mongoose.model('User', userSchema);
