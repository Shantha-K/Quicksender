const mongoose = require('mongoose');


const deliveryRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: {
    name: String,
    email: String,
    phone: String,
    address: String,
    state: String,
    city: String
  },
  receiver: {
    name: String,
    email: String,
    phone: String,
    address: String,
    state: String,
    city: String
  },
  parcel: {
    productName: String,
    weight: String,
    length: String,
    width: String,
    height: String,
    estimatedAmount: String,
  },
  payment: {
    paymentType: String,
    deliveryFee: String
  },
  status: { type: String, enum: ['pending', 'assigned', 'picked', 'on-the-way', 'started-delivery', 'delivered', 'cancelled'], default: 'pending' },
  assignedPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  acceptedPartners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  broadcastedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pickupImages: [String],
  tracking: [{ status: String, timestamp: Date, location: String }],
  deliveryOtp: { type: String },
  rating: { type: Number },
  review: { type: String },
  lastUpdate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DeliveryRequest', deliveryRequestSchema);
