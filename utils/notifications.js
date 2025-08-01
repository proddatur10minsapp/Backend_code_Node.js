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

async function sendExpoPush(token, title, body, data = {}) {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: token,
        title,
        body,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
        data, // 👈 extra data
      }),
    });

    const result = await response.json();
    console.log('📬 Expo push response:', result);

    const receipt = result?.data?.[0];
    if (receipt?.status === 'error') {
      console.warn('⚠️ Expo push error:', receipt.message || receipt.details?.error);

      if (receipt.details?.error === 'DeviceNotRegistered') {
        await ExpoToken.deleteOne({ expoPushToken: token });
        console.log('🗑️ Removed unregistered token:', token);
      }
    }
  } catch (err) {
    console.error('❌ Failed to send Expo push:', err.message);
  }
}

// Call this after updating the order status in your DB or after fetching from Java API
async function notifyOrderStatusChange(orderId, newStatus, phoneNumber) {
  try {
    const expoTokenDoc = await ExpoToken.findOne({ phoneNumber });

    if (!expoTokenDoc?.expoPushToken) {
      console.warn(`⚠️ No Expo token found for phone number: ${phoneNumber}`);
      return;
    }

    await sendExpoPush(
      expoTokenDoc.expoPushToken,
      'Order Update',
      `Your order #${orderId} status is now ${newStatus}`,
      { orderId, status: newStatus } // 👈 sent as `data` to the app
    );
  } catch (err) {
    console.error('❌ Error sending order status notification:', err.message);
  }
}

module.exports = {
  sendExpoPush,
  notifyOrderStatusChange,
  fetchCurrentOrderStatus,
};
