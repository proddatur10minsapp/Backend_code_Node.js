require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
app.use(bodyParser.json());

const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// User Schema
const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    username: { type: String },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Send OTP or Skip OTP if Valid Login Token Provided
app.post('/send-otp', async (req, res) => {
    const { phoneNumber, username, loginToken } = req.body;

    if (!phoneNumber || !username) {
        return res.status(400).json({ success: false, message: 'Phone number and username are required' });
    }

    try {
        let user = await User.findOne({ phoneNumber, username });

        // Case: Valid token is provided & matches user -> skip OTP
        if (user && loginToken) {
            try {
                const decoded = jwt.verify(loginToken, JWT_SECRET);
                if (decoded.phoneNumber === phoneNumber && decoded.username === username) {
                    return res.status(200).json({
                        success: true,
                        message: 'User already logged in',
                        loginToken
                    });
                }
            } catch (err) {
                // token invalid or expired, continue to OTP flow
                console.log('Login token invalid/expired, proceeding with OTP');
            }
        }

        // Case: New user or token missing/expired — send OTP
        const url = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${phoneNumber}/AUTOGEN`;
        const response = await axios.get(url);

        if (response.data.Status === 'Success') {
            const sessionId = response.data.Details;
            const token = jwt.sign({ sessionId, phoneNumber, username }, JWT_SECRET, { expiresIn: '10m' });

            return res.status(200).json({ success: true, token });
        } else {
            return res.status(400).json({ success: false, message: 'Failed to send OTP' });
        }
    } catch (error) {
        console.error('Error in sending OTP:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Verify OTP and Log In User
app.post('/verify-otp', async (req, res) => {
    const { token, userOtp } = req.body;

    if (!token || !userOtp) {
        return res.status(400).json({ success: false, message: 'Token and OTP are required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { sessionId, phoneNumber, username } = decoded;

        const url = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${userOtp}`;
        const response = await axios.get(url);

        if (response.data.Status === 'Success' && response.data.Details === 'OTP Matched') {
            let user = await User.findOne({ phoneNumber });

            if (!user) {
                user = new User({ phoneNumber, username });
                await user.save();
            }

            const loginToken = jwt.sign(
                { userId: user._id, phoneNumber, username: user.username },
                JWT_SECRET,
                { expiresIn: '180d' }
            );

            return res.status(200).json({
                success: true,
                message: 'OTP verified and user logged in',
                loginToken
            });
        } else {
            return res.status(400).json({ success: false, message: 'OTP verification failed', data: response.data });
        }
    } catch (error) {
        console.error('Error in OTP verification:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(3000, () => {
    console.log('OTP API with JWT is running on http://localhost:3000');
});
