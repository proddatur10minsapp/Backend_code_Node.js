require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const sendOtpRoute = require('./routes/sendOtp');
const verifyOtpRoute = require('./routes/verifyOtp');
const productsRoute = require('./routes/products');

const app = express();
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api', sendOtpRoute);
app.use('/api', verifyOtpRoute);
app.use('/api', productsRoute);

const PORT = 3000;
app.listen(3000, () => {
  console.log(`OTP API running at http://localhost:${PORT}`);
});
