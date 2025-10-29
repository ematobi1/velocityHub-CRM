const express = require('express');
const router = express.Router();
const aiAnalyticsController = require('../controllers/aiAnalyticsController');
const { auth, authorize } = require('../middleware/auth');

/**
 * AI Analytics Routes
 * Provides insights into AI usage, costs, and optimization opportunities
 */

// All routes require authentication
router.use(auth);

// @route   GET /api/ai-analytics/usage
// @desc    Get AI usage statistics
// @access  Private (Admin, Manager)
router.get('/usage', authorize('admin', 'manager'), aiAnalyticsController.getAIUsageStats);

// @route   POST /api/ai-analytics/usage/reset
// @desc    Reset AI usage statistics
// @access  Private (Admin only)
router.post('/usage/reset', authorize('admin'), aiAnalyticsController.resetAIUsageStats);

// @route   GET /api/ai-analytics/providers
// @desc    Get available AI providers and their capabilities
// @access  Private (Admin, Manager)
router.get('/providers', authorize('admin', 'manager'), aiAnalyticsController.getAvailableProviders);

// @route   GET /api/ai-analytics/health
// @desc    Health check for all AI providers
// @access  Private (Admin, Manager)
router.get('/health', authorize('admin', 'manager'), aiAnalyticsController.healthCheck);

// @route   GET /api/ai-analytics/recommendations
// @desc    Get optimization recommendations
// @access  Private (Admin, Manager)
router.get('/recommendations', authorize('admin', 'manager'), aiAnalyticsController.getOptimizationRecommendations);

module.exports = router;
