const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const router = express.Router();

const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB
async function connectDB() {
  const client = await MongoClient.connect(MONGODB_URI);
  return { db: client.db(), client };
}

// ==============================
// Helpers
// ==============================
function isValidObjectId(id) {
  return ObjectId.isValid(id);
}

// ==============================
// Routes
// ==============================

// GET /users/products/allProducts?page=0
router.get('/allProducts', async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = 100;
  const skip = page * limit;

  try {
    const { db, client } = await connectDB();
    const products = await db.collection('products')
      .find()
      .skip(skip)
      .limit(limit)
      .toArray();
    await client.close();

    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching all products:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// GET /users/products/getProducts/:categoryName
router.get('/getProducts/:categoryName', async (req, res) => {
  const { categoryName } = req.params;

  try {
    const { db, client } = await connectDB();

    // Step 1: Find category by name
    const category = await db.collection('categories').findOne({ name: categoryName });

    if (!category) {
      await client.close();
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Step 2: Find products with matching category ObjectId
    const products = await db.collection('products')
      .find({ category: category._id })
      .toArray();

    await client.close();

    // Step 3: Return response
    res.status(200).json({ success: true, products });
    
  } catch (error) {
    console.error('Error fetching products by category name:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// GET /users/products/:productId
router.get('/:productId', async (req, res) => {
  const { productId } = req.params;

  if (!isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: 'Invalid Product ID' });
  }

  try {
    const { db, client } = await connectDB();
    const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
    await client.close();

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
