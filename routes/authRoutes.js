
// Get registered user by _id
const deliveryController = require('../controllers/deliveryController');

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
router.get('/getregistered/:id', authController.getRegistered);
// Get and edit delivery request by _id
router.get('/delivery/request/:id', authMiddleware, deliveryController.getDeliveryRequest);
router.put('/delivery/request/:id', authMiddleware, deliveryController.editDeliveryRequest);

// Edit profile (with optional profile image upload)
router.put('/editprofile', authMiddleware, upload.single('profileImage'), authController.editProfile);

// KYC submit (with front and back image upload)
router.post('/kyc', authMiddleware, upload.fields([{ name: 'kycFront', maxCount: 1 }, { name: 'kycBack', maxCount: 1 }]), authController.submitKYC);
router.get('/kyc-status', authMiddleware, authController.getKYCStatus);
router.post('/kyc-approved', authMiddleware, authController.kycApproved);
router.post('/kyc-reject', authMiddleware, authController.kycReject);

// Delivery APIs
router.post('/delivery/request', authMiddleware, deliveryController.createRequest);
router.get('/delivery/available', authMiddleware, deliveryController.getAvailableRequests);
router.post('/delivery/accept', authMiddleware, deliveryController.acceptRequest);
router.get('/delivery/status/:id', authMiddleware, deliveryController.getRequestStatus);
router.patch('/delivery/status/:id', authMiddleware, deliveryController.updateRequestStatus);



// Notifications
router.get('/notifications', authMiddleware, authController.getNotifications);
router.post('/notifications', authMiddleware, authController.addNotification);

module.exports = router;
