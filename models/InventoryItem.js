import mongoose from "mongoose";    

// Inventory Item Schema
const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Inventory item name is required"],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
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
      required: [true, "Price is required"],
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
inventoryItemSchema.pre('save', function() {
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
});

export const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);
