import mongoose from "mongoose";

// Sales Data Schema (for dashboard)
const salesDataSchema = new mongoose.Schema({
  date: {
    type: String, // Format: "Mon", "Tue", etc.
    required: true
  },
  fullDate: {
    type: Date,
    required: true
  },
  total: {
    type: Number,
    default: 0
  },
  items: {
    type: Map,
    of: {
      quantity: Number,
      price: Number
    },
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

salesDataSchema.index({ fullDate: 1 });

export const SalesData = mongoose.model("SalesData", salesDataSchema);
