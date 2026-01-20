import mongoose from "mongoose"; 

// MenuItem Schema
const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Rice Bowl Meals',
      'Hot Sizzlers',
      'Party Tray',
      'Drinks',
      'Coffee',
      'Milk Tea',
      'Frappe',
      'Snacks & Appetizer',
      'Budget Meals Served with Rice',
      'Specialties'
    ]
  },
  status: {
    type: String,
    enum: ['available', 'unavailable'],
    default: 'available'
  },
  image: {
    type: String,
    default: 'default_food.png'
  },
  stock: {
    type: Number,
    default: 100,
    min: 0
  },
  unit: {
    type: String,
    default: 'pcs'
  },
  vatable: {
    type: Boolean,
    default: true
  },
  inventoryItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InventoryItem",
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update timestamp
menuItemSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);