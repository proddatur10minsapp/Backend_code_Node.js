const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/send-otp', async (req, res) => {
  const { phoneNumber, username } = req.body;

  if (!phoneNumber || !username) {
    return res.status(400).json({ success: false, message: 'Phone number and username are required' });
  }

  try {
    let user = await User.findOne({ phoneNumber, username });

    if (user) {
      const loginToken = jwt.sign(
        { userId: user._id, phoneNumber, username: user.username },
        JWT_SECRET,
        { expiresIn: '20m' }
      );

      return res.status(200).json({
        success: true,
        message: 'User already logged in',
        loginToken,
      });
    }

    const url = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${phoneNumber}/AUTOGEN`;
    const response = await axios.get(url);

    if (response.data.Status === 'Success') {
      const sessionId = response.data.Details;
      const token = jwt.sign({ sessionId, phoneNumber, username }, JWT_SECRET, { expiresIn: '10m' });

      return res.status(200).json({ success: true, token });
    }

    return res.status(400).json({ success: false, message: 'Failed to send OTP' });
  } catch (error) {
    console.error('Send OTP error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
