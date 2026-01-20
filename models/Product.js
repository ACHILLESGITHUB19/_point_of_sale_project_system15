import mongoose from "mongoose";

// Product Schema (for POS/menu items)
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      unique: true
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
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: 0,
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: [true, "Inventory item reference is required"]
    },
    status: {
      type: String,
      enum: ["available", "unavailable"],
      default: "available"
    },
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

export const Product = mongoose.model("Product", productSchema);
export default Product;