const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/users - admin/manager only
router.get('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) { next(err); }
});

// POST /api/users - admin only
router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered.' });

    const user = await User.create({ name, email, password, role: role || 'sales' });
    res.status(201).json({ message: 'User created.', user });
  } catch (err) { next(err); }
});

// PUT /api/users/:id - admin only
router.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User updated.', user });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id - admin only
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
