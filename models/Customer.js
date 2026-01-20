import mongoose from "mongoose";

// Customer Schema
const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    sparse: true
  },
  email: {
    type: String,
    sparse: true
  },
  totalOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  firstOrder: {
    type: Date
  },
  lastOrder: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export const Customer = mongoose.model("Customer", customerSchema);
