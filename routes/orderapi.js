const express = require('express');
const router = express.Router();
const ExpoToken = require('../models/ExpoToken'); // Import the ExpoToken model
const Order = require('../models/Order');

// Endpoint to save Expo push token
router.post('/save-expo-token', async (req, res) => {
  const { phoneNumber, expoPushToken } = req.body;
  if (!phoneNumber || !expoPushToken) {
    return res.status(400).json({ message: 'phoneNumber and expoPushToken are required.' });
  }

  try {
    // Upsert: update if exists, otherwise create
    await ExpoToken.findOneAndUpdate(
      { phoneNumber },
      { expoPushToken },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ message: 'Expo token saved successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Error saving Expo token', error: err.message });
  }
});

// POST /api/send-order-notification - Send notification based on order status
router.post('/send-order-notification', async (req, res) => {
  try {
    const { orderId, status, phoneNumber } = req.body;

    if (!orderId || !status || !phoneNumber) {
      return res.status(400).json({ error: 'orderId, status, and phoneNumber are required' });
    }

    // Get user's push token
    const expoToken = await ExpoToken.findOne({ phoneNumber });

    if (!expoToken || !expoToken.expoPushToken) {
      return res.status(404).json({ error: 'No push token found for this user' });
    }

    // Create notification message based on status
    let title, body;
    let notificationData = { orderId: orderId, screen: 'TrackOrderScreen' };

    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'order_confirmed':
        title = '✅ Order Confirmed!';
        body = `Your order #${orderId} has been confirmed and is being prepared`;
        break;
      case 'out_for_delivery':
      case 'out for delivery':
        title = '🚚 Out for Delivery!';
        body = `Your order #${orderId} is on the way to you`;
        break;
      case 'delivered':
        title = '🎉 Order Delivered!';
        body = `Your order #${orderId} has been successfully delivered`;
        break;
      case 'cancelled':
        title = '❌ Order Cancelled';
        body = `Your order #${orderId} has been cancelled`;
        break;
      case 'pending':
        title = '⏳ Order Pending';
        body = `Your order #${orderId} is being processed`;
        break;
      default:
        title = '📦 Order Update';
        body = `Your order #${orderId} status: ${status}`;
    }

    // Send notification
    const fetch = require('node-fetch');
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoToken.expoPushToken,
        sound: 'default',
        title,
        body,
        priority: 'high',
        channelId: 'default',
        data: notificationData
      })
    });

    const result = await response.json();

    // Clean up invalid token
    const receipt = result?.data?.[0];
    if (receipt?.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
      await ExpoToken.deleteOne({ expoPushToken: expoToken.expoPushToken });
      console.log('🗑️ Removed unregistered token:', expoToken.expoPushToken);
    }

    res.json({ success: true, result });

  } catch (error) {
    console.error('❌ Error sending order notification:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
