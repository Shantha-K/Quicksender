const User = require('../models/userModel');
const otpService = require('../services/otpService');
// const { isValidMobile } = require('../utils/validator');

exports.requestOTP = async (req, res) => {
  const { mobile } = req.body;
//   if (!isValidMobile(mobile)) {
//     return res.status(400).json({ message: 'Invalid mobile Number' });
//   }
  const otp = otpService.generateOTP();
  const otpExpires = new Date(Date.now() + 60 * 1000); // 1 min expiry
   const user = await User.findOneAndUpdate(
    { mobile },
    { mobile, otp, otpExpires },
    { upsert: true, new: true }
  );
  await otpService.sendOTP(mobile, otp);
  res.json({ success: true, message: 'OTP sent', data: user });
};

exports.verifyOTP = async (req, res) => {
  const { mobile, otp } = req.body;
  const user = await User.findOne({ mobile });
  if (!user || user.otp !== otp || user.otpExpires < new Date()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }
  // OTP verified, clear OTP
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();
  // Generate token or session here
  res.json({ success: true, message: 'Login successful' });
};
