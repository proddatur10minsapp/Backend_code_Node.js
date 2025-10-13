// models/Order.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ─────────────────────────────
   📦 Product Subdocument Schema
───────────────────────────── */
const ProductSchema = new Schema({
  _id: Schema.Types.ObjectId,
  productName: String,
  image: String,
  category: Schema.Types.ObjectId,
  categoryName: String,
  quantity: Number,
  isProductAvailabe: Boolean,
  price: Number,             // MRP
  discountedPrice: Number,   // Final price paid
  updatedAt: Date,
}, { _id: false });

/* ─────────────────────────────
   🏠 Delivery Address Subdocument
───────────────────────────── */
const DeliveryAddressSchema = new Schema({
  _id: String,
  type: String,
  areaOrStreet: String,
  landmark: String,
  pincode: Number,
  isDefault: Boolean,
  phoneNumber: String,
  alterNativePhoneNumber:String,
}, { _id: false });

/* ─────────────────────────────
   🛒 OrdersCartDTO Subdocument
───────────────────────────── */
const OrdersCartDTOSchema = new Schema({
  _id: String,
  phoneNumber: String,
  updatedAt: Date,
  productsList: [ProductSchema],
  totalItemsInCart: Number,
  currentTotalPrice: Number,
  discountedAmount: Number,
  totalPrice: Number,
}, { _id: false });

/* ─────────────────────────────
   🎁 Gift Product Subdocument (Single Gift)
───────────────────────────── */
const GiftProductSchema = new Schema({
  _id: String,
  name: String,
  image: String,
  gallery: [String],
  price: Number,
  discountPrice: Number,
  quantity: Number,
  description: String,
  stock: Number,
  startAmount: Number,
  endAmount: Number,
}, { _id: false });

/* ─────────────────────────────
   📄 Main Order Schema
───────────────────────────── */
const OrderSchema = new Schema({
  _id: String,
  OrdersCartDTO: OrdersCartDTOSchema,
  deliveryCharges: Number,
  totalPayable: Number,
  deliveryAddress: DeliveryAddressSchema,
  phoneNumber: String,
  giftProduct: { type: GiftProductSchema, default: null },  // single gift
  orderStatus: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'EXPIRED'],
    default: 'PENDING',
  },
  paymentMethod: {
    type: String,
    enum: ['CASH_ON_DELIVERY', 'ONLINE', 'UPI'],
    default: 'CASH_ON_DELIVERY',
  },
  createdAt: Date,
  updatedAt: Date,
});

/* ─────────────────────────────
   🧾 Virtual: HTML Receipt Summary
───────────────────────────── */
OrderSchema.virtual('cartSummary').get(function () {
  const cart = this.OrdersCartDTO;
  const products = cart?.productsList || [];

  const productTable = products.length
    ? `
      <div style="margin-bottom: 24px; overflow-x: auto;">
        <b>🛍️ Products</b><br/><br/>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 6px; width: 32px;">#</th>
              <th style="padding: 6px;">Product Name</th>
              <th style="padding: 6px; text-align: center; width: 40px;">Qty</th>
              <th style="padding: 6px; text-align: right; width: 80px;">MRP</th>
              <th style="padding: 6px; text-align: right; width: 100px;">Discounted</th>
            </tr>
          </thead>
          <tbody>
            ${products.map((p, i) => `
              <tr>
                <td style="padding: 6px;">${i + 1}</td>
                <td style="padding: 6px;">
                  <a href="${p.image}" target="_blank" style="color: #007bff; text-decoration: underline;">
                    ${p.productName}
                  </a>
                </td>
                <td style="padding: 6px; text-align: center;">${p.quantity}</td>
                <td style="padding: 6px; text-align: right;">₹${p.price.toFixed(2)}</td>
                <td style="padding: 6px; text-align: right;">₹${p.discountedPrice.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    : `<div style="color: grey; margin-bottom: 24px;">No products in cart.</div>`;

  const address = this.deliveryAddress;
  const addressBlock = address ? `
    <hr style="margin: 24px 0; border-top: 2px dashed #ddd;" />
    <div style="margin-bottom: 24px;">
      <b>📍 Delivery Address</b><br/><br/>
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>
          <tr><td><b>Type</b></td><td>${address.type || '-'}</td></tr>
          <tr><td><b>Street</b></td><td>${address.areaOrStreet || '-'}</td></tr>
          <tr><td><b>Landmark</b></td><td>${address.landmark || '-'}</td></tr>
          <tr><td><b>PIN Code</b></td><td>${address.pincode || '-'}</td></tr>
          <tr><td><b>Phone</b></td><td>${address.phoneNumber || '-'}</td></tr>
          <tr><td><b>Alt. Phone</b></td><td>${address.alterNativePhoneNumber || '-'}</td></tr>
        </tbody>
      </table>
    </div>
  ` : '';

  const summaryTable = `
    <hr style="margin: 24px 0; border-top: 2px dashed #ddd;" />
    <div>
      <b>🧾 Order Summary</b><br/><br/>
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>
          <tr><td><b>Total Items</b></td><td>${cart.totalItemsInCart}</td></tr>
          <tr><td><b>Final Price</b></td><td>₹${cart.totalPrice.toFixed(2)}</td></tr>
          <tr><td><b style="color: #ff6600;">Delivery Charges</b></td><td>₹${this.deliveryCharges.toFixed(2)}</td></tr>
          <tr><td><b style="color: #007bff;">Total Payable</b></td><td>₹${this.totalPayable.toFixed(2)}</td></tr>
          <tr><td><b>Phone Number</b></td><td>${this.phoneNumber}</td></tr>
          <tr><td><b>Order Status</b></td><td>${this.orderStatus}</td></tr>
          <tr><td><b>Payment Method</b></td><td>${this.paymentMethod.replace(/_/g, ' ')}</td></tr>
        </tbody>
      </table>
    </div>
  `;

  return productTable + addressBlock + summaryTable;
});

/* ─────────────────────────────
   📍 Delivery Address Text Summary
───────────────────────────── */
OrderSchema.virtual('deliveryAddressSummary').get(function () {
  const addr = this.deliveryAddress;
  if (!addr) return 'No delivery address available.';
  return [
    '📍 Delivery Address',
    `• Type     : ${addr.type || '-'}`,
    `• Street   : ${addr.areaOrStreet || '-'}`,
    `• Landmark : ${addr.landmark || '-'}`,
    `• PIN Code : ${addr.pincode || '-'}`,
    `• Phone    : ${addr.phoneNumber || '-'}`,
  ].join('\n');
});

/* ─────────────────────────────
   ⚙️ Enable Virtuals in Output
───────────────────────────── */
OrderSchema.set('toObject', { virtuals: true });
OrderSchema.set('toJSON', { virtuals: true });

/* ─────────────────────────────
   📤 Export Model
───────────────────────────── */
const Order = mongoose.model('Order', OrderSchema);
module.exports = Order;