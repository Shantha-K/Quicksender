// Get all registered users (users with a name)
exports.getAllRegisteredUsers = async (req, res) => {
  try {
    const users = await User.find({ name: { $exists: true, $ne: '' } });
    const sanitized = users.map(u => {
      const { otp, otpExpires, ...userObj } = u.toObject();
      return userObj;
    });
    res.json({ success: true, data: sanitized });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
// Get registered user by _id
exports.getRegistered = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Exclude sensitive fields if needed
    const { otp, otpExpires, ...userObj } = user.toObject();
    res.json({ success: true, data: userObj });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
// KYC Reject
exports.kycReject = async (req, res) => {
  try {
    const userId = req.body.userId || req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.kycStatus = 'rejected';
    await user.save();
    // Exclude notifications from response
    const { notifications, ...userWithoutNotifications } = user.toObject();
    res.json({ success: true, message: 'KYC rejected', data: userWithoutNotifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
// KYC Approved
exports.kycApproved = async (req, res) => {
  try {
    const userId = req.body.userId || req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Check if KYC details are present
    if (!user.kycType || !user.kycFrontImage || !user.kycBackImage) {
      return res.status(400).json({ success: false, message: 'KYC details incomplete. Please submit kycType, kycFrontImage, and kycBackImage first.' });
    }
    user.kycStatus = 'verified';
    await user.save();
    // Exclude notifications from response
    const { notifications, ...userWithoutNotifications } = user.toObject();
    res.json({ success: true, message: 'KYC approved', data: userWithoutNotifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
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
  // Check if user exists
  const existingUser = await User.findOne({ mobile });
  const user = await User.findOneAndUpdate(
    { mobile },
    { mobile, otp, otpExpires },
    { upsert: true, new: true }
  );
  await otpService.sendOTP(mobile, otp);
  res.json({
    success: true,
    message: 'OTP sent',
    data: user
  });
};

exports.verifyOTP = async (req, res) => {
  const { mobile, otp } = req.body;
  // Check if user is fully registered (after register API)
  let existed = false;
  const preUser = await User.findOne({ mobile });
  if (preUser && preUser.name && preUser.email && preUser.address) {
    existed = true;
  }
  const user = preUser;
  if (!user || user.otp !== otp || user.otpExpires < new Date()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }
  // OTP verified, clear OTP
  user.otp = undefined;
  user.otpExpires = undefined;
  let token = user.jwtToken;
  let validToken = false;
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      validToken = true;
    } catch (err) {
      validToken = false;
    }
  }
  if (!validToken) {
    token = jwt.sign({ userId: user._id, mobile: user.mobile }, JWT_SECRET, { expiresIn: '7d' });
    user.jwtToken = token;
  }
  await user.save();
  res.json({ success: true, message: 'Login successful', token, data: user, existed });
};

exports.register = async (req, res) => {
  try {
    const { name, email, mobile, dob, address } = req.body;
    if (!name || !email || !mobile || !dob || !address) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    // Check if user with mobile number exists
    let existed = false;
    const prevUser = await User.findOne({ mobile });
    if (prevUser) {
      existed = true;
    }
    // Use userId from JWT to update the existing user
    const userId = req.user.userId;
    let update = { name, email, mobile, dob, address };
    if (req.file) {
      update.profileImage = req.file.path;
    }
    // Update by userId
    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    // Also update by mobile number (if different)
    if (user && user.mobile !== mobile) {
      await User.findOneAndUpdate({ mobile }, update);
    }
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'Account created successfully', data: user, existed });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Edit Profile
exports.editProfile = async (req, res) => {
  try {
  const userId = req.params.id || req.user.userId;
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

// Logout
// const User = require('../models/userModel');
exports.logout = async (req, res) => {
  try {
    const userId = req.params.id || req.body.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Check if the logged-in user matches the userId being logged out
    if (req.user && req.user.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized logout attempt' });
    }
    // For stateless JWT, just respond with success
    return res.json({ success: true, message: 'Logout successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// KYC Submit
exports.submitKYC = async (req, res) => {
  try {
    const userId = req.body.userId || (req.user && req.user.userId);
    const { kycType } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!req.files || !req.files.kycFront || !req.files.kycBack) {
      return res.status(400).json({ success: false, message: 'Both kycFront and kycBack images are required.' });
    }
    let update = {
      kycType,
      kycStatus: 'pending',
      kycFrontImage: req.files.kycFront[0].path,
      kycBackImage: req.files.kycBack[0].path
    };
    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
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


const walletBalances = {}; // In-memory wallet balances for demo
const walletOtps = {}; // In-memory OTPs for demo
const walletTransactions = {}; // In-memory transaction history for demo

exports.walletBalances = walletBalances;

// Get wallet balance and transactions
exports.getWallet = async (req, res) => {
  const userId = req.params.id;
  if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });
  const balance = walletBalances[userId] || 0;
  const transactions = walletTransactions[userId] || [];
  res.json({ success: true, balance, userId, transactions });
};

// Request OTP for wallet top-up
exports.walletRequestOtp = async (req, res) => {
  const userId = req.body.userId;
  if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  walletOtps[userId] = otp;
  // In real app, send OTP to user's mobile/email
  res.json({ success: true, message: 'OTP sent', otp }); // For demo, return OTP
};

// Verify OTP for wallet top-up
exports.walletVerifyOtp = async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) return res.status(400).json({ success: false, message: 'User ID and OTP required' });
  if (walletOtps[userId] !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
  res.json({ success: true, message: 'OTP verified' });
};

// Top-up wallet (after OTP verified)
exports.walletTopUp = async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount) return res.status(400).json({ success: false, message: 'User ID and amount required' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.walletBalance = (user.walletBalance || 0) + Number(amount);
  await user.save();
  // Add transaction (optional: you can keep this in DB or in-memory for demo)
  if (!walletTransactions[userId]) walletTransactions[userId] = [];
  walletTransactions[userId].push({
    type: 'topup',
    amount: Number(amount),
    date: new Date().toISOString(),
    balance: user.walletBalance
  });
  res.json({ success: true, message: 'Top-up successful', balance: user.walletBalance });
};

// Withdraw from wallet
exports.walletWithdraw = async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount) return res.status(400).json({ success: false, message: 'User ID and amount required' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if ((user.walletBalance || 0) < Number(amount)) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }
  user.walletBalance -= Number(amount);
  await user.save();
  // Add transaction (optional: you can keep this in DB or in-memory for demo)
  if (!walletTransactions[userId]) walletTransactions[userId] = [];
  walletTransactions[userId].push({
    type: 'withdraw',
    amount: Number(amount),
    date: new Date().toISOString(),
    balance: user.walletBalance
  });
  res.json({ success: true, message: 'Withdraw successful', balance: user.walletBalance });
};