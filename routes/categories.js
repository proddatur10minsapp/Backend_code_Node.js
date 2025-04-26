const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const router = express.Router();

const MONGODB_URI = process.env.MONGODB_URI;

async function connectDB() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();
  return { db, client };
}

// GET /users/products/category/getCategoryByName/:name
router.get('/getCategoryByName/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const { db, client } = await connectDB();
    const category = await db.collection('categories').findOne({ name });
    client.close();
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.status(200).json({ success: true, category });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// GET /users/products/category/getCategoryById/:id
router.get('/getCategoryById/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { db, client } = await connectDB();
    const category = await db.collection('categories').findOne({ _id: new ObjectId(id) });
    client.close();
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.status(200).json({ success: true, category });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// GET /users/products/category/allCategory
router.get('/allCategory', async (req, res) => {
  try {
    const { db, client } = await connectDB();
    const categories = await db.collection('categories').find().toArray();
    client.close();
    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
