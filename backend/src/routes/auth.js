const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, company } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'sales_rep',
      company: company || {},
      subscription: {
        tier: 'free',
        status: 'active',
        startDate: new Date()
      }
    });

    // Set limits based on free tier
    user.updateLimits();

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'velocityhub-secret-key-min-32-chars-long',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        limits: user.limits
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    user.isOnline = true;
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'velocityhub-secret-key-min-32-chars-long',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        limits: user.limits,
        usage: user.usage
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        avatar: req.user.avatar,
        company: req.user.company,
        subscription: req.user.subscription,
        limits: req.user.limits,
        usage: req.user.usage,
        preferences: req.user.preferences,
        onboarding: req.user.onboarding
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Update user profile
router.patch('/me', auth, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'phone', 'avatar', 'timezone', 'company', 'preferences'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    Object.assign(req.user, updates);
    await req.user.save();

    res.json({
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        avatar: req.user.avatar,
        company: req.user.company,
        preferences: req.user.preferences
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Verify current password
    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    req.user.password = newPassword;
    await req.user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Logout
router.post('/logout', auth, async (req, res) => {
  try {
    req.user.isOnline = false;
    await req.user.save();

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Complete onboarding step
router.post('/onboarding/complete', auth, async (req, res) => {
  try {
    const { step } = req.body;

    if (!req.user.onboarding.completedSteps.includes(step)) {
      req.user.onboarding.completedSteps.push(step);
      req.user.onboarding.currentStep = req.user.onboarding.completedSteps.length;
    }

    // Check if onboarding is complete
    const totalSteps = 5; // Define total onboarding steps
    if (req.user.onboarding.completedSteps.length >= totalSteps) {
      req.user.onboarding.completed = true;
    }

    await req.user.save();

    res.json({
      onboarding: req.user.onboarding
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Failed to update onboarding' });
  }
});

module.exports = router;
