const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const User = require('../models/userModel');
const otpService = require('../services/otpService');


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
  // Generate JWT token
  const token = jwt.sign({ userId: user._id, mobile: user.mobile }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, message: 'Login successful', token, data: user });
};

exports.register = async (req, res) => {
  try {
    const { name, email, mobile, dob, address } = req.body;
    if (!name || !email || !mobile || !dob || !address) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    // Check if user already exists
    const existingUser = await User.findOne({ mobile });
    if (existingUser && existingUser.name) {
      return res.status(400).json({ success: false, message: 'Account already exists' });
    }
    let update = { name, email, dob, address };
    if (req.file) {
      update.profileImage = req.file.path;
    }
    // Update or create user
    const user = await User.findOneAndUpdate(
      { mobile },
      update,
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Account created successfully', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Edit Profile
exports.editProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email, dob, address } = req.body;
    let update = { name, email, dob, address };
    if (req.file) {
      update.profileImage = req.file.path;
    }
    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    // Exclude notifications from response
    const { notifications, ...userWithoutNotifications } = user.toObject();
    res.json({ success: true, message: 'Profile updated', data: userWithoutNotifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// KYC Submit
exports.submitKYC = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { kycType } = req.body;
    let update = { kycType, kycStatus: 'pending' };
    if (req.files && req.files.kycFront && req.files.kycBack) {
      update.kycFrontImage = req.files.kycFront[0].path;
      update.kycBackImage = req.files.kycBack[0].path;
    }
    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    // Exclude notifications from response
    const { notifications, ...userWithoutNotifications } = user.toObject();
    res.json({ success: true, message: 'KYC submitted', data: userWithoutNotifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// KYC Status
exports.getKYCStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    res.json({ success: true, kycStatus: user.kycStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    res.json({ success: true, notifications: user.notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.addNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, message } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { notifications: { title, message } } },
      { new: true }
    );
    res.json({ success: true, message: 'Notification added', data: user.notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};