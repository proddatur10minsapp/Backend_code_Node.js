const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode"); // ✅ ADD THIS
const Order = require("../models/Order");

router.get("/orders/:id/bill", async (req, res) => {
  try {
    // === FETCH ORDER ===
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).send("Order not found");

    // === INITIALIZE PDF ===
    const doc = new PDFDocument({ size: [260, 750], margin: 15 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=order-${order._id}.pdf`
    );
    doc.pipe(res);

    // === HEADER SECTION ===
    const headerHeight = 40;
    doc.rect(15, 15, doc.page.width - 30, headerHeight)
      .fillAndStroke("#f0f0f0", "#000");

    doc.font("Helvetica-Bold").fontSize(16).fillColor("#000");
    doc.text(
      "Sri Vasavi Mart",
      15,
      15 + headerHeight / 2 - 8,
      { width: doc.page.width - 30, align: "center" }
    );

    doc.moveDown(1);
    doc.fontSize(12).font("Helvetica-Bold")
      .text("Estimation", { align: "center", underline: true });
    doc.moveDown(0.5);

    // === ORDER INFO SECTION ===
    let orderDate;
    try {
      const rawDate = order.createdAt?.$date || order.createdAt;
      const dateObj = rawDate ? new Date(rawDate) : null;
      orderDate = dateObj && !isNaN(dateObj) ? dateObj.toLocaleString() : "N/A";
    } catch {
      orderDate = "N/A";
    }

    doc.fontSize(9).font("Helvetica").fillColor("#000")
      .text(`Order ID: ${order._id}`)
      .text(`Phone: ${order.phoneNumber}`)
      .text(`Payment: ${order.paymentMethod?.replace("_", " ")}`)
      .text(`Status: ${order.orderStatus}`)
      .text(`Date: ${orderDate}`)
      .moveDown(0.5);

    doc.font("Helvetica-Bold").text("Delivery To:");
    doc.font("Helvetica").fontSize(9)
      .text(
        `${order.deliveryAddress?.name || ""}\n${order.deliveryAddress?.areaOrStreet || ""}, ${order.deliveryAddress?.landmark || ""}\n${order.deliveryAddress?.pincode || ""}`,
        { width: doc.page.width - 30 }
      )
      .moveDown(0.5);

    // Divider line
    doc.moveTo(15, doc.y).lineTo(doc.page.width - 15, doc.y).lineWidth(1).stroke();

    // === COLUMN HEADERS ===
    const itemX = 20;
    const qtyX = 150;
    const priceX = 200;

    doc.moveDown(0.4);
    doc.fontSize(10).font("Helvetica-Bold");

    const headerY = doc.y;
    doc.text("Item", itemX, headerY, { width: qtyX - itemX - 5, align: "left" });
    doc.text("Qty", qtyX, headerY, { width: 20, align: "right" });
    doc.text("Price", priceX, headerY, { width: 50, align: "right" });

    doc.moveTo(15, headerY + 14)
      .lineTo(doc.page.width - 15, headerY + 14)
      .lineWidth(0.7)
      .stroke();

    // === PRODUCTS LIST WITH FIXED ROWS ===
    let y = headerY + 20;
    order.OrdersCartDTO.productsList.forEach((p, idx) => {
      const rowHeight = 24;

      if (idx % 2 === 1) {
        doc.rect(15, y - 2, doc.page.width - 30, rowHeight)
          .fill("#f9f9f9").fillColor("#000");
      }

      doc.font("Helvetica").fontSize(10).fillColor("#000");
      doc.text(p.productName, itemX, y, { width: qtyX - itemX - 5 });
      doc.text(p.quantity.toString(), qtyX, y, { width: 20, align: "right" });
      doc.text(`INR ${p.totalPrice}`, priceX, y, { width: 50, align: "right" });

      if (p.discountPercentage > 0) {
        doc.fontSize(8).fillColor("gray")
          .text(`Discount: ${p.discountPercentage}%`, itemX + 5, y + 12);
      }

      y += rowHeight;
    });

    doc.moveTo(15, y).lineTo(doc.page.width - 15, y).stroke();

    // === TOTALS SECTION ===
    const boxY = y + 10;
    doc.rect(15, boxY, doc.page.width - 30, 55)
      .fillAndStroke("#f0f0f0", "#000");

    doc.fillColor("#000").fontSize(10).font("Helvetica");
    doc.text(
      `Subtotal: INR ${order.OrdersCartDTO.totalPrice}`,
      20,
      boxY + 8,
      { align: "right", width: doc.page.width - 40 }
    );
    doc.text(
      `Delivery Fee: INR ${order.deliveryCharges}`,
      20,
      boxY + 20,
      { align: "right", width: doc.page.width - 40 }
    );

    if (order.giftWrapFee) {
      doc.text(
        `Gift Wrap Fee: INR ${order.giftWrapFee}`,
        20,
        boxY + 32,
        { align: "right", width: doc.page.width - 40 }
      );
    }

    doc.font("Helvetica-Bold").fontSize(12)
      .text(
        `TOTAL: INR ${order.totalPayable}`,
        20,
        boxY + 40,
        { align: "right", width: doc.page.width - 40, underline: true }
      );

    // === FOOTER ===
    doc.moveDown(1);
    doc.font("Helvetica-Oblique").fontSize(10)
      .text("Thank you for shopping!", { align: "center" });

    // === QR CODE SECTION ===
    const updateUrl = `https://svm-delivery.srivasavimart.store/delivery/update-status?orderId=${order._id}`;
    const qrDataUrl = await QRCode.toDataURL(updateUrl);

    doc.moveDown(0.5);
    const qrSize = 100;
    doc.image(qrDataUrl, doc.page.width / 2 - qrSize / 2, doc.y, {
      width: qrSize,
      height: qrSize,
    });
    doc.moveDown(0.5);
    doc.fontSize(8).font("Helvetica").fillColor("#000")
      .text("Scan to update order status", { align: "center" });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating bill");
  }
});

module.exports = router;