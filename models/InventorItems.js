// models/inventoryModel.js (Simplified)
import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Rice Bowl Meals",
        "Hot Sizzlers",
        "Party Tray",
        "Drinks",
        "Coffee",
        "Milk Tea",
        "Frappe",
        "Snacks & Appetizer",
        "Budget Meals Served with Rice",
        "Specialties"
      ]
    },
    currentStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    minStock: {
      type: Number,
      required: true,
      min: 1,
      default: 10
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    lastRestock: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["sufficient", "low", "critical", "out"],
      default: "sufficient"
    },
    restockHistory: [{
      quantity: Number,
      cost: Number,
      notes: String,
      date: { type: Date, default: Date.now },
      userId: String
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Calculate status based on stock levels
inventoryItemSchema.pre('save', function(next) {
  if (this.currentStock === 0) {
    this.status = "out";
  } else if (this.currentStock <= this.minStock * 0.3) {
    this.status = "critical";
  } else if (this.currentStock <= this.minStock * 0.7) {
    this.status = "low";
  } else {
    this.status = "sufficient";
  }
  
  this.updatedAt = Date.now();
  next();
});

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);