import mongoose from 'mongoose';

// Inventory Schema with ONLY the 5 requested fields PLUS stock fields
const inventorySchema = new mongoose.Schema({
    itemName: { 
        type: String, 
        required: [true, 'Item name is required'],
        trim: true,
        minlength: [2, 'Item name must be at least 2 characters long']
    },
    itemType: { 
        type: String, 
        required: [true, 'Item type is required'],
        enum: {
            values: ['raw', 'finished'],
            message: 'Item type must be either "raw" or "finished"'
        }
    },
    category: { 
        type: String, 
        required: [true, 'Category is required'],
        trim: true,
        minlength: [2, 'Category must be at least 2 characters long']
    },
    message: { 
        type: String,
        trim: true,
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
    unit: { 
        type: Number, 
        default: 1,
        min: [1, 'Unit must be at least 1'],
        validate: {
            validator: Number.isInteger,
            message: 'Unit must be a whole number'
        }
    },
    // ADD THESE REQUIRED FIELDS FOR LOW/OUT OF STOCK TO WORK:
    currentStock: { 
        type: Number, 
        default: 0,
        min: [0, 'Current stock cannot be negative']
    },
    minStock: { 
        type: Number, 
        default: 10,
        min: [0, 'Minimum stock cannot be negative']
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    restockHistory: [{
        date: { 
            type: Date, 
            default: Date.now 
        },
        quantity: { 
            type: Number, 
            required: [true, 'Restock quantity is required'],
            min: [0.01, 'Restock quantity must be greater than 0']
        },
        price: { 
            type: Number, 
            default: 0,
            min: [0, 'Price cannot be negative']
        },
        notes: { 
            type: String,
            trim: true,
            maxlength: [200, 'Notes cannot exceed 200 characters']
        },
        addedBy: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        }
    }]
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual property to check if item is low on stock
inventorySchema.virtual('isLowStock').get(function() {
    return this.currentStock > 0 && this.currentStock <= (this.minStock || 10);
});

// Virtual property to check if item is out of stock
inventorySchema.virtual('isOutOfStock').get(function() {
    return this.currentStock <= 0;
});

// Virtual property to check if item needs restocking
inventorySchema.virtual('needsRestock').get(function() {
    return this.isLowStock || this.isOutOfStock;
});

// Method to get stock status text
inventorySchema.methods.getStockStatus = function() {
    const minStockValue = this.minStock || 10;
    
    if (this.currentStock <= 0) {
        return { status: 'Out of Stock', class: 'out' };
    } else if (this.currentStock <= minStockValue) {
        return { status: 'Low Stock', class: 'low' };
    } else {
        return { status: 'In Stock', class: 'in' };
    }
};

// Indexes for better query performance
inventorySchema.index({ itemName: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ itemType: 1 });
inventorySchema.index({ isActive: 1 });
inventorySchema.index({ currentStock: 1 });
inventorySchema.index({ 'restockHistory.date': -1 });

// Middleware to validate before saving
inventorySchema.pre('save', function() {
    // Ensure unit is a whole number
    if (this.unit) {
        this.unit = Math.round(this.unit);
    }
    
    // If currentStock is negative, set to 0
    if (this.currentStock < 0) {
        this.currentStock = 0;
    }
    
    // If minStock is negative, set to 0
    if (this.minStock < 0) {
        this.minStock = 0;
    }
});

// Static method to get low stock items
inventorySchema.statics.getLowStockItems = function() {
    return this.find({
        $expr: { 
            $and: [
                { $gt: ['$currentStock', 0] },
                { $lte: ['$currentStock', { $ifNull: ['$minStock', 10] }] }
            ]
        },
        isActive: true
    });
};

// Static method to get out of stock items
inventorySchema.statics.getOutOfStockItems = function() {
    return this.find({
        currentStock: { $lte: 0 },
        isActive: true
    });
};

// Static method to get items needing restock
inventorySchema.statics.getItemsNeedingRestock = function() {
    return this.find({
        $or: [
            { currentStock: { $lte: 0 } },
            { 
                $expr: { 
                    $lte: ['$currentStock', { $ifNull: ['$minStock', 10] }]
                }
            }
        ],
        isActive: true
    }).sort({ currentStock: 1 });
};

const InventoryItem = mongoose.model('InventoryItem', inventorySchema);

export default InventoryItem;