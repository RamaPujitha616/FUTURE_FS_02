const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Note text is required'],
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorName: {
    type: String,
    required: true
  }
}, { timestamps: true });

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['call', 'email', 'meeting', 'note', 'status_change', 'created'],
    required: true
  },
  description: { type: String, required: true },
  performedBy: { type: String, required: true }
}, { timestamps: true });

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  company: {
    type: String,
    trim: true,
    default: ''
  },
  source: {
    type: String,
    enum: ['website', 'referral', 'social_media', 'cold_call', 'email_campaign', 'event', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  value: {
    type: Number,
    default: 0,
    min: 0
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedToName: {
    type: String,
    default: ''
  },
  notes: [noteSchema],
  activities: [activitySchema],
  tags: [{ type: String, trim: true }],
  nextFollowUp: {
    type: Date,
    default: null
  },
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Auto-calculate lead score based on status & priority
leadSchema.pre('save', function(next) {
  const statusScore = { new: 10, contacted: 25, qualified: 45, proposal: 60, negotiation: 80, converted: 100, lost: 0 };
  const priorityScore = { low: 0, medium: 10, high: 20 };
  this.score = Math.min(100, (statusScore[this.status] || 0) + (priorityScore[this.priority] || 0));
  next();
});

// Indexes for search performance
leadSchema.index({ name: 'text', email: 'text', company: 'text' });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('Lead', leadSchema);
