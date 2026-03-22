const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'manager'].includes(req.user.role);
    const baseQuery = isAdmin ? {} : { assignedTo: req.user._id };

    const [
      totalLeads,
      newLeads,
      contactedLeads,
      convertedLeads,
      lostLeads,
      totalUsers,
      totalValue,
      recentLeads
    ] = await Promise.all([
      Lead.countDocuments(baseQuery),
      Lead.countDocuments({ ...baseQuery, status: 'new' }),
      Lead.countDocuments({ ...baseQuery, status: 'contacted' }),
      Lead.countDocuments({ ...baseQuery, status: 'converted' }),
      Lead.countDocuments({ ...baseQuery, status: 'lost' }),
      isAdmin ? User.countDocuments({ isActive: true }) : Promise.resolve(null),
      Lead.aggregate([
        { $match: { ...baseQuery, status: 'converted' } },
        { $group: { _id: null, total: { $sum: '$value' } } }
      ]),
      Lead.find(baseQuery).sort({ createdAt: -1 }).limit(5).select('name email status createdAt priority')
    ]);

    // Monthly breakdown (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await Lead.aggregate([
      { $match: { ...baseQuery, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
          value: { $sum: '$value' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Source breakdown
    const sourceData = await Lead.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Status breakdown
    const statusData = await Lead.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

    res.json({
      stats: {
        totalLeads,
        newLeads,
        contactedLeads,
        convertedLeads,
        lostLeads,
        totalUsers,
        totalValue: totalValue[0]?.total || 0,
        conversionRate: parseFloat(conversionRate)
      },
      recentLeads,
      monthlyData,
      sourceData,
      statusData
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
