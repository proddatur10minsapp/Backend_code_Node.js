const express = require('express');
const router = express.Router();
const ExpoToken = require('../models/ExpoToken');
const User = require('../models/User');

// POST /admin/send-notification - Send to multiple users
router.post('/admin/send-notification', async (req, res) => {
  try {
    const { title, body, targetUsers, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    // 1. Get push tokens based on target
    let tokens = [];

    if (targetUsers === 'all') {
      // Get all users with push tokens
      const expoTokens = await ExpoToken.find({ expoPushToken: { $exists: true } });
      tokens = expoTokens.map(doc => doc.expoPushToken);
    } else if (targetUsers && targetUsers.startsWith('phone:')) {
      // Send to specific phone number
      const phone = targetUsers.split(':')[1];
      const expoToken = await ExpoToken.findOne({ phoneNumber: phone });
      if (expoToken && expoToken.expoPushToken) {
        tokens.push(expoToken.expoPushToken);
      }
    } else if (Array.isArray(targetUsers)) {
      // targetUsers is an array of phone numbers
      const expoTokens = await ExpoToken.find({ 
        phoneNumber: { $in: targetUsers },
        expoPushToken: { $exists: true }
      });
      tokens = expoTokens.map(doc => doc.expoPushToken);
    }

    if (tokens.length === 0) {
      return res.status(404).json({ error: 'No push tokens found for target users' });
    }

    // 2. Prepare notification messages
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      priority: 'high',
      channelId: 'default',
      data: data || {}
    }));

    // 3. Send to Expo Push API
    const fetch = require('node-fetch');
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages)
    });

    const result = await response.json();

    // Clean up invalid tokens
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const receipt = result.data[i];
        if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
          await ExpoToken.deleteOne({ expoPushToken: tokens[i] });
          console.log('🗑️ Removed unregistered token:', tokens[i]);
        }
      }
    }

    res.json({
      success: true,
      sent: messages.length,
      result
    });

  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/send-notification-to-user - Send to single user by phone number
router.post('/admin/send-notification-to-user', async (req, res) => {
  try {
    const { phoneNumber, title, body, data } = req.body;

    if (!phoneNumber || !title || !body) {
      return res.status(400).json({ error: 'phoneNumber, title, and body are required' });
    }

    // Get user's push token
    const expoToken = await ExpoToken.findOne({ phoneNumber });

    if (!expoToken || !expoToken.expoPushToken) {
      return res.status(404).json({ error: 'User token not found' });
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
        data: data || {}
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
    console.error('❌ Error sending notification to user:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
