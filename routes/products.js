const express = require('express');
const { MongoClient } = require('mongodb');
const router = express.Router();

const MONGODB_URI = process.env.MONGODB_URI;

// GET /api/products?sort=relevance&page=1
router.get('/products', async (req, res) => {
  const { sort = 'relevance', page = 1 } = req.query;

  // Force 30 items per page
  const pageLimit = 30;
  const pageNumber = parseInt(page, 10) || 1;
  const skipCount = (pageNumber - 1) * pageLimit;

  let sortOption = {};

  switch (sort) {
    case 'popularity':
      sortOption = { quantity: -1 };
      break;
    case 'discountPriceLowToHigh':
      sortOption = { discountPrice: 1 };
      break;
    case 'discountPriceHighToLow':
      sortOption = { discountPrice: -1 };
      break;
    case 'newest':
      sortOption = { _id: -1 };
      break;
    case 'relevance':
    default:
      sortOption = { name: 1 };
      break;
  }

  try {
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db();
    const productsCollection = db.collection('products');

    const products = await productsCollection
      .find()
      .sort(sortOption)
      .skip(skipCount)
      .limit(pageLimit)
      .toArray();

    const totalCount = await productsCollection.countDocuments();

    res.status(200).json({
      success: true,
      products,
      pagination: {
        page: pageNumber,
        limit: pageLimit,
        totalPages: Math.ceil(totalCount / pageLimit),
        totalItems: totalCount,
      },
    });

    client.close();
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
