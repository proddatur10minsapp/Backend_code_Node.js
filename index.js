require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const sendOtpRoute = require('./routes/sendOtp');
const verifyOtpRoute = require('./routes/verifyOtp');
const productsRoute = require('./routes/products');
const getproductRoutes = require('./routes/getproducts');
const categoryRoutes = require('./routes/categories');

const app = express();
app.use(bodyParser.json());

const connectWithRetry = () => {
  console.log('Attempting MongoDB connection...');
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      console.log('Retrying MongoDB connection in 2 minutes...');
      setTimeout(connectWithRetry, 2 * 60 * 1000); // Retry after 2 minutes
    });
};

// Initial MongoDB connection
connectWithRetry();

// Routes
app.use('/api', sendOtpRoute);
app.use('/api', verifyOtpRoute);
app.use('/api', productsRoute);
app.use('/users/products', getproductRoutes);
app.use('/users/products/category', categoryRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OTP API running at http://localhost:${PORT}`);
});
