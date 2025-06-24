const express = require('express');
const router = express.Router();
const ExpoToken = require('../models/ExpoToken'); // Import the ExpoToken model

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

module.exports = router;
