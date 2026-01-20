import mongoose from "mongoose";

// Daily Sales Schema
const dailySalesSchema = new mongoose.Schema({
  dateKey: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    unique: true
  },
  totalSales: {
    type: Number,
    default: 0
  },
  totalCosts: {
    type: Number,
    default: 0
  },
  profit: {
    type: Number,
    default: 0
  },
  itemsSold: {
    type: Map,
    of: {
      quantity: Number,
      price: Number
    },
    default: {}
  },
  inventoryCosts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export const DailySales = mongoose.model("DailySales", dailySalesSchema);
