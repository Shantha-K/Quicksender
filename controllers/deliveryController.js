
const DeliveryRequest = require('../models/deliveryRequestModel');
const User = require('../models/userModel');

// Create delivery request (user)
exports.createRequest = async (req, res) => {
  try {
    const {
      sender,
      receiver,
      parcel,
      payment
    } = req.body;
    const userId = req.user.userId;
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
    res.json({ success: true, message: 'Delivery request created', data: request });
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
    const user = await User.findById(req.user.userId);
    if (!user || user.kycStatus !== 'verified') {
      return res.status(403).json({ success: false, message: 'KYC not verified' });
    }
    // Find up to 5 pending requests not already broadcasted to this partner
    const requests = await DeliveryRequest.find({
      status: 'pending',
      broadcastedTo: { $nin: [user._id] }
    }).limit(5);
    // Mark as broadcasted
    await Promise.all(requests.map(r => {
      r.broadcastedTo.push(user._id);
      return r.save();
    }));
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Accept delivery request (first-come-first-serve)
exports.acceptRequest = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.kycStatus !== 'verified') {
      return res.status(403).json({ success: false, message: 'KYC not verified' });
    }
    const { requestId } = req.body;
    // Atomically assign if still pending
    const request = await DeliveryRequest.findOneAndUpdate(
      { _id: requestId, status: 'pending' },
      { status: 'assigned', assignedPartnerId: user._id, lastUpdate: new Date() },
      { new: true }
    );
    if (!request) {
      return res.status(400).json({ success: false, message: 'Request already assigned or not found' });
    }
    res.json({ success: true, message: 'Request accepted', data: request });
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
