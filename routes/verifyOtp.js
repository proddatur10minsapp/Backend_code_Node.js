const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/verify-otp', async (req, res) => {
  const { token, userOtp } = req.body;

  if (!token || !userOtp) {
    return res.status(400).json({ success: false, message: 'Token and OTP are required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { sessionId, mobileNumber, username } = decoded;

    const url = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${userOtp}`;
    const response = await axios.get(url);

    if (response.data.Status === 'Success' && response.data.Details === 'OTP Matched') {
      let user = await User.findOne({ mobileNumber });

      if (!user) {
        user = new User({ mobileNumber, username });
        await user.save();
      }

      const loginToken = jwt.sign(
        { userId: user._id, mobileNumber, username: user.username },
        JWT_SECRET
      );

      return res.status(200).json({
        success: true,
        message: 'OTP verified and user logged in',
        loginToken,
      });
    }

    return res.status(400).json({ success: false, message: 'OTP verification failed' });
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
