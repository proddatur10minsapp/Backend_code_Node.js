const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const Order = require("../models/Order");

router.get("/orders/:id/bill", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).send("Order not found");

    // === PDF SETUP ===
    const doc = new PDFDocument({ size: [300, 750], margin: 15 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=order-${order._id}.pdf`
    );
    doc.pipe(res);

    // === HEADER ===
    const headerHeight = 40;
    doc.rect(15, 15, doc.page.width - 30, headerHeight)
      .fillAndStroke("#f0f0f0", "#000");

    doc.font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#000")
      .text("Sri Vasavi Mart", 15, 15 + headerHeight / 2 - 8, {
        width: doc.page.width - 30,
        align: "center",
      });

    doc.moveDown(1);
    doc.fontSize(12)
      .font("Helvetica-Bold")
      .text("Estimation", { align: "center", underline: true });

    // === ORDER INFO (LEFT) + QR (RIGHT) ===
    let orderDate;
    try {
      const rawDate = order.createdAt?.$date || order.createdAt;
      const dateObj = rawDate ? new Date(rawDate) : null;
      orderDate = dateObj && !isNaN(dateObj) ? dateObj.toLocaleString() : "N/A";
    } catch {
      orderDate = "N/A";
    }

    const orderInfoY = doc.y + 10;
    const orderInfoX = 20;
    doc.fontSize(9).font("Helvetica").fillColor("#000");

    // Save starting Y and print order info
    const orderInfoBottom = doc
      .text(`Order ID: ${order._id}`, orderInfoX, orderInfoY)
      .text(`Phone: ${order.phoneNumber}`)
      .text(`Payment: ${order.paymentMethod?.replace("_", " ")}`)
      .text(`Status: ${order.orderStatus}`)
      .text(`Date: ${orderDate}`).y;

    // QR Code
    const updateUrl = `https://svm-delivery.srivasavimart.store/delivery/update-status?orderId=${order._id}`;
    const qrDataUrl = await QRCode.toDataURL(updateUrl);
    const qrSize = 70;
    const qrX = doc.page.width - qrSize - 20;

    doc.image(qrDataUrl, qrX, orderInfoY, { width: qrSize, height: qrSize });
    doc.fontSize(8)
      .text("Scan to update", qrX, orderInfoY + qrSize + 2, {
        width: qrSize,
        align: "center",
      });

    // Move Y to the lower of (order info bottom OR QR bottom)
    const nextSectionY = Math.max(orderInfoBottom, orderInfoY + qrSize + 12);
    doc.moveTo(15, nextSectionY).lineTo(doc.page.width - 15, nextSectionY).stroke();

    // === DELIVERY ADDRESS ===
    doc.font("Helvetica-Bold").fontSize(9).text("Delivery To:", 15, nextSectionY + 8);
    doc.font("Helvetica").fontSize(9)
      .text(
        `${order.deliveryAddress?.name || ""}\n${order.deliveryAddress?.areaOrStreet || ""}, ${order.deliveryAddress?.landmark || ""}, ${order.deliveryAddress?.pincode || ""}`,
        { width: doc.page.width - 30 }
      );

    // Divider
    doc.moveTo(15, doc.y + 5).lineTo(doc.page.width - 15, doc.y + 5).stroke();

    // === PRODUCT TABLE HEADERS ===
    const itemX = 15;
    const qtyX = 100;
    const priceX = 140;
    const discX = 180;
    const totalX = 220;

    doc.moveDown(0.8);
    doc.fontSize(9).font("Helvetica-Bold");
    const headerY = doc.y;

    doc.text("Products", itemX, headerY, { width: qtyX - itemX - 5 });
    doc.text("Qty", qtyX, headerY, { width: 30, align: "right" });
    doc.text("MRP", priceX, headerY, { width: 35, align: "right" });
    doc.text("DP", discX, headerY, { width: 40, align: "right" });
    doc.text("Total", totalX, headerY, { width: 40, align: "right" });

    doc.moveTo(15, headerY + 12)
      .lineTo(doc.page.width - 15, headerY + 12)
      .lineWidth(0.7)
      .stroke();

    // === PRODUCT ROWS ===
    let y = headerY + 18;
    order.OrdersCartDTO.productsList.forEach((p, idx) => {
      const rowHeight = 22;
      if (idx % 2 === 1) {
        doc.rect(15, y - 2, doc.page.width - 30, rowHeight)
          .fill("#f9f9f9")
          .fillColor("#000");
      }

      const discountedPrice = p.discountPercentage > 0
        ? (p.price - (p.price * p.discountPercentage) / 100).toFixed(2)
        : p.price;

      doc.font("Helvetica").fontSize(9).fillColor("#000");
      doc.text(p.productName, itemX, y, { width: qtyX - itemX - 5 });
      doc.text(p.quantity.toString(), qtyX, y, { width: 30, align: "right" });
      doc.text(`${p.price.toFixed(2)}`, priceX, y, { width: 35, align: "right" });
      doc.text(`${discountedPrice}`, discX, y, { width: 40, align: "right" });
      doc.text(`${p.totalPrice.toFixed(2)}`, totalX, y, { width: 40, align: "right" });

      y += rowHeight;
    });

    doc.moveTo(15, y).lineTo(doc.page.width - 15, y).stroke();

    // === TOTALS SECTION ===
    const boxY = y + 10;
    doc.rect(15, boxY, doc.page.width - 20, 70)
      .fillAndStroke("#f0f0f0", "#000");

    doc.fillColor("#000").fontSize(10).font("Helvetica");
    doc.text(`Subtotal: ${order.OrdersCartDTO.totalDiscountedPrice.toFixed(2)}`, 20, boxY + 8, {
      align: "right",
      width: doc.page.width - 40,
    });

    // Saved Amount
    doc.font("Helvetica").fontSize(10)
      .text("You Saved ", 18, boxY + 25, { continued: true });
    doc.font("Helvetica-Bold")
      .text(`${order.OrdersCartDTO.discountedAmount.toFixed(2)}`, { continued: true });
    doc.font("Helvetica").text(" on this order");

    // Gift Wrap Fee
    if (order.giftWrapFee && order.giftWrapFee > 0) {
      doc.text(`Gift Wrap Fee: ${order.giftWrapFee.toFixed(2)}`, 20, boxY + 22, {
        align: "right",
        width: doc.page.width - 40,
      });
    }

    // Delivery Fee
    doc.text(`Delivery Fee: ${order.deliveryCharges.toFixed(2)}`, 20, boxY + 38, {
      align: "right",
      width: doc.page.width - 40,
    });

    // Total
    doc.font("Helvetica-Bold").fontSize(12)
      .text(`TOTAL: ${order.totalPayable.toFixed(2)}`, 20, boxY + 53, {
        align: "right",
        width: doc.page.width - 40,
      });

    // === FOOTER ===
    doc.moveDown(1);
    doc.font("Helvetica-Oblique").fontSize(10)
      .text("Thank you for shopping!", { align: "center" });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating bill");
  }
});

module.exports = router;