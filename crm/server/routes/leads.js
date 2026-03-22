const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── HELPER: sanitize incoming lead fields ─────────────────────────────────
function sanitizeLead(body) {
  const { name, email, phone, company, source, status, priority, value, assignedTo, tags, nextFollowUp } = body;

  // assignedTo: empty string "" causes a Mongoose CastError — must be null
  let safeAssignedTo = null;
  if (assignedTo && mongoose.Types.ObjectId.isValid(String(assignedTo))) {
    safeAssignedTo = assignedTo;
  }

  // value must be a number, not a string
  const safeValue = parseFloat(value) || 0;

  // tags: accept array or comma-separated string
  let safeTags = [];
  if (Array.isArray(tags)) {
    safeTags = tags.map(t => String(t).trim()).filter(Boolean);
  } else if (typeof tags === 'string' && tags.trim()) {
    safeTags = tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  return {
    name:          name?.trim(),
    email:         email?.trim().toLowerCase(),
    phone:         phone?.trim() || '',
    company:       company?.trim() || '',
    source:        source || 'other',
    status:        status || 'new',
    priority:      priority || 'medium',
    value:         safeValue,
    assignedTo:    safeAssignedTo,
    tags:          safeTags,
    nextFollowUp:  nextFollowUp ? new Date(nextFollowUp) : null,
  };
}

// ── GET /api/leads/export/csv  ← MUST come before /:id ───────────────────
router.get('/export/csv', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const leads = await Lead.find({}).populate('assignedTo', 'name');
    const header = 'Name,Email,Phone,Company,Source,Status,Priority,Value,Assigned To,Created At\n';
    const rows = leads.map(l =>
      `"${l.name}","${l.email}","${l.phone||''}","${l.company||''}","${l.source}","${l.status}","${l.priority}","${l.value}","${l.assignedTo?.name||''}","${l.createdAt.toISOString()}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send(header + rows);
  } catch (err) { next(err); }
});

// ── GET /api/leads ────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search, status, source, priority, assignedTo, page=1, limit=10, sortBy='createdAt', sortOrder='desc' } = req.query;
    const query = {};

    if (req.user.role === 'sales') query.assignedTo = req.user._id;

    if (search) query.$or = [
      { name:    { $regex: search, $options: 'i' } },
      { email:   { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } }
    ];
    if (status)   query.status   = status;
    if (source)   query.source   = source;
    if (priority) query.priority = priority;
    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) query.assignedTo = assignedTo;

    const skip = (parseInt(page)-1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder==='desc' ? -1 : 1 };

    const [leads, total] = await Promise.all([
      Lead.find(query).populate('assignedTo','name email').sort(sort).skip(skip).limit(parseInt(limit)),
      Lead.countDocuments(query)
    ]);

    res.json({ leads, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total/parseInt(limit)) } });
  } catch (err) { next(err); }
});

// ── POST /api/leads ───────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    if (!req.body.name?.trim()) return res.status(400).json({ error: 'Name is required.' });
    if (!req.body.email?.trim()) return res.status(400).json({ error: 'Email is required.' });

    const fields = sanitizeLead(req.body);

    // Sales users: auto-assign new leads to themselves so they can see them
    if (!fields.assignedTo && req.user.role === 'sales') {
      fields.assignedTo = req.user._id;
    }

    // Look up assignedToName
    let assignedToName = '';
    if (fields.assignedTo) {
      const User = require('../models/User');
      const u = await User.findById(fields.assignedTo).select('name');
      assignedToName = u?.name || '';
    }

    const lead = await Lead.create({
      ...fields,
      assignedToName,
      activities: [{ type:'created', description:`Lead created by ${req.user.name}`, performedBy: req.user.name }]
    });

    res.status(201).json({ message: 'Lead created successfully.', lead });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors).map(e=>e.message).join(', ') });
    }
    next(err);
  }
});

// ── GET /api/leads/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid lead ID.' });
    const lead = await Lead.findById(req.params.id).populate('assignedTo','name email role').populate('notes.author','name');
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    res.json({ lead });
  } catch (err) { next(err); }
});

// ── PUT /api/leads/:id ────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid lead ID.' });

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    const oldStatus = lead.status;
    const fields = sanitizeLead({ ...lead.toObject(), ...req.body });

    Object.assign(lead, fields);

    if (fields.status && fields.status !== oldStatus) {
      lead.activities.push({
        type: 'status_change',
        description: `Status changed from "${oldStatus}" to "${fields.status}" by ${req.user.name}`,
        performedBy: req.user.name
      });
    }

    if (fields.assignedTo) {
      const User = require('../models/User');
      const u = await User.findById(fields.assignedTo).select('name');
      lead.assignedToName = u?.name || '';
    } else {
      lead.assignedToName = '';
    }

    await lead.save();
    res.json({ message: 'Lead updated successfully.', lead });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors).map(e=>e.message).join(', ') });
    }
    next(err);
  }
});

// ── DELETE /api/leads/:id ─────────────────────────────────────────────────
router.delete('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid lead ID.' });
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    res.json({ message: 'Lead deleted successfully.' });
  } catch (err) { next(err); }
});

// ── POST /api/leads/:id/notes ─────────────────────────────────────────────
router.post('/:id/notes', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid lead ID.' });
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Note text is required.' });

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    lead.notes.push({ text: text.trim(), author: req.user._id, authorName: req.user.name });
    lead.activities.push({ type:'note', description:`Note added by ${req.user.name}`, performedBy: req.user.name });

    await lead.save();
    res.status(201).json({ message: 'Note added successfully.', notes: lead.notes });
  } catch (err) { next(err); }
});

module.exports = router;
