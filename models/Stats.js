import mongoose from "mongoose";    

// Stats Schema
const StatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    default: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
  },
  
  totalOrders: {
    type: Number,
    default: 0
  },
  ordersToday: {
    type: Number,
    default: 0
  },
  
  itemsSold: {
    type: Number,
    default: 0
  },
  itemsSoldToday: {
    type: Number,
    default: 0
  },
  
  dineInOrders: {
    type: Number,
    default: 0
  },
  takeoutOrders: {
    type: Number,
    default: 0
  },
  
  paymentStats: {
    cash: { type: Number, default: 0 },
    gcash: { type: Number, default: 0 }
  },
  
  categoryStats: {
    Rice: { type: Number, default: 0 },
    Sizzling: { type: Number, default: 0 },
    Party: { type: Number, default: 0 },
    Drink: { type: Number, default: 0 },
    Cafe: { type: Number, default: 0 },
    Milk: { type: Number, default: 0 },
    Frappe: { type: Number, default: 0 }
  },
  
  topProducts: [{
    name: String,
    quantity: Number,
  }],
  
  // Inventory Statistics
  inventoryStats: {
    totalItems: { type: Number, default: 0 },
    lowStockItems: { type: Number, default: 0 },
    outOfStockItems: { type: Number, default: 0 },
    totalInventoryValue: { type: Number, default: 0 },
    itemsAddedToday: { type: Number, default: 0 },
    itemsRestockedToday: { type: Number, default: 0 },
    totalRestockCost: { type: Number, default: 0 }
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update statistics including inventory data
StatsSchema.statics.updateStats = async function(orderData, inventoryUpdate = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let stats = await this.findOne({ date: today });
  
  if (!stats) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStats = await this.findOne({ date: yesterday });
    
    stats = new this({
      date: today,
      totalOrders: yesterdayStats ? yesterdayStats.totalOrders : 0,
      itemsSold: yesterdayStats ? yesterdayStats.itemsSold : 0,
      dineInOrders: yesterdayStats ? yesterdayStats.dineInOrders : 0,
      takeoutOrders: yesterdayStats ? yesterdayStats.takeoutOrders : 0,
      paymentStats: yesterdayStats ? yesterdayStats.paymentStats : {
        cash: 0, gcash: 0
      },
      categoryStats: yesterdayStats ? yesterdayStats.categoryStats : {
        Rice: 0, Sizzling: 0, Party: 0, Drink: 0, 
        Cafe: 0, Milk: 0, Frappe: 0
      },
      inventoryStats: yesterdayStats ? yesterdayStats.inventoryStats : {
        totalItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalInventoryValue: 0,
        itemsAddedToday: 0,
        itemsRestockedToday: 0,
        totalRestockCost: 0
      }
    });
  }
  
  // Update order statistics
  stats.totalOrders += 1;
  stats.ordersToday += 1;
  
  const itemsInOrder = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
  stats.itemsSold += itemsInOrder;
  stats.itemsSoldToday += itemsInOrder;
  
  if (orderData.type === 'Dine In') {
    stats.dineInOrders += 1;
  } else if (orderData.type === 'Take Out') {
    stats.takeoutOrders += 1;
  }
  
  const paymentMethod = orderData.payment?.method || 'cash';
  if (stats.paymentStats[paymentMethod] !== undefined) {
    stats.paymentStats[paymentMethod] += 1;
  }
  
  // Update category statistics
  orderData.items.forEach(item => {
    const itemName = item.name.toLowerCase();
    if (itemName.includes('bulgogi') || itemName.includes('lechon') || 
        itemName.includes('chicken') || itemName.includes('adobo') || 
        itemName.includes('shanghai') || itemName.includes('fish') || 
        itemName.includes('dory') || itemName.includes('pork')) {
      stats.categoryStats.Rice += item.quantity;
    } else if (itemName.includes('sizzling') || itemName.includes('sisig') || 
               itemName.includes('liempo') || itemName.includes('porkchop')) {
      stats.categoryStats.Sizzling += item.quantity;
    } else if (itemName.includes('pancit') || itemName.includes('spaghetti') || 
               itemName.includes('party')) {
      stats.categoryStats.Party += item.quantity;
    } else if (itemName.includes('lemonade') || itemName.includes('soda') || 
               itemName.includes('red tea') && !itemName.includes('milk')) {
      stats.categoryStats.Drink += item.quantity;
    } else if (itemName.includes('cafe') || itemName.includes('americano') || 
               itemName.includes('latte') || itemName.includes('macchiato') || 
               itemName.includes('coffee')) {
      stats.categoryStats.Cafe += item.quantity;
    } else if (itemName.includes('milk tea') || itemName.includes('matcha green tea')) {
      stats.categoryStats.Milk += item.quantity;
    } else if (itemName.includes('frappe') || itemName.includes('cookies & cream')) {
      stats.categoryStats.Frappe += item.quantity;
    }
  });
  
  // Update top products
  orderData.items.forEach(item => {
    const existingProduct = stats.topProducts.find(p => p.name === item.name);
    if (existingProduct) {
      existingProduct.quantity += item.quantity;
    } else {
      stats.topProducts.push({
        name: item.name,
        quantity: item.quantity,
      });
    }
  });
  
  stats.topProducts.sort((a, b) => b.quantity - a.quantity);
  stats.topProducts = stats.topProducts.slice(0, 10);
  
  // Update inventory statistics if provided
  if (inventoryUpdate) {
    if (inventoryUpdate.type === 'add') {
      stats.inventoryStats.itemsAddedToday += 1;
    } else if (inventoryUpdate.type === 'restock') {
      stats.inventoryStats.itemsRestockedToday += 1;
      stats.inventoryStats.totalRestockCost += inventoryUpdate.cost || 0;
    }
  }
  
  stats.lastUpdated = new Date();
  await stats.save();
  
  return stats;
};

// Update inventory statistics
StatsSchema.statics.updateInventoryStats = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let stats = await this.findOne({ date: today });
  
  if (!stats) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStats = await this.findOne({ date: yesterday });
    
    stats = new this({
      date: today,
      totalOrders: yesterdayStats ? yesterdayStats.totalOrders : 0,
      itemsSold: yesterdayStats ? yesterdayStats.itemsSold : 0,
      dineInOrders: yesterdayStats ? yesterdayStats.dineInOrders : 0,
      takeoutOrders: yesterdayStats ? yesterdayStats.takeoutOrders : 0,
      paymentStats: yesterdayStats ? yesterdayStats.paymentStats : {
        cash: 0, gcash: 0
      },
      categoryStats: yesterdayStats ? yesterdayStats.categoryStats : {
        Rice: 0, Sizzling: 0, Party: 0, Drink: 0, 
        Cafe: 0, Milk: 0, Frappe: 0
      },
      inventoryStats: {
        totalItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalInventoryValue: 0,
        itemsAddedToday: 0,
        itemsRestockedToday: 0,
        totalRestockCost: 0
      }
    });
  }
  
  // Get current inventory statistics
  const inventoryItems = await InventoryItem.find();
  
  let lowStock = 0;
  let outOfStock = 0;
  let totalValue = 0;
  
  inventoryItems.forEach(item => {
    if (item.status === "low" || item.status === "critical") {
      lowStock++;
    }
    if (item.status === "out") {
      outOfStock++;
    }
    if (item.price && item.currentStock) {
      totalValue += item.currentStock * item.price;
    }
  });
  
  stats.inventoryStats.totalItems = inventoryItems.length;
  stats.inventoryStats.lowStockItems = lowStock;
  stats.inventoryStats.outOfStockItems = outOfStock;
  stats.inventoryStats.totalInventoryValue = totalValue;
  
  stats.lastUpdated = new Date();
  await stats.save();
  
  return stats;
};

StatsSchema.statics.getDashboardStats = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const stats = await this.findOne({ date: today });
  
  if (!stats) {
    // Get inventory statistics if no stats exist
    const inventoryItems = await InventoryItem.find();
    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;
    
    inventoryItems.forEach(item => {
      if (item.status === "low" || item.status === "critical") {
        lowStock++;
      }
      if (item.status === "out") {
        outOfStock++;
      }
      if (item.price && item.currentStock) {
        totalValue += item.currentStock * item.price;
      }
    });
    
    return {
      totalOrders: 0,
      totalProducts: 0,
      totalStocks: 0,
      ordersToday: 0,
      itemsSoldToday: 0,
      dineInToday: 0,
      takeoutToday: 0,
      paymentStats: {
        cash: 0, gcash: 0
      },
      categoryStats: {
        Rice: 0, Sizzling: 0, Party: 0, Drink: 0, 
        Cafe: 0, Milk: 0, Frappe: 0
      },
      topProducts: [],
      inventoryStats: {
        totalItems: inventoryItems.length,
        lowStockItems: lowStock,
        outOfStockItems: outOfStock,
        totalInventoryValue: totalValue,
        itemsAddedToday: 0,
        itemsRestockedToday: 0,
        totalRestockCost: 0
      }
    };
  }
  
  const uniqueProducts = stats.topProducts.length;
  
  return {
    totalOrders: stats.totalOrders,
    totalProducts: uniqueProducts,
    totalStocks: stats.itemsSold,
    ordersToday: stats.ordersToday,
    itemsSoldToday: stats.itemsSoldToday,
    dineInToday: stats.dineInOrders,
    takeoutToday: stats.takeoutOrders,
    paymentStats: stats.paymentStats,
    categoryStats: stats.categoryStats,
    topProducts: stats.topProducts,
    inventoryStats: stats.inventoryStats
  };
};

export const Stats = mongoose.models.Stats || mongoose.model("Stats", StatsSchema);
export default Stats;