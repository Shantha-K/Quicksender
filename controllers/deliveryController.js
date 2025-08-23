// Delivery partner accepts a request (adds to interested list)
exports.acceptRequest = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.kycStatus !== 'verified') {
      return res.status(403).json({ success: false, message: 'KYC not verified' });
    }
    const { requestId } = req.body;
    const request = await DeliveryRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    // Always add partner to acceptedPartners if not already present
    if (!request.acceptedPartners.includes(user._id)) {
      request.acceptedPartners.push(user._id);
    }
    // If still pending, assign partner and update status
    if (request.status === 'pending') {
      request.status = 'assigned';
      request.assignedPartnerId = user._id;
      request.lastUpdate = new Date();
    }
    await request.save();
    res.json({ success: true, message: 'Request accepted', data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get all partners who accepted a request
exports.getAcceptedPartners = async (req, res) => {
  try {
    // No authentication required, public API
    // Fetch delivery partner details based on userId (delivery partner) query param
    const { userId } = req.query;
    const request = await DeliveryRequest.findById(req.params.requestId)
      .populate('acceptedPartners', 'name email mobile address rating reviews city state profileImage');
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    let partners = request.acceptedPartners;
    if (userId) {
      partners = partners.filter(partner => partner._id.toString() === userId);
    }
    res.json({ success: true, data: partners });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Sender selects a delivery partner and generates OTP
exports.selectPartner = async (req, res) => {
  try {
    const { requestId, partnerId } = req.body;
    const request = await DeliveryRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    request.assignedPartnerId = partnerId;
    request.status = 'assigned';
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    request.deliveryOtp = otp;
    await request.save();
    res.json({ success: true, message: 'Partner assigned, OTP generated', data: request, otp });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


// Partner uploads pickup images
exports.pickupParcel = async (req, res) => {
  try {
    const request = await DeliveryRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    const imagePaths = req.files.map(f => f.path);
    request.pickupImages = imagePaths;
    request.status = 'picked';
    request.tracking.push({ status: 'picked', timestamp: new Date() });
    await request.save();
    res.json({ success: true, message: 'Pickup images uploaded', data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Partner updates location (optional, for live tracking)
exports.updateLocation = async (req, res) => {
  try {
    const request = await DeliveryRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    const { location } = req.body;
    request.tracking.push({ status: 'on-the-way', timestamp: new Date(), location });
    await request.save();
    res.json({ success: true, message: 'Location updated', data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Receiver gives OTP to partner for delivery completion
exports.verifyDeliveryOtp = async (req, res) => {
  try {
    const request = await DeliveryRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    const { otp } = req.body;
    if (request.deliveryOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    request.status = 'delivered';
    request.tracking.push({ status: 'delivered', timestamp: new Date() });
    await request.save();
    res.json({ success: true, message: 'Parcel delivered', data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Sender rates and reviews the partner
exports.ratePartner = async (req, res) => {
  try {
    const request = await DeliveryRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    const { rating, review } = req.body;
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5' });
    }
    request.rating = rating;
    request.review = review;
    await request.save();
    res.json({ success: true, message: 'Rating submitted', data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
// Get all delivery requests for the logged-in user by status
exports.getRequestsByStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status query parameter is required' });
    }
    // Find requests created by the user with the given status
    const requests = await DeliveryRequest.find({ userId, status }).sort({ lastUpdate: -1 });
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


const DeliveryRequest = require('../models/deliveryRequestModel');
const User = require('../models/userModel');

// Create delivery request (user) with wallet balance check
const authController = require('./authController');
exports.createRequest = async (req, res) => {
  try {
    const {
      sender,
      receiver,
      parcel,
      payment,
      estimatedAmount
    } = req.body;
    const userId = req.user.userId;
    // Fetch wallet balance from User model
    const user = await User.findById(userId);
    const balance = user && typeof user.walletBalance === 'number' ? user.walletBalance : 0;
    // Ensure estimatedAmount is a number
    const estAmount = estimatedAmount !== undefined ? Number(estimatedAmount) : (parcel && parcel.estimatedAmount ? Number(parcel.estimatedAmount) : 0);
    if (isNaN(estAmount) || estAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid estimated amount.' });
    }
    if (estAmount > balance) {
      const requiredAmount = estAmount - balance;
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Please add ₹${requiredAmount} to proceed with parcel booking.`,
        requiredAmount,
        balance
      });
    }
    // Proceed with booking if balance is sufficient
    const request = await DeliveryRequest.create({
      userId,
      sender, // { name, email, phone, address }
      receiver, // { name, email, phone, address }
      parcel, // { productName, weight, length, width, height }
      payment, // { paymentType, deliveryFee }
      status: 'pending',
      assignedPartnerId: null,
      broadcastedTo: [],
      lastUpdate: new Date()
    });
    // Deduct estimated amount from user's wallet
    user.walletBalance = balance - estAmount;
    await user.save();
    res.json({ success: true, message: 'Delivery request created', data: request, walletBalance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get delivery request by _id
exports.getDeliveryRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await DeliveryRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Delivery request not found' });
    }
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Edit delivery request by _id
exports.editDeliveryRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const update = req.body;
    const request = await DeliveryRequest.findByIdAndUpdate(requestId, update, { new: true });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Delivery request not found' });
    }
    res.json({ success: true, message: 'Delivery request updated', data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get available requests for delivery partners (KYC verified only)
exports.getAvailableRequests = async (req, res) => {
  try {
    // Return all pending delivery requests, regardless of creator's KYC status
    const requests = await DeliveryRequest.find({ status: 'pending' });
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Accept delivery request (first-come-first-serve)

// Reject delivery request (by delivery partner)
exports.acceptReject = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.kycStatus !== 'verified') {
      return res.status(403).json({ success: false, message: 'KYC not verified' });
    }
    const { requestId } = req.body;
    // Atomically reject if still pending or assigned to this partner
    const request = await DeliveryRequest.findOneAndUpdate(
      { _id: requestId, $or: [ { status: 'pending' }, { assignedPartnerId: user._id } ] },
      { status: 'rejected', assignedPartnerId: null, lastUpdate: new Date() },
      { new: true }
    );
    if (!request) {
      return res.status(400).json({ success: false, message: 'Request already processed or not found' });
    }
    res.json({ success: true, message: 'Request rejected', data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get status of a delivery request
exports.getRequestStatus = async (req, res) => {
  try {
    const request = await DeliveryRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Update status (picked, delivered, cancelled)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const request = await DeliveryRequest.findByIdAndUpdate(
      req.params.id,
      { status, lastUpdate: new Date() },
      { new: true }
    );
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    res.json({ success: true, message: 'Status updated', data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
