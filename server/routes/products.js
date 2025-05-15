const express = require('express');
const router = express.Router();
const db = require('../config/db');
const upload = require('../config/multer');
const auth = require('../middleware/auth');

// Get all products with filters
router.get('/', async (req, res) => {
  const { category, county, sub_county, minPrice, maxPrice, search } = req.query;
  let query = 'SELECT * FROM products';
  const conditions = [];
  const params = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (county) {
    conditions.push('county = ?');
    params.push(county);
  }
  if (sub_county) {
    conditions.push('sub_county = ?');
    params.push(sub_county);
  }
  if (minPrice) {
    conditions.push('price >= ?');
    params.push(minPrice);
  }
  if (maxPrice) {
    conditions.push('price <= ?');
    params.push(maxPrice);
  }
  if (search) {
    conditions.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  try {
    const [products] = await db.query(query, params);
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const [product] = await db.query('SELECT * FROM products WHERE product_id = ?', [req.params.id]);
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add product (seller only)
router.post('/', auth, upload.single('image'), async (req, res) => {
  if (req.user.user_type !== 'seller') {
    return res.status(403).json({ message: 'Only sellers can add products' });
  }

  const { name, description, category, price, quantity, unit, county, sub_county } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const [result] = await db.query(
      'INSERT INTO products (seller_id, name, description, category, price, quantity, unit, county, sub_county, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, name, description, category, price, quantity, unit, county, sub_county, image_url]
    );
    
    const [newProduct] = await db.query('SELECT * FROM products WHERE product_id = ?', [result.insertId]);
    res.status(201).json(newProduct[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product (seller only)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  if (req.user.user_type !== 'seller') {
    return res.status(403).json({ message: 'Only sellers can update products' });
  }

  const { name, description, category, price, quantity, unit, county, sub_county } = req.body;
  let image_url = null;

  try {
    // Check if product belongs to the seller
    const [product] = await db.query('SELECT * FROM products WHERE product_id = ? AND seller_id = ?', [req.params.id, req.user.id]);
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found or not owned by you' });
    }

    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    } else {
      image_url = product[0].image_url;
    }

    await db.query(
      'UPDATE products SET name = ?, description = ?, category = ?, price = ?, quantity = ?, unit = ?, county = ?, sub_county = ?, image_url = ? WHERE product_id = ?',
      [name, description, category, price, quantity, unit, county, sub_county, image_url, req.params.id]
    );

    const [updatedProduct] = await db.query('SELECT * FROM products WHERE product_id = ?', [req.params.id]);
    res.json(updatedProduct[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product (seller only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.user_type !== 'seller') {
    return res.status(403).json({ message: 'Only sellers can delete products' });
  }

  try {
    // Check if product belongs to the seller
    const [product] = await db.query('SELECT * FROM products WHERE product_id = ? AND seller_id = ?', [req.params.id, req.user.id]);
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found or not owned by you' });
    }

    await db.query('DELETE FROM products WHERE product_id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;