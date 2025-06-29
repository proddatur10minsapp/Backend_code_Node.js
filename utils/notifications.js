const fetch = require('node-fetch');
const ExpoToken = require('../models/ExpoToken');

const BASE_URL = 'https://apijava.curameet.com';

async function fetchCurrentOrderStatus(phoneNumber) {
  try {
    const response = await fetch(`${BASE_URL}/orders/${phoneNumber}/current`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching current order status:', error);
    return [];
  }
}

async function sendExpoPush(token, title, body) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: token,
      title,
      body,
      sound: 'default',
      priority: 'high',
    }),
  });
}

// Call this after updating the order status in your DB or after fetching from Java API
async function notifyOrderStatusChange(orderId, newStatus, phoneNumber) {
  // Fetch the user's Expo token
  const expoTokenDoc = await ExpoToken.findOne({ phoneNumber });
  if (expoTokenDoc && expoTokenDoc.expoPushToken) {
    await sendExpoPush(
      expoTokenDoc.expoPushToken,
      'Order Update',
      `Your order #${orderId} status is now ${newStatus}`
    );
  }
}

module.exports = {
  sendExpoPush,
  notifyOrderStatusChange,
  fetchCurrentOrderStatus,
};
