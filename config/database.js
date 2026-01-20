// config/database.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    console.log('Using existing MongoDB connection');
    return;
  }

  try {
    // For Mongoose 6+, these options are no longer needed
    // The new version uses sensible defaults
    await mongoose.connect(process.env.MONGODB_URI);
    
    isConnected = true;
    console.log('MongoDB Atlas has been connected successfully');
    
    // Initialize default data
    await initializeDefaultData();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

async function initializeDefaultData() {
  try {
    // Initialize default categories
    const Category = mongoose.models.Category || mongoose.model('Category', new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      createdAt: { type: Date, default: Date.now }
    }));
    
    const defaultCategories = [
      "Rice", "Sizzling", "Party", "Drink", "Cafe", "Milk", "Frappe", 
      "Snack & Appetizer", "Budget Meals Served with Rice", "Specialties"
    ];
    
    for (const catName of defaultCategories) {
      await Category.findOneAndUpdate(
        { name: catName },
        { $setOnInsert: { name: catName } },
        { upsert: true, new: true }
      );
    }
    
    // Initialize default admin user
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
      status: { type: String, enum: ['active', 'inactive'], default: 'active' },
      createdAt: { type: Date, default: Date.now }
    }));
    
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount === 0) {
      const adminUser = new User({
        username: "admin",
        password: bcrypt.hashSync("admin123", 10),
        role: "admin",
        status: "active"
      });
      
      await adminUser.save();
      console.log("✓ Default admin user created: admin / admin123");
    }
    
    // Initialize default staff user
    const staffCount = await User.countDocuments({ role: "staff" });
    if (staffCount === 0) {
      const staffUser = new User({
        username: "staff",
        password: bcrypt.hashSync("staff123", 10),
        role: "staff",
        status: "active"
      });
      await staffUser.save();
      console.log("✓ Default staff user created: staff / staff123");
    }

  } catch (error) {
    console.error("Error initializing default data:", error);
    // Don't exit, just log the error and continue
  }
}

// Export models
export const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
}));

export const Category = mongoose.models.Category || mongoose.model('Category', new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
}));