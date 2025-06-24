const mongoose = require('mongoose');

const ExpoTokenSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  expoPushToken: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('ExpoToken', ExpoTokenSchema);
