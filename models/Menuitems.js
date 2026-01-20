import mongoose from 'mongoose';

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
        ]
    },
    status: {
        type: String,
        enum: ['available', 'unavailable'],
        default: 'available'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
menuItemSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.model('MenuItem', menuItemSchema);