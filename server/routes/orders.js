const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// Add to cart
router.post('/cart', auth, async (req, res) => {
  if (req.user.user_type !== 'buyer') {
    return res.status(403).json({ message: 'Only buyers can add to cart' });
  }

  const { product_id, quantity } = req.body;

  try {
    // Check if product exists
    const [product] = await db.query('SELECT * FROM products WHERE product_id = ?', [product_id]);
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if product is already in cart
    const [existingCartItem] = await db.query('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
    
    if (existingCartItem.length > 0) {
      // Update quantity if already in cart
      const newQuantity = existingCartItem[0].quantity + quantity;
      await db.query('UPDATE cart SET quantity = ? WHERE cart_id = ?', [newQuantity, existingCartItem[0].cart_id]);
    } else {
      // Add new item to cart
      await db.query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.user.id, product_id, quantity]);
    }

    res.json({ message: 'Product added to cart successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get cart items
router.get('/cart', auth, async (req, res) => {
  if (req.user.user_type !== 'buyer') {
    return res.status(403).json({ message: 'Only buyers can view cart' });
  }

  try {
    const [cartItems] = await db.query(`
      SELECT c.cart_id, c.quantity, p.product_id, p.name, p.description, p.price, p.image_url, p.seller_id, u.username as seller_name
      FROM cart c
      JOIN products p ON c.product_id = p.product_id
      JOIN users u ON p.seller_id = u.user_id
      WHERE c.user_id = ?
    `, [req.user.id]);

    res.json(cartItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove from cart
router.delete('/cart/:id', auth, async (req, res) => {
  if (req.user.user_type !== 'buyer') {
    return res.status(403).json({ message: 'Only buyers can remove from cart' });
  }

  try {
    await db.query('DELETE FROM cart WHERE cart_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Item removed from cart successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create order
router.post('/checkout', auth, async (req, res) => {
  if (req.user.user_type !== 'buyer') {
    return res.status(403).json({ message: 'Only buyers can place orders' });
  }

  const { delivery_county, delivery_sub_county, delivery_address } = req.body;

  try {
    // Get cart items
    const [cartItems] = await db.query(`
      SELECT c.quantity, p.product_id, p.price, p.seller_id
      FROM cart c
      JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = ?
    `, [req.user.id]);

    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Calculate total amount
    const totalAmount = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

    // Start transaction
    await db.query('START TRANSACTION');

    try {
      // Create order
      const [order] = await db.query(
        'INSERT INTO orders (buyer_id, total_amount, delivery_county, delivery_sub_county, delivery_address) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, totalAmount, delivery_county, delivery_sub_county, delivery_address]
      );

      const orderId = order.insertId;

      // Add order items and update product quantities
      for (const item of cartItems) {
        await db.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, item.price]
        );

        await db.query(
          'UPDATE products SET quantity = quantity - ? WHERE product_id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Clear cart
      await db.query('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

      // Commit transaction
      await db.query('COMMIT');

      res.json({ message: 'Order placed successfully', orderId });
    } catch (error) {
      // Rollback transaction if any error occurs
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get buyer orders
router.get('/my-orders', auth, async (req, res) => {
  if (req.user.user_type !== 'buyer') {
    return res.status(403).json({ message: 'Only buyers can view orders' });
  }

  try {
    const [orders] = await db.query(`
      SELECT o.*, 
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) as item_count
      FROM orders o
      WHERE o.buyer_id = ?
      ORDER BY o.order_date DESC
    `, [req.user.id]);

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get seller orders
router.get('/seller-orders', auth, async (req, res) => {
  if (req.user.user_type !== 'seller') {
    return res.status(403).json({ message: 'Only sellers can view orders' });
  }

  try {
    const [orders] = await db.query(`
      SELECT o.order_id, o.order_date, o.status, o.total_amount,
             u.username as buyer_name, u.phone as buyer_phone,
             oi.product_id, p.name as product_name, oi.quantity, oi.price,
             p.image_url
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN products p ON oi.product_id = p.product_id
      JOIN users u ON o.buyer_id = u.user_id
      WHERE p.seller_id = ?
      ORDER BY o.order_date DESC
    `, [req.user.id]);

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status (seller only)
router.put('/:id/status', auth, async (req, res) => {
  if (req.user.user_type !== 'seller') {
    return res.status(403).json({ message: 'Only sellers can update order status' });
  }

  const { status } = req.body;

  try {
    await db.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, req.params.id]);
    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;