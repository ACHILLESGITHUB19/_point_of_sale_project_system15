import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from 'url';
import mongoose from "mongoose";
import { connectDB, User, Category } from "./config/database.js";
import Stats from "./models/Stats.js";
import MenuItem from "./models/Menuitems.js";
import Product from "./models/Product.js";
import Order from "./models/Order.js";
import InventoryItem from "./models/InventoryItem.js"; // Added import
import categoryRoutes from "./routes/categoryroute.js";
import productRoutes from "./routes/productroute.js";

dotenv.config();

const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`ERROR: ${varName} not defined in .env file`);
    process.exit(1);
  }
});

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define low stock threshold
const LOW_STOCK_THRESHOLD = 10;

await connectDB();

const adminClients = new Set();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use('/images', express.static(path.join(__dirname, "images")));
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));

const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.redirect("/login");

    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.clearCookie("token");
    res.redirect("/login");
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.redirect("/staffdashboard");
  }
  next();
};

app.get('/api/admin/events', verifyToken, verifyAdmin, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.write('data: {"type": "connected", "message": "Connected to real-time updates"}\n\n');

  const clientId = Date.now();
  const client = {
    id: clientId,
    res: res
  };
  
  adminClients.add(client);

  req.on('close', () => {
    adminClients.delete(client);
  });
});

const broadcastToAdmins = (data) => {
  if (adminClients.size === 0) {
    return;
  }
  
  const eventData = `data: ${JSON.stringify(data)}\n\n`;
  
  adminClients.forEach(client => {
    try {
      client.res.write(eventData);
      if (client.res.flush) {
        client.res.flush();
      }
    } catch (error) {
      adminClients.delete(client);
    }
  });
};

const sendOrderNotification = (order) => {
  broadcastToAdmins({
    type: 'new_order',
    data: {
      id: order._id.toString(),
      orderNumber: order.orderNumber || `ORD-${Date.now()}`,
      total: order.total || 0,
      type: order.type || 'Dine In',
      paymentMethod: order.payment?.method || 'cash',
      timestamp: new Date().toLocaleTimeString(),
      items: order.items?.length || 0,
      createdAt: order.createdAt || new Date()
    },
    message: `New order #${order.orderNumber} received!`
  });

  setTimeout(() => {
    updateStatsForAdmins();
  }, 500);
};

// Function to send low stock alerts
const sendLowStockAlert = async (product) => {
  const lowStockCount = await Product.countDocuments({
    stock: { $lt: LOW_STOCK_THRESHOLD, $gte: 0 }
  });

  broadcastToAdmins({
    type: 'low_stock_alert',
    data: {
      productId: product._id,
      productName: product.name,
      currentStock: product.stock,
      lowStockCount: lowStockCount
    },
    message: `Low stock alert: ${product.name} has only ${product.stock} items left!`
  });
};

const updateStatsForAdmins = async () => {
  try {
    const totalOrders = await Order.countDocuments();
    const ordersToday = await Order.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });
    
    const customerStats = await Order.aggregate([
      { 
        $match: { 
          customerId: { $ne: null, $exists: true } 
        } 
      },
      { 
        $group: { 
          _id: "$customerId" 
        } 
      },
      { 
        $count: "total" 
      }
    ]);
    
    const ordersWithoutCustomerId = await Order.countDocuments({
      $or: [
        { customerId: null },
        { customerId: { $exists: false } }
      ]
    });
    
    const totalCustomers = (customerStats[0]?.total || 0) + ordersWithoutCustomerId;
    
    const totalRevenueResult = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // Count low stock items
    const lowStockCount = await Product.countDocuments({
      stock: { $lt: LOW_STOCK_THRESHOLD, $gte: 0 }
    });

    broadcastToAdmins({
      type: 'stats_update',
      data: {
        totalOrders,
        ordersToday,
        totalCustomers,
        totalRevenue,
        lowStockCount
      }
    });
  } catch (error) {
    console.error('Error updating stats for admins:', error);
  }
};

app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);

// ========== INVENTORY ITEM ROUTES ==========

// Get all inventory items
app.get("/api/inventory", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const items = await InventoryItem.find().sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get single inventory item
app.get("/api/inventory/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Inventory item not found' 
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Create new inventory item
app.post("/api/inventory", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { 
      itemName, 
      itemType, 
      category, 
      message,
      currentStock,
      minStock,
      unit,
      isActive
    } = req.body;

    if (!itemName || !category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Item name and category are required' 
      });
    }

    const newItem = new InventoryItem({
      itemName,
      itemType: itemType || "raw",
      category,
      message: message || '',
      currentStock: currentStock || 0,
      minStock: minStock || 10,
      unit: unit || 1,
      isActive: isActive !== undefined ? isActive : true
    });

    await newItem.save();

    res.status(201).json({ 
      success: true, 
      message: 'Inventory item added successfully',
      data: newItem
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Update inventory item
app.put("/api/inventory/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { 
      itemName, 
      itemType, 
      category, 
      message,
      currentStock,
      minStock,
      unit,
      isActive
    } = req.body;

    const updatedItem = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      { 
        itemName, 
        itemType, 
        category,
        message,
        currentStock,
        minStock,
        unit,
        isActive,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Inventory item not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Inventory item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Delete inventory item
app.delete("/api/inventory/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deletedItem = await InventoryItem.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Inventory item not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Inventory item deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Search/filter inventory items
app.get("/api/inventory/filter/search", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { itemType, category, search } = req.query;
    let query = {};

    if (itemType && itemType !== 'all') {
      query.itemType = itemType;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.itemName = { $regex: search, $options: 'i' };
    }

    const items = await InventoryItem.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get unique categories for filtering
app.get("/api/inventory/categories", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const categories = await InventoryItem.distinct("category");
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Restock inventory item
app.post("/api/inventory/:id/restock", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { quantity, notes, price } = req.body;
    const itemId = req.params.id;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid quantity greater than 0'
      });
    }
    
    const item = await InventoryItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    // Update stock
    item.currentStock += parseFloat(quantity);
    
    // Add to restock history
    item.restockHistory.push({
      quantity: parseFloat(quantity),
      price: parseFloat(price || 0),
      notes: notes || '',
      addedBy: req.user.id
    });
    
    await item.save();
    
    res.json({
      success: true,
      message: 'Item restocked successfully',
      data: item
    });
  } catch (error) {
    console.error('Restock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get inventory statistics for dashboard - UPDATED VERSION
app.get("/api/inventory/stats", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalItems = await InventoryItem.countDocuments();
    
    // Count low stock items (currentStock > 0 AND currentStock <= minStock)
    const lowStockItems = await InventoryItem.find({
      isActive: true
    });
    
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let needsRestockCount = 0;
    
    // Manually check each item because $expr with $ifNull in countDocuments can be tricky
    for (const item of lowStockItems) {
      const minStockValue = item.minStock || 10;
      if (item.currentStock === 0) {
        outOfStockCount++;
        needsRestockCount++;
      } else if (item.currentStock > 0 && item.currentStock <= minStockValue) {
        lowStockCount++;
        needsRestockCount++;
      }
    }
    
    // Get recent restocks
    const recentRestocks = await InventoryItem.aggregate([
      { $unwind: "$restockHistory" },
      { $sort: { "restockHistory.date": -1 } },
      { $limit: 5 },
      { $project: {
        itemName: 1,
        quantity: "$restockHistory.quantity",
        price: "$restockHistory.price",
        notes: "$restockHistory.notes",
        date: "$restockHistory.date"
      }}
    ]);
    
    res.json({
      success: true,
      data: {
        totalItems,
        lowStockCount,
        outOfStockCount,
        needsRestockCount,
        recentRestocks
      }
    });
  } catch (error) {
    console.error('Inventory stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get items that need restocking
app.get("/api/inventory/needs-restock", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const items = await InventoryItem.find({
      $or: [
        { currentStock: 0 },
        { 
          $expr: { 
            $lte: ["$currentStock", { $ifNull: ["$minStock", 10] }]
          }
        }
      ],
      isActive: true
    }).sort({ currentStock: 1 });
    
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Error fetching items needing restock:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ========== END INVENTORY ROUTES ==========

// ========== LOW STOCK ROUTES ==========

// Get low stock items
app.get("/api/products/low-stock", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const lowStockItems = await Product.find({
      stock: { $lt: LOW_STOCK_THRESHOLD, $gte: 0 }
    })
    .populate('category', 'name')
    .sort({ stock: 1 })
    .lean();
    
    res.json({ 
      success: true, 
      data: lowStockItems,
      count: lowStockItems.length,
      threshold: LOW_STOCK_THRESHOLD
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get critical stock items (very low stock)
app.get("/api/products/critical-stock", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const criticalStockItems = await Product.find({
      stock: { $lt: 5, $gte: 0 }
    })
    .populate('category', 'name')
    .sort({ stock: 1 })
    .lean();
    
    res.json({ 
      success: true, 
      data: criticalStockItems,
      count: criticalStockItems.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ========== END LOW STOCK ROUTES ==========

const pages = ["login", "register", "order"];
pages.forEach(page => {
  app.get(`/${page.toLowerCase()}`, (req, res) => res.render(page));
});

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.post("/register", async (req, res) => {
  try {
    const referer = req.headers.referer || req.headers.referrer;
    if (!referer || !referer.includes('/admindashboard/addstaff')) {
      return res.status(403).json({ 
        message: "Access denied. Use admin dashboard to register staff." 
      });
    }

    const { user, pass, role } = req.body;
    
    if (!user || !pass) {
      return res.status(400).json({  
        message: "Username and password are required" 
      });
    }

    const existingUser = await User.findOne({ username: user });
    if (existingUser) {
      return res.status(409).json({ 
        message: "User already exists" 
      });
    }

    const hashedPassword = bcrypt.hashSync(pass, 10);
    const newUser = new User({ 
      username: user, 
      password: hashedPassword, 
      role: role || "staff",
      status: "active"
    });

    await newUser.save(); 
    
    res.status(201).json({  
      message: "Staff account created successfully" 
    });
  } catch (err) {
    res.status(500).json({ 
      message: "Server error" 
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { user, pass } = req.body;

    const existingUser = await User.findOne({ username: user });
    if (!existingUser) {
      return res.render("login", {
        error: "User not found"
      });
    }

    if (existingUser.status === "inactive") {
      return res.render("login", {
        error: "Account is deactivated"
      });
    }

    const isMatch = bcrypt.compareSync(pass, existingUser.password);
    if (!isMatch) {
      return res.render("login", {
        error: "Invalid password"
      });
    }

    const token = jwt.sign(
      { 
        id: existingUser._id, 
        username: existingUser.username, 
        role: existingUser.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24 * 365
    });

    if (existingUser.role === "admin") {
      return res.redirect("/admindashboard");
    } else {
      return res.redirect("/staffdashboard");
    }

  } catch (err) {
    res.render("login", {
      error: "Login error"
    });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    
    if (!orderData.items || !orderData.items.length) {
      return res.status(400).json({ 
        success: false, 
        message: "No items in order" 
      });
    }
    
    if (!orderData.total || orderData.total <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Total amount is required and must be greater than 0" 
      });
    }
    
    if (!orderData.payment || !orderData.payment.amountPaid) {
      return res.status(400).json({ 
        success: false, 
        message: "Payment amount is required" 
      });
    }
    
    const amountPaid = orderData.payment.amountPaid || 0;
    const total = orderData.total || 0;
    const change = amountPaid - total;
    
    if (change < 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Insufficient payment amount" 
      });
    }
    
    if (!orderData.type) {
      orderData.type = "Dine In";
    }
    
    const paymentMethod = orderData.payment?.method || "cash";
    
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const orderCount = await Order.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      }
    });
    const orderNumber = `ORD-${dateStr}-${(orderCount + 1).toString().padStart(3, '0')}`;
    
    const customerId = orderData.sessionId ? 
      new mongoose.Types.ObjectId(orderData.sessionId) : 
      null;
    
    const order = new Order({
      orderNumber,
      items: orderData.items.map(item => ({
        name: item.name || "Unknown Item",
        price: item.price || 0,
        quantity: item.quantity || 1,
        size: item.size || "Regular",
        image: item.image || 'default_food.jpg',
        productId: item.id || null
      })),
      subtotal: orderData.subtotal || 0,
      tax: orderData.tax || 0,
      total: orderData.total,
      payment: {
        method: paymentMethod,
        amountPaid: amountPaid,
        change: change,
        status: "completed"
      },
      type: orderData.type,
      status: "completed",
      notes: orderData.notes || "",
      customerId: customerId
    });
    
    const savedOrder = await order.save();
    
    sendOrderNotification(savedOrder);
    
    // Update stock and check for low stock alerts
    try {
      for (const item of orderData.items) {
        if (item.id) {
          const product = await Product.findById(item.id);
          if (product && product.stock !== undefined) {
            const newStock = Math.max(0, product.stock - (item.quantity || 1));
            const updatedProduct = await Product.findByIdAndUpdate(
              item.id, 
              { stock: newStock },
              { new: true }
            );
            
            // Check if stock is now low
            if (updatedProduct && newStock < LOW_STOCK_THRESHOLD) {
              sendLowStockAlert(updatedProduct);
            }
          }
        }
      }
    } catch (stockError) {
      console.error('Stock update error:', stockError);
    }
    
    res.json({ 
      success: true, 
      orderId: savedOrder._id,
      orderNumber: savedOrder.orderNumber,
      message: "Payment and order processed successfully",
      change: change
    });
    
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to save order to database"
    });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const ordersToday = await Order.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });
    
    const customerStats = await Order.aggregate([
      { 
        $match: { 
          customerId: { $ne: null, $exists: true } 
        } 
      },
      { 
        $group: { 
          _id: "$customerId" 
        } 
      },
      { 
        $count: "total" 
      }
    ]);
    
    const ordersWithoutCustomerId = await Order.countDocuments({
      $or: [
        { customerId: null },
        { customerId: { $exists: false } }
      ]
    });
    
    const totalCustomers = (customerStats[0]?.total || 0) + ordersWithoutCustomerId;
    
    const totalRevenueResult = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    
    const totalRevenue = totalRevenueResult[0]?.total || 0;
    
    const paymentStats = await Order.aggregate([
      { $group: { _id: "$payment.method", count: { $sum: 1 } } }
    ]);
    
    const paymentStatsObj = {
      cash: 0,
      wallet: 0
    };
    
    paymentStats.forEach(stat => {
      if (stat._id && (stat._id === "cash" || stat._id === "wallet")) {
        paymentStatsObj[stat._id] = stat.count;
      }
    });
    
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    // Get low stock count
    const lowStockCount = await Product.countDocuments({
      stock: { $lt: LOW_STOCK_THRESHOLD, $gte: 0 }
    });
    
    // Get out of stock count
    const outOfStockCount = await Product.countDocuments({
      stock: 0
    });
    
    res.json({
      totalOrders,
      ordersToday,
      totalCustomers,
      totalRevenue,
      paymentStats: paymentStatsObj,
      recentOrders,
      lowStockCount,
      outOfStockCount
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

app.get("/api/menu", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { category, search, status } = req.query;
    let query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const items = await MenuItem.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

app.get("/api/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Menu item not found' 
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

app.post("/api/menu", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, price, category } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide name, price, and category' 
      });
    }

    const existingItem = await MenuItem.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (existingItem) {
      return res.status(400).json({ 
        success: false, 
        message: 'Menu item with this name already exists' 
      });
    }

    const newItem = new MenuItem({
      name,
      price: parseFloat(price),
      category,
      status: 'available'
    });

    await newItem.save();

    res.status(201).json({ 
      success: true, 
      message: 'Menu item added successfully',
      data: newItem
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

app.put("/api/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, price, category, status } = req.body;

    const updatedItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { 
        name, 
        price: parseFloat(price), 
        category,
        status,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Menu item not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Menu item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

app.delete("/api/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deletedItem = await MenuItem.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Menu item not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Menu item deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

app.get("/api/menu/categories/all", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const categories = [
      'Rice Meals',
      'Sizzling',
      'Drinks',
      'Party Tray',
      'Coffee',
      'Milk Tea',
      'Snacks',
      'Budget Meal',
      'Desserts',
      'Specialities',
      'Frape'
    ];
    
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

app.get("/api/all-products", async (req, res) => {
  try {
    const products = await Product.find()
      .populate('category', 'name')
      .lean();
    
    const formattedProducts = products.map(product => ({
      id: product._id,
      name: product.name,
      price: product.price,
      category: product.category ? product.category.name : 'Uncategorized',
      stock: product.stock || 0,
      image: product.image || 'default_food.jpg',
      isLowStock: (product.stock || 0) < LOW_STOCK_THRESHOLD && (product.stock || 0) > 0,
      isOutOfStock: (product.stock || 0) === 0
    }));
    
    res.json(formattedProducts);
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});

app.post('/api/products/:id/image', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body;
    
    const product = await Product.findByIdAndUpdate(
      id,
      { image },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});

app.get("/admindashboard", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const products = await Product.find({}, "stock").lean();
    const totalStocks = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalOrders = await Order.countDocuments();
    
    const customerStats = await Order.aggregate([
      { 
        $match: { 
          customerId: { $ne: null, $exists: true } 
        } 
      },
      { 
        $group: { 
          _id: "$customerId" 
        } 
      },
      { 
        $count: "total" 
      }
    ]);
    
    const ordersWithoutCustomerId = await Order.countDocuments({
      $or: [
        { customerId: null },
        { customerId: { $exists: false } }
      ]
    });
    
    const totalCustomers = (customerStats[0]?.total || 0) + ordersWithoutCustomerId;

    // Get inventory stats
    const totalInventoryItems = await InventoryItem.countDocuments();
    const inventoryLowStock = await InventoryItem.countDocuments({
      currentStock: { $gt: 0, $lte: { $ifNull: ["$minStock", 10] } },
      isActive: true
    });
    const inventoryOutOfStock = await InventoryItem.countDocuments({
      currentStock: 0,
      isActive: true
    });

    res.render("admindashboard", { 
      user: req.user, 
      stats: { 
        totalProducts, 
        totalStocks, 
        totalOrders, 
        totalCustomers,
        totalInventoryItems,
        inventoryLowStock,
        inventoryOutOfStock
      } 
    });
  } catch (err) {
    res.render("admindashboard", { 
      user: req.user, 
      stats: { 
        totalProducts: 0, 
        totalStocks: 0, 
        totalOrders: 0, 
        totalCustomers: 0,
        totalInventoryItems: 0,
        inventoryLowStock: 0,
        inventoryOutOfStock: 0
      } 
    });
  }
});

app.get("/admindashboard/dashboard", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    
    const customerStats = await Order.aggregate([
      { 
        $match: { 
          customerId: { $ne: null, $exists: true } 
        } 
      },
      { 
        $group: { 
          _id: "$customerId" 
        } 
      },
      { 
        $count: "total" 
      }
    ]);
    
    const ordersWithoutCustomerId = await Order.countDocuments({
      $or: [
        { customerId: null },
        { customerId: { $exists: false } }
      ]
    });
    
    const totalCustomers = (customerStats[0]?.total || 0) + ordersWithoutCustomerId;
    
    const totalRevenueResult = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;
    
    // Get inventory stats
    const totalInventoryItems = await InventoryItem.countDocuments();
    const inventoryLowStock = await InventoryItem.countDocuments({
      currentStock: { $gt: 0, $lte: { $ifNull: ["$minStock", 10] } },
      isActive: true
    });
    const inventoryOutOfStock = await InventoryItem.countDocuments({
      currentStock: 0,
      isActive: true
    });

    res.render("dashboard", { 
      stats: { 
        totalOrders, 
        totalProducts, 
        totalCustomers,
        totalRevenue,
        totalInventoryItems,
        inventoryLowStock,
        inventoryOutOfStock
      } 
    });
  } catch (err) {
    res.render("dashboard", { 
      stats: { 
        totalOrders: 0, 
        totalProducts: 0, 
        totalCustomers: 0,
        totalRevenue: 0,
        totalInventoryItems: 0,
        inventoryLowStock: 0,
        inventoryOutOfStock: 0
      } 
    });
  }
});

app.get("/admindashboard/inventory", verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Get inventory stats for the inventory dashboard
    const totalItems = await InventoryItem.countDocuments();
    const lowStockCount = await InventoryItem.countDocuments({
      currentStock: { $gt: 0, $lte: { $ifNull: ["$minStock", 10] } },
      isActive: true
    });
    const outOfStockCount = await InventoryItem.countDocuments({
      currentStock: 0,
      isActive: true
    });
    
    res.render("Inventory", {
      stats: {
        totalItems,
        lowStockCount,
        outOfStockCount
      }
    });
  } catch (error) {
    res.render("Inventory", {
      stats: {
        totalItems: 0,
        lowStockCount: 0,
        outOfStockCount: 0
      }
    });
  }
});

app.get("/admindashboard/addstaff", verifyToken, verifyAdmin, (req, res) => {
  res.render("addstaff");
});

app.get("/admindashboard/salesandreports", verifyToken, verifyAdmin, (req, res) => {
  res.render("salesandreports", {
    title: "Sales & Reports"
  });
});

app.get("/admindashboard/infosettings", verifyToken, verifyAdmin, (req, res) => {
  res.render("infosettings");
});

app.get("/admindashboard/orderhistory", verifyToken, verifyAdmin, (req, res) => {
  res.render("orderhistory");
});

app.get("/admindashboard/menumanagement", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const menuItems = await MenuItem.find().sort({ createdAt: -1 }).limit(50);
    
    res.render("menumanagement", {
      user: req.user,
      initialMenuItems: menuItems
    });
  } catch (error) {
    res.render("menumanagement", {
      user: req.user,
      initialMenuItems: []
    });
  }
});

// Stock management dashboard
app.get("/admindashboard/stock", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const lowStockItems = await Product.find({
      stock: { $lt: LOW_STOCK_THRESHOLD, $gte: 1 }
    })
    .populate('category', 'name')
    .sort({ stock: 1 })
    .lean();
    
    const outOfStockItems = await Product.find({
      stock: 0
    })
    .populate('category', 'name')
    .sort({ name: 1 })
    .lean();
    
    res.render("stock", {
      user: req.user,
      lowStockItems,
      outOfStockItems,
      lowStockThreshold: LOW_STOCK_THRESHOLD
    });
  } catch (error) {
    res.render("stock", {
      user: req.user,
      lowStockItems: [],
      outOfStockItems: [],
      lowStockThreshold: LOW_STOCK_THRESHOLD
    });
  }
});

app.get("/staffdashboard", verifyToken, async (req, res, next) => {
  try {
    if (req.user.role !== "staff") return res.redirect("/admindashboard");

    const products = await Product.find().populate("category", "name").lean();

    const categories = [
      ...new Set(products.map(p => (p.category && p.category.name) ? p.category.name : "Uncategorized"))
    ];

    // Mark low stock products
    const productsWithStockStatus = products.map(product => ({
      ...product,
      isLowStock: (product.stock || 0) < LOW_STOCK_THRESHOLD && (product.stock || 0) > 0,
      isOutOfStock: (product.stock || 0) === 0
    }));

    res.render("staffdashboard", {
      user: req.user,
      products: productsWithStockStatus,
      categories
    });
  } catch (err) {
    next(err);
  }
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.post("/printreceipt", async (req, res, next) => {
  try {
    const { cart, orderType, payment } = req.body;
    if (!cart || !cart.length) return res.status(400).json({ error: "Empty cart" });

    const receiptData = {
      receiptId: Date.now(),
      cart,
      orderType,
      payment,
      subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      tax: 0,
      total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      date: new Date().toLocaleString()
    };
    
    res.json(receiptData);
  } catch (err) {
    next(err);
  }
});

app.get("/api/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const search = req.query.search || "";
    const query = search
      ? { username: { $regex: search, $options: "i" } }
      : {};

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const updateData = { username, role };

    if (password && password.trim() !== "") {
      updateData.password = bcrypt.hashSync(password, 10);
    }

    if (username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: req.params.id },
      });
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/users/:id/status", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      message: `User ${status === "active" ? "activated" : "deactivated"} successfully`,
      user,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/users/create", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      role: role || "staff",
      status: "active",
    });

    await newUser.save();

    const userData = newUser.toObject();
    delete userData.password;

    res.status(201).json({
      message: "User created successfully",
      user: userData,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/orders", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product stock endpoint
app.put("/api/products/:id/stock", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { stock } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stock: parseInt(stock) },
      { new: true }
    ).populate('category', 'name');
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if stock is low and send alert
    if (product.stock < LOW_STOCK_THRESHOLD) {
      sendLowStockAlert(product);
    }
    
    res.json({ 
      success: true, 
      product,
      isLowStock: product.stock < LOW_STOCK_THRESHOLD
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// Bulk update product stocks
app.post("/api/products/bulk-stock-update", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates array is required' });
    }
    
    const results = [];
    
    for (const update of updates) {
      if (update.productId && update.stock !== undefined) {
        const product = await Product.findByIdAndUpdate(
          update.productId,
          { stock: parseInt(update.stock) },
          { new: true }
        );
        
        if (product) {
          results.push({
            productId: update.productId,
            success: true,
            stock: product.stock,
            isLowStock: product.stock < LOW_STOCK_THRESHOLD
          });
          
          // Check if stock is low and send alert
          if (product.stock < LOW_STOCK_THRESHOLD) {
            sendLowStockAlert(product);
          }
        } else {
          results.push({
            productId: update.productId,
            success: false,
            error: 'Product not found'
          });
        }
      }
    }
    
    res.json({ 
      success: true, 
      results,
      message: `Updated ${results.filter(r => r.success).length} products`
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});

app.use((req, res) => {
  if (req.accepts('html')) {
    res.redirect('/login');
  } else if (req.accepts('json')) {
    res.status(404).json({ error: 'Not found' });
  } else {
    res.status(404).type('txt').send('Not found');
  }
});

app.use((err, req, res, next) => {
  if (req.accepts('html')) {
    res.redirect('/login');
  } else if (req.accepts('json')) {
    res.status(500).json({ error: 'Server error' });
  } else {
    res.status(500).type('txt').send('Server error');
  }
});

const PORT = process.env.PORT || 5050;

const server = app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Low stock threshold set to: ${LOW_STOCK_THRESHOLD}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port.`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});