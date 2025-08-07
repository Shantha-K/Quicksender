const express = require('express');
const router = express.Router();


const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');


router.post('/request-otp', authController.requestOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/register', authMiddleware, upload.single('profileImage'), authController.register);

// Edit profile (with optional profile image upload)
router.put('/editprofile', authMiddleware, upload.single('profileImage'), authController.editProfile);

// KYC submit (with front and back image upload)
router.post('/kyc', authMiddleware, upload.fields([{ name: 'kycFront', maxCount: 1 }, { name: 'kycBack', maxCount: 1 }]), authController.submitKYC);
router.get('/kyc-status', authMiddleware, authController.getKYCStatus);

// Notifications
router.get('/notifications', authMiddleware, authController.getNotifications);
router.post('/notifications', authMiddleware, authController.addNotification);

module.exports = router;
