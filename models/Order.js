import mongoose from "mongoose";

// Order Schema
const orderSchema = new mongoose.Schema({
  items: [
    {
      name: String,
      price: Number,
      quantity: Number,
      inventoryItemId: mongoose.Schema.Types.ObjectId,
      productId: mongoose.Schema.Types.ObjectId
    }
  ],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    sparse: true
  },
  payment: {
    method: {
      type: String,
      enum: ["cash", "gcash"],
      default: "cash",
      required: true
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0
    },
    change: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "completed"
    }
  },
  type: {
    type: String,
    enum: ["Dine In", "Take Out"],
    default: "Dine In"
  },
  status: {
    type: String,
    enum: ["pending", "preparing", "ready", "served", "completed", "cancelled"],
    default: "pending"
  },
  orderNumber: {
    type: String,
    unique: true,
    default: function() {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `ORD-${year}${month}${day}-${random}`;
    }
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

// Update inventory when order is completed
orderSchema.pre('save', async function() {
  if (this.isModified('status') && this.status === 'completed') {
    try {
      for (const item of this.items) {
        if (item.inventoryItemId) {
          const inventoryItem = await InventoryItem.findById(item.inventoryItemId);
          if (inventoryItem) {
            inventoryItem.currentStock -= item.quantity;
            await inventoryItem.save();
          }
        }
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  }
});

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "payment.status": 1 });

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export default Order;