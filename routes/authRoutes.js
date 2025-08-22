
// Get registered user by _id

const deliveryController = require('../controllers/deliveryController');
const rateController = require('../controllers/rateController');


// KYC Reject
// KYC Approved
const express = require('express');
const router = express.Router();


const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');


router.post('/request-otp', authController.requestOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/register', authMiddleware, upload.single('profileImage'), authController.register);
router.get('/registered-users', authController.getAllRegisteredUsers);
router.put('/editprofile/:id', authMiddleware, upload.single('profileImage'), authController.editProfile);
// Logout API (requires authentication)
router.post('/logout/:id', authMiddleware, authController.logout);

router.get('/getregistered/:id', authController.getRegistered);
// Get and edit delivery request by _id
router.get('/delivery/request/:id', authMiddleware, deliveryController.getDeliveryRequest);
router.put('/delivery/request/:id', authMiddleware, deliveryController.editDeliveryRequest);

// Edit profile (with optional profile image upload)
router.put('/editprofile/:id', authMiddleware, upload.single('profileImage'), authController.editProfile);

// KYC submit (with front and back image upload)
router.post('/kyc', upload.fields([{ name: 'kycFront', maxCount: 1 }, { name: 'kycBack', maxCount: 1 }]), authController.submitKYC);
router.get('/kyc-status', authMiddleware, authController.getKYCStatus);
router.post('/kyc-approved', authController.kycApproved);
router.post('/kyc-reject', authController.kycReject);

// Delivery APIs
router.post('/delivery/request', authMiddleware, deliveryController.createRequest);
router.get('/delivery/available',  deliveryController.getAvailableRequests);
router.post('/delivery/accept', authMiddleware, deliveryController.acceptRequest);
router.post('/delivery/reject', authMiddleware, deliveryController.acceptReject);
router.get('/delivery/status/:id', authMiddleware, deliveryController.getRequestStatus);
router.patch('/delivery/status/:id', authMiddleware, deliveryController.updateRequestStatus);



// Notifications
router.get('/notifications', authMiddleware, authController.getNotifications);
router.post('/notifications', authMiddleware, authController.addNotification);

// Rate Calculator
router.post('/calculate-rate', rateController.calculateRate);

// Wallet APIs (dummy)
router.get('/wallet/:id', authMiddleware, authController.getWallet); // Get wallet balance
router.post('/wallet/request-otp', authMiddleware, authController.walletRequestOtp); // Request OTP for top-up
router.post('/wallet/verify-otp', authMiddleware, authController.walletVerifyOtp); // Verify OTP
router.post('/wallet/topup', authMiddleware, authController.walletTopUp); // Top-up wallet
router.post('/wallet/withdraw', authMiddleware, authController.walletWithdraw); // Withdraw from wallet

// Get all delivery requests for the logged-in user by status
router.get('/delivery/requests', authMiddleware, deliveryController.getRequestsByStatus);
// Get all partners who accepted a request
router.get('/delivery/accepted-partners/:requestId', deliveryController.getAcceptedPartners);

// Sender selects a delivery partner
router.post('/delivery/select-partner', authMiddleware, deliveryController.selectPartner);

// Partner uploads pickup images
router.post('/delivery/pickup/:id', authMiddleware, upload.array('images', 3), deliveryController.pickupParcel);

// Partner updates location (optional, for live tracking)
router.post('/delivery/location/:id', authMiddleware, deliveryController.updateLocation);

// Receiver gives OTP to partner for delivery completion
router.post('/delivery/verify-otp/:id', authMiddleware, deliveryController.verifyDeliveryOtp);

// Get delivery OTP for a request (for sender/receiver)
// router.get('/delivery/otp/:id', authMiddleware, deliveryController.getDeliveryOtp);


// Sender rates and reviews the partner
router.post('/delivery/rate/:id', authMiddleware, deliveryController.ratePartner);


module.exports = router;
