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

    // === ORDER INFO ===
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

    const orderInfoBottom = doc
      .text(`Order ID: ${order._id}`, orderInfoX, orderInfoY)
      .text(`Payment: ${order.paymentMethod?.replace("_", " ")}`)
      .text(`Status: ${order.orderStatus}`)
      .text(`Date: ${orderDate}`).y;

    // Divider after order info
    doc.moveTo(15, orderInfoBottom + 4).lineTo(doc.page.width - 15, orderInfoBottom + 4).stroke();

    // === DELIVERY ADDRESS ===
    doc.font("Helvetica-Bold").fontSize(13).text("Delivery To:", 15, doc.y + 8);
    doc.font("Helvetica").fontSize(13)
      .text(
        `${order.deliveryAddress?.name || ""}\n${order.deliveryAddress?.areaOrStreet || ""}, ${order.deliveryAddress?.landmark || ""}, ${order.deliveryAddress?.pincode || ""}, Phone:${order.phoneNumber}`,
        { width: doc.page.width - 30 }
      );

    // Divider
    doc.moveTo(15, doc.y + 5).lineTo(doc.page.width - 15, doc.y + 5).stroke();

    // === PRODUCT TABLE HEADERS ===
    const itemX = 15, qtyX = 100, priceX = 140, discX = 180, totalX = 220;
    doc.moveDown(0.8);
    doc.fontSize(9).font("Helvetica-Bold");
    const headerY = doc.y;

    doc.text("Products", itemX, headerY, { width: qtyX - itemX - 5 });
    doc.text("Qty", qtyX, headerY, { width: 30, align: "right" });
    doc.text("MRP", priceX, headerY, { width: 35, align: "right" });
    doc.text("DP", discX, headerY, { width: 40, align: "right" });
    doc.text("Total", totalX, headerY, { width: 40, align: "right" });

    doc.moveTo(15, headerY + 12).lineTo(doc.page.width - 15, headerY + 12).lineWidth(0.7).stroke();

    // === PRODUCT ROWS ===
    let y = headerY + 18;
    order.OrdersCartDTO.productsList.forEach((p, idx) => {
      const rowY = y;

      doc.font("Helvetica").fontSize(9).fillColor("#000");
      const productNameHeight = doc.heightOfString(p.productName, { width: qtyX - itemX - 5 });
      const rowHeight = Math.max(productNameHeight, 20);

      if (idx % 2 === 1) {
        doc.rect(15, rowY - 2, doc.page.width - 30, rowHeight + 4).fill("#f9f9f9").fillColor("#000");
      }

      doc.text(p.productName, itemX, rowY, { width: qtyX - itemX - 5 });
      doc.text(p.quantity.toString(), qtyX, rowY, { width: 30, align: "right" });
      doc.text(`${p.price.toFixed(2)}`, priceX, rowY, { width: 35, align: "right" });
      doc.text(`${p.discountedPrice}`, discX, rowY, { width: 40, align: "right" });
      doc.text(`${p.totalPrice.toFixed(2)}`, totalX, rowY, { width: 40, align: "right" });

      y += rowHeight + 6;
    });

    doc.moveTo(15, y).lineTo(doc.page.width - 15, y).stroke();
    // === GIFT PRODUCT NAME ONLY ===
    if (order.giftProduct) {
      const gift = order.giftProduct;

      doc.moveDown(3); // space above the box

      const giftBoxHeight = 15; // enough height for single line
      const boxY = doc.y;

      // Draw the box
      doc.rect(15, boxY, doc.page.width - 30, giftBoxHeight).stroke();

      // Add heading + product name in one line
      doc.font("Helvetica-Bold")
        .fontSize(8)
        .text(`Free Gift: ${gift.name}`, 20, boxY + 7, {
          width: doc.page.width - 40,
          ellipsis: true
        });

      // Update y position for content after the box
      y = boxY + giftBoxHeight + 10; // extra space after box
    }

    // === TOTALS SECTION ===
    const boxY = y + 10;
    doc.rect(15, boxY, doc.page.width - 20, 90).fillAndStroke("#f0f0f0", "#000");

    doc.fillColor("#000").fontSize(10).font("Helvetica");
    doc.text(`Subtotal: ${order.OrdersCartDTO.totalDiscountedPrice.toFixed(2)}`, 20, boxY + 8, {
      align: "right",
      width: doc.page.width - 40,
    });

    doc.font("Helvetica").fontSize(10).text("You Saved ", 18, boxY + 25, { continued: true });
    doc.font("Helvetica-Bold").text(`${order.OrdersCartDTO.discountedAmount.toFixed(2)}`, { continued: true });
    doc.font("Helvetica").text(" on this order");

    if (order.giftWrapFee && order.giftWrapFee > 0) {
      doc.text(`Gift Wrap Fee: ${order.giftWrapFee.toFixed(2)}`, 20, boxY + 42, {
        align: "right",
        width: doc.page.width - 40,
      });
    }

    doc.text(`Delivery Fee: ${order.deliveryCharges.toFixed(2)}`, 20, boxY + 55, {
      align: "right",
      width: doc.page.width - 40,
    });

    doc.font("Helvetica-Bold").fontSize(12).text(`TOTAL: ${order.totalPayable.toFixed(2)}`, 20, boxY + 70, {
      align: "right",
      width: doc.page.width - 40,
    });

    // === FOOTER ===
    doc.moveDown(1);
    doc.font("Helvetica-Oblique").fontSize(10).text("Thank you for shopping!", { align: "center" });

    // === QR CODE AT THE END ===
    const updateUrl = `https://svm-delivery.srivasavimart.store/delivery/update-status?orderId=${order._id}`;
    const qrDataUrl = await QRCode.toDataURL(updateUrl);
    const qrSize = 180;
    const qrX = doc.page.width - qrSize - 40;
    const qrY = doc.y + 10;

    doc.image(qrDataUrl, qrX, qrY, { width: qrSize, height: qrSize });
    // END PDF
    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating bill");
  }
});

module.exports = router;