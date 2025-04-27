const express = require('express');
const { MongoClient } = require('mongodb');
const router = express.Router();

const MONGODB_URI = process.env.MONGODB_URI; // Add your connection URI here

// GET /api/products?sort=relevance|popularity|discountPriceLowToHigh|discountPriceHighToLow|newest
router.get('/products', async (req, res) => {
  const { sort } = req.query;

  // Set the default sorting option
  let sortOption = {};

  switch (sort) {
    case 'popularity':
      sortOption = { quantity: -1 }; // Assuming 'quantity' can be used as popularity
      break;
    case 'discountPriceLowToHigh':
      sortOption = { discountPrice: 1 }; // Sort by discountPrice (low to high)
      break;
    case 'discountPriceHighToLow':
      sortOption = { discountPrice: -1 }; // Sort by discountPrice (high to low)
      break;
    case 'newest':
      sortOption = { _id: -1 }; // Sort by the latest added (newest first)
      break;
    case 'relevance':
    default:
      sortOption = { name: 1 }; // Alphabetical order (default sort)
      break;
  }

  try {
    // Connect to the database using MongoDB Native driver
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db();
    const productsCollection = db.collection('products'); // Access the 'products' collection

    // Query products with the sort option
    const products = await productsCollection.find().sort(sortOption).toArray();

    res.status(200).json({ success: true, products });

    client.close(); // Close the connection
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
