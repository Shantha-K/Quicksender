const crypto = require('crypto');

exports.generateOTP = () => (Math.floor(1000 + Math.random() * 9000)).toString();

exports.sendOTP = async (mobile, otp) => {
  // Integrate with SMS provider here
  console.log(`Send OTP ${otp} to ${mobile}`);
};
