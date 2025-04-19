const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  username: { type: String },
  createdAt: { type: Date, default: Date.now, expires: '180d' }
});

module.exports = mongoose.model('User', UserSchema);
