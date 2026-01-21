// Inventory Management System - Complete JavaScript
// File: /public/script/inventory.js

// Global variables
let allInventoryItems = [];
let currentFilter = 'all';
let currentSection = 'inventory';
let currentCategory = 'all';
let debounceTimer;
let isModalOpen = false;

// DOM Elements Cache
const elements = {
    loadingOverlay: document.getElementById('loadingOverlay'),
    toastContainer: document.getElementById('toastContainer'),
    searchInput: document.querySelector('.search'),
    inventoryGrid: document.getElementById('inventoryGrid'),
    dashboardGrid: document.getElementById('dashboardGrid'),
    restockGrid: document.getElementById('restockGrid'),
    totalItems: document.getElementById('totalItems'),
    lowStock: document.getElementById('lowStock'),
    outOfStock: document.getElementById('outOfStock'),
    
    // Modals
    itemModal: document.getElementById('itemModal'),
    restockModal: document.getElementById('restockModal'),
    deleteModal: document.getElementById('deleteModal'),
    
    // Modal elements
    modalTitle: document.getElementById('modalTitle'),
    itemForm: document.getElementById('itemForm'),
    itemId: document.getElementById('itemId'),
    itemName: document.getElementById('itemName'),
    itemType: document.getElementById('itemType'),
    itemCategory: document.getElementById('itemCategory'),
    itemUnit: document.getElementById('itemUnit'), // Unit field
    description: document.getElementById('description'),
    deleteItemName: document.getElementById('deleteItemName'),
    
    // Restock modal elements
    restockItemName: document.getElementById('restockItemName'),
    restockCurrentStock: document.getElementById('restockCurrentStock'),
    restockQuantity: document.getElementById('restockQuantity'),
    restockUnit: document.getElementById('restockUnit'),
    restockPrice: document.getElementById('restockPrice'),
    restockTotalCost: document.getElementById('restockTotalCost'),
    restockNotes: document.getElementById('restockNotes'),
    restockItemId: document.getElementById('restockItemId'),
    
    // Buttons
    saveItemBtn: document.getElementById('saveItemBtn'),
    addNewItem: document.getElementById('addNewItem'),
    quickAdd: document.getElementById('quickAdd'),
    viewAllItems: document.getElementById('viewAllItems'),
    refreshDashboard: document.getElementById('refreshDashboard'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    confirmRestockBtn: document.getElementById('confirmRestockBtn'),
    
    // Close buttons
    closeModal: document.getElementById('closeModal'),
    closeRestockModal: document.getElementById('closeRestockModal'),
    closeDeleteModal: document.getElementById('closeDeleteModal'),
    
    // Cancel buttons
    cancelBtn: document.getElementById('cancelBtn'),
    cancelRestockBtn: document.getElementById('cancelRestockBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    
    // Navigation
    navLinks: document.querySelectorAll('.nav-link'),
    categoryItems: document.querySelectorAll('.category-item'),
    typeButtons: document.querySelectorAll('.type-btn'),  // ← ADDED COMMA HERE
    
    // Stock fields
    currentStock: document.getElementById('currentStock'),
    minStock: document.getElementById('minStock')
};

// ==================== UTILITY FUNCTIONS ====================

function showLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.style.display = 'none';
    }
}

function showToast(message, type = 'success') {
    if (!elements.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

function debounceSearch(value) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        filterItems(value);
    }, 300);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to get stock status for an item - FIXED VERSION
function getItemStockStatus(item) {
    // Get stock values with defaults
    const currentStock = parseFloat(item.currentStock) || 0;
    const minStock = parseFloat(item.minStock) || 10;
    const unit = item.unit || 1;
    
    // Check if this item has any restock history
    const hasRestockHistory = item.restockHistory && item.restockHistory.length > 0;
    
    // SIMPLIFIED LOGIC - JUST CHECK THE STOCK NUMBERS
    let stockStatus = '';
    let stockClass = '';
    let statusText = '';
    let needsRestock = false;
    
    // First, check if it's completely out of stock
    if (currentStock <= 0) {
        stockStatus = 'Out of Stock';
        stockClass = 'out';
        statusText = 'Out of Stock';
        needsRestock = true;
    } 
    // Then check if it's low stock (more than 0 but less than or equal to min stock)
    else if (currentStock > 0 && currentStock <= minStock) {
        stockStatus = 'Low Stock';
        stockClass = 'low';
        statusText = 'Low Stock';
        needsRestock = true;
    }
    // Otherwise it's in stock
    else {
        stockStatus = 'In Stock';
        stockClass = 'in';
        statusText = 'In Stock';
        needsRestock = false;
    }
    
    // For display purposes only, we can check if it's a new item that was never stocked
    const isNewItem = (currentStock === 0 && !hasRestockHistory);
    
    return {
        currentStock,
        minStock,
        unit,
        stockStatus,
        stockClass,
        statusText,
        needsRestock,
        hasRestockHistory,
        isNewItem
    };
}

// ==================== API FUNCTIONS ====================

async function fetchInventoryItems() {
    try {
        showLoading();
        const response = await fetch('/api/inventory', {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            allInventoryItems = data.data;
            updateUI();
            updateCategoryCounts();
            return data.data;
        } else {
            throw new Error(data.message || 'Failed to fetch items');
        }
    } catch (error) {
        console.error('Error fetching inventory:', error);
        showToast('Failed to load inventory items. Please try again.', 'error');
        return [];
    } finally {
        hideLoading();
    }
}

async function fetchCategories() {
    try {
        const response = await fetch('/api/inventory/categories', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                updateCategoryFilters(data.data);
            }
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

async function fetchFilteredItems(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.itemType && filters.itemType !== 'all') {
            params.append('itemType', filters.itemType);
        }
        if (filters.category && filters.category !== 'all') {
            params.append('category', filters.category);
        }
        if (filters.search) {
            params.append('search', filters.search);
        }
        
        const url = `/api/inventory/filter/search?${params.toString()}`;
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                return data.data;
            }
        }
        return [];
    } catch (error) {
        console.error('Error fetching filtered items:', error);
        return [];
    }
}

async function saveInventoryItem(itemData, isEdit = false) {
    try {
        showLoading();
        
        // Validate required fields
        if (!itemData.itemName || !itemData.itemType || !itemData.category) {
            throw new Error('Please fill in all required fields');
        }
        
        // Ensure stock values are numbers
        const currentStock = parseFloat(itemData.currentStock) || 0;
        const minStock = parseFloat(itemData.minStock) || 10;
        const unit = parseInt(itemData.unit) || 1;
        
        const url = isEdit ? `/api/inventory/${itemData._id}` : '/api/inventory';
        const method = isEdit ? 'PUT' : 'POST';
        
        const payload = {
            itemName: itemData.itemName.trim(),
            itemType: itemData.itemType,
            category: itemData.category,
            message: itemData.message || '',
            // Include stock fields
            currentStock: currentStock,
            minStock: minStock,
            unit: unit,
            isActive: itemData.isActive !== undefined ? itemData.isActive : true
        };
        
        console.log('Saving item with stock data:', payload);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `Failed to ${isEdit ? 'update' : 'save'} item`);
        }
        
        if (data.success) {
            const action = isEdit ? 'updated' : 'added';
            showToast(`Item ${action} successfully!`);
            await fetchInventoryItems();
            return { success: true, data: data.data };
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error saving item:', error);
        showToast(error.message, 'error');
        return { success: false, error: error.message };
    } finally {
        hideLoading();
    }
}

async function deleteInventoryItem(itemId, itemName) {
    try {
        showLoading();
        
        if (!itemId) {
            throw new Error('No item ID provided');
        }
        
        const response = await fetch(`/api/inventory/${itemId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete item');
        }
        
        if (data.success) {
            showToast(`"${escapeHtml(itemName)}" deleted successfully!`);
            await fetchInventoryItems();
            return { success: true };
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showToast(error.message || 'Failed to delete item', 'error');
        return { success: false, error: error.message };
    } finally {
        hideLoading();
    }
}

async function updateStock(itemId, quantity, notes = '') {
    try {
        showLoading();
        
        const response = await fetch(`/api/inventory/${itemId}/restock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                quantity: parseFloat(quantity),
                notes: notes,
                price: parseFloat(elements.restockPrice ? elements.restockPrice.value : 0)
            }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to restock item');
        }
        
        if (data.success) {
            showToast('Item restocked successfully!');
            await fetchInventoryItems();
            return { success: true, data: data.data };
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error updating stock:', error);
        showToast(error.message || 'Failed to restock item', 'error');
        return { success: false, error: error.message };
    } finally {
        hideLoading();
    }
}

// ==================== UI UPDATE FUNCTIONS ====================

function updateUI() {
    const filteredItems = getFilteredItems();
    updateStats(filteredItems);
    
    switch(currentSection) {
        case 'dashboard':
            displayDashboardItems(filteredItems);
            break;
        case 'inventory':
            displayInventoryItems(filteredItems);
            break;
        case 'restock':
            displayRestockItems(filteredItems);
            break;
    }
}

function getFilteredItems() {
    let filtered = [...allInventoryItems];
    
    // Filter by type
    if (currentFilter !== 'all') {
        filtered = filtered.filter(item => item.itemType === currentFilter);
    }
    
    // Filter by category
    if (currentCategory !== 'all') {
        filtered = filtered.filter(item => 
            item.category.toLowerCase().replace(/\s+/g, '-') === currentCategory
        );
    }
    
    // Filter by search term
    if (elements.searchInput && elements.searchInput.value.trim()) {
        const searchTerm = elements.searchInput.value.toLowerCase();
        filtered = filtered.filter(item => 
            item.itemName.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm) ||
            (item.message && item.message.toLowerCase().includes(searchTerm))
        );
    }
    
    return filtered;
}

function updateStats(items) {
    if (elements.totalItems) {
        elements.totalItems.textContent = items.length;
    }
    
    // Calculate actual stock statistics
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let itemsWithStockData = 0;
    
    items.forEach(item => {
        const stockInfo = getItemStockStatus(item);
        
        // Skip items without stock data
        if (!stockInfo.hasStockData) {
            return;
        }
        
        itemsWithStockData++;
        
        // Only count as out of stock if it's not a new item (has been stocked before)
        if (stockInfo.currentStock <= 0 && stockInfo.hasRestockHistory) {
            outOfStockCount++;
        } else if (stockInfo.currentStock > 0 && stockInfo.currentStock <= stockInfo.minStock) {
            lowStockCount++;
        }
    });
    
    console.log(`Total items: ${items.length}, Items with stock data: ${itemsWithStockData}, Low stock: ${lowStockCount}, Out of stock: ${outOfStockCount}`);
    
    if (elements.lowStock) elements.lowStock.textContent = lowStockCount;
    if (elements.outOfStock) elements.outOfStock.textContent = outOfStockCount;
}

function updateCategoryFilters(categories) {
    const categoryList = document.querySelector('.category-list');
    if (!categoryList) return;
    
    // Add dynamic categories that aren't already in static list
    categories.forEach(category => {
        const categoryKey = category.toLowerCase().replace(/\s+/g, '-');
        const existingItem = categoryList.querySelector(`[data-category="${categoryKey}"]`);
        
        if (!existingItem) {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.dataset.category = categoryKey;
            categoryItem.innerHTML = `
                ${category}
                <span class="category-count">0</span>
            `;
            categoryItem.onclick = () => {
                document.querySelectorAll('.category-item').forEach(item => 
                    item.classList.remove('active')
                );
                categoryItem.classList.add('active');
                currentCategory = categoryKey;
                updateUI();
            };
            categoryList.appendChild(categoryItem);
        }
    });
}

function updateCategoryCounts() {
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(categoryItem => {
        const category = categoryItem.dataset.category;
        let count = 0;
        
        if (category === 'all') {
            count = allInventoryItems.length;
        } else {
            count = allInventoryItems.filter(item => 
                item.category.toLowerCase().replace(/\s+/g, '-') === category
            ).length;
        }
        
        const countSpan = categoryItem.querySelector('.category-count');
        if (countSpan) {
            countSpan.textContent = count;
        }
    });
}

function displayDashboardItems(items) {
    if (!elements.dashboardGrid) return;
    
    // Show only 6 most recent items
    const recentItems = [...items]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6);
    
    if (recentItems.length === 0) {
        elements.dashboardGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3>No Items Found</h3>
                <p>Add your first inventory item to get started.</p>
                <button class="btn btn-primary" onclick="openAddModal()">Add New Item</button>
            </div>
        `;
        return;
    }
    
    elements.dashboardGrid.innerHTML = recentItems.map(item => {
        const stockInfo = getItemStockStatus(item);
        
        return `
        <div class="inventory-card">
            <div class="card-header">
                <h3 class="item-name">${escapeHtml(item.itemName)}</h3>
                <span class="item-status ${stockInfo.stockClass}">${stockInfo.statusText}</span>
            </div>
            <div class="card-body">
                <div class="item-info">
                    <span class="info-label">Category:</span>
                    <span class="info-value">${escapeHtml(item.category)}</span>
                </div>
                <div class="item-info">
                    <span class="info-label">Type:</span>
                    <span class="info-value ${item.itemType}">
                        ${item.itemType === 'raw' ? 'Raw Ingredient' : 'Finished Product'}
                    </span>
                </div>
                <div class="item-info">
                    <span class="info-label">Stock:</span>
                    <span class="info-value ${stockInfo.stockClass}">
                        ${stockInfo.currentStock} units (min: ${stockInfo.minStock})
                    </span>
                </div>
                ${item.message ? `
                <div class="item-info">
                    <span class="info-label">Notes:</span>
                    <span class="info-value">${escapeHtml(item.message)}</span>
                </div>
                ` : ''}
                <div class="item-info">
                    <span class="info-label">Last Updated:</span>
                    <span class="info-value">${formatDate(item.updatedAt || item.createdAt)}</span>
                </div>
            </div>
            <div class="card-footer">
                <small class="timestamp">
                    Added: ${formatDate(item.createdAt)}
                </small>
                <div class="action-buttons">
                    <button class="btn-icon edit-btn" onclick="openEditModal('${item._id}')">
                        Edit
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function displayInventoryItems(items) {
    if (!elements.inventoryGrid) return;
    
    if (items.length === 0) {
        elements.inventoryGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3>No Items Found</h3>
                <p>${currentFilter !== 'all' ? `No ${currentFilter} items found.` : ''}</p>
                <button class="btn btn-primary" onclick="openAddModal()">Add New Item</button>
            </div>
        `;
        return;
    }
    
    elements.inventoryGrid.innerHTML = items.map(item => {
        const stockInfo = getItemStockStatus(item);
        
        return `
        <div class="inventory-card">
            <div class="card-header">
                <h3 class="item-name">${escapeHtml(item.itemName)}</h3>
                <span class="item-type ${item.itemType}">
                    ${item.itemType === 'raw' ? 'Raw' : 'Finished'}
                </span>
            </div>
            <div class="card-body">
                <div class="item-info">
                    <span class="info-label">Category:</span>
                    <span class="info-value">${escapeHtml(item.category)}</span>
                </div>
                <div class="item-info">
                    <span class="info-label">Type:</span>
                    <span class="info-value ${item.itemType}">
                        ${item.itemType === 'raw' ? 'Raw Ingredient' : 'Finished Product'}
                    </span>
                </div>
                <div class="item-info">
                    <span class="info-label">Stock Level:</span>
                    <span class="info-value ${stockInfo.stockClass}">
                        ${stockInfo.currentStock} units (${stockInfo.statusText})
                    </span>
                </div>
                ${item.message ? `
                <div class="item-info">
                    <span class="info-label">Notes:</span>
                    <span class="info-value">${escapeHtml(item.message)}</span>
                </div>
                ` : ''}
                <div class="item-info">
                    <span class="info-label">Min. Stock:</span>
                    <span class="info-value">${stockInfo.minStock} units</span>
                </div>
                <div class="item-info">
                    <span class="info-label">Unit Size:</span>
                    <span class="info-value">${stockInfo.unit}</span>
                </div>
            </div>
            <div class="card-footer">
                <div class="action-buttons">
                    <button class="btn-icon edit-btn" onclick="openEditModal('${item._id}')" title="Edit Item">
                        Edit
                    </button>
                    <button class="btn-icon delete-btn" onclick="openDeleteModal('${item._id}', '${item.itemName.replace(/'/g, "\\'")}')" title="Delete Item">
                        Delete
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function displayRestockItems(items) {
    if (!elements.restockGrid) return;
    
    // Filter items that need restocking (only items with stock data AND need restocking AND are not new items)
    const restockItems = items.filter(item => {
        const stockInfo = getItemStockStatus(item);
        return stockInfo.hasStockData && stockInfo.needsRestock && !stockInfo.isNewItem;
    });
    
    // Sort by stock level (lowest first)
    restockItems.sort((a, b) => {
        const stockA = getItemStockStatus(a).currentStock;
        const stockB = getItemStockStatus(b).currentStock;
        return stockA - stockB;
    });
    
    if (restockItems.length === 0) {
        elements.restockGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <h3>All Items Are Stocked</h3>
                <p>No items need restocking at this time.</p>
            </div>
        `;
        return;
    }
    
    elements.restockGrid.innerHTML = restockItems.map(item => {
        const stockInfo = getItemStockStatus(item);
        
        return `
        <div class="inventory-card warning">
            <div class="card-header">
                <h3 class="item-name">${escapeHtml(item.itemName)}</h3>
                <span class="item-status ${stockInfo.stockClass}">${stockInfo.statusText}</span>
            </div>
            <div class="card-body">
                <div class="item-info">
                    <span class="info-label">Category:</span>
                    <span class="info-value">${escapeHtml(item.category)}</span>
                </div>
                <div class="item-info">
                    <span class="info-label">Type:</span>
                    <span class="info-value">${item.itemType === 'raw' ? 'Raw Ingredient' : 'Finished Product'}</span>
                </div>
                <div class="item-info">
                    <span class="info-label">Current Stock:</span>
                    <span class="info-value critical">${stockInfo.currentStock} units</span>
                </div>
                <div class="item-info">
                    <span class="info-label">Minimum Required:</span>
                    <span class="info-value">${stockInfo.minStock} units</span>
                </div>
                <div class="item-info">
                    <span class="info-label">Unit Size:</span>
                    <span class="info-value">${stockInfo.unit}</span>
                </div>
                <div class="item-info">
                    <span class="info-label">Shortfall:</span>
                    <span class="info-value">${Math.max(0, stockInfo.minStock - stockInfo.currentStock)} units</span>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-primary" onclick="openRestockModal('${item._id}', '${item.itemName.replace(/'/g, "\\'")}')">
                    Restock Now
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// ==================== MODAL FUNCTIONS ====================

function openAddModal() {
    if (isModalOpen) return;
    
    isModalOpen = true;
    const modal = elements.itemModal;
    const form = elements.itemForm;
    
    if (elements.modalTitle) elements.modalTitle.textContent = 'Add New Item';
    if (form) form.reset();
    if (elements.itemId) elements.itemId.value = '';
    
    // Set default values for form fields
    if (elements.itemUnit) elements.itemUnit.value = 1;
    
    // Add stock fields to the form with smart defaults
    const existingStockFields = document.querySelectorAll('.stock-field');
    existingStockFields.forEach(field => field.remove());
    
    const formContainer = document.querySelector('.form-container');
    if (formContainer) {
        const stockFields = `
            <div class="form-group stock-field">
                <label for="currentStock">Current Stock <span class="required">*</span></label>
                <input type="number" id="currentStock" name="currentStock" min="0" step="1" value="10" required>
                <small class="form-hint">Set to minimum stock level to avoid out-of-stock status</small>
            </div>
            <div class="form-group stock-field">
                <label for="minStock">Minimum Stock Level <span class="required">*</span></label>
                <input type="number" id="minStock" name="minStock" min="0" step="1" value="10" required>
                <small class="form-hint">Alert when stock falls below this level</small>
            </div>
        `;
        formContainer.insertAdjacentHTML('beforeend', stockFields);
    }
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        if (elements.itemName) elements.itemName.focus();
    }, 10);
}

function openEditModal(itemId) {
    if (isModalOpen) return;
    
    const item = allInventoryItems.find(i => i._id === itemId);
    if (!item) return;
    
    isModalOpen = true;
    const modal = elements.itemModal;
    
    if (elements.modalTitle) elements.modalTitle.textContent = 'Edit Item';
    if (elements.itemId) elements.itemId.value = item._id;
    if (elements.itemName) elements.itemName.value = item.itemName;
    if (elements.itemType) elements.itemType.value = item.itemType;
    if (elements.itemCategory) elements.itemCategory.value = item.category;
    if (elements.itemUnit) elements.itemUnit.value = item.unit || 1;
    if (elements.currentStock) elements.currentStock.value = item.currentStock || 0;
    if (elements.minStock) elements.minStock.value = item.minStock || 10;
    if (elements.description) elements.description.value = item.message || '';
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        if (elements.itemName) elements.itemName.focus();
    }, 10);
}

function openDeleteModal(itemId, itemName) {
    if (isModalOpen) return;
    
    isModalOpen = true;
    const modal = elements.deleteModal;
    
    if (elements.deleteItemName) {
        elements.deleteItemName.textContent = escapeHtml(itemName);
    }
    
    // Set up delete handler
    const confirmDelete = async () => {
        const result = await deleteInventoryItem(itemId, itemName);
        if (result.success) {
            closeModal('deleteModal');
        }
    };
    
    // Update button handler
    if (elements.confirmDeleteBtn) {
        elements.confirmDeleteBtn.onclick = confirmDelete;
    }
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function openRestockModal(itemId, itemName) {
    if (isModalOpen) return;
    
    const item = allInventoryItems.find(i => i._id === itemId);
    if (!item) return;
    
    const stockInfo = getItemStockStatus(item);
    
    isModalOpen = true;
    const modal = elements.restockModal;
    
    if (elements.restockItemId) elements.restockItemId.value = item._id;
    if (elements.restockItemName) elements.restockItemName.value = item.itemName;
    if (elements.restockCurrentStock) elements.restockCurrentStock.value = `${stockInfo.currentStock} units`;
    if (elements.restockUnit) {
        elements.restockUnit.value = 'units';
    }
    if (elements.restockQuantity) {
        // Suggest restocking to minimum level + buffer
        const suggestedQuantity = Math.max(stockInfo.minStock - stockInfo.currentStock + 10, 10);
        elements.restockQuantity.value = suggestedQuantity;
        elements.restockQuantity.min = 1;
        elements.restockQuantity.step = 1;
        elements.restockQuantity.oninput = calculateTotalCost;
    }
    if (elements.restockPrice) {
        elements.restockPrice.value = '0.00';
        elements.restockPrice.min = 0;
        elements.restockPrice.step = 0.01;
        elements.restockPrice.oninput = calculateTotalCost;
    }
    if (elements.restockTotalCost) elements.restockTotalCost.value = '₱0.00';
    if (elements.restockNotes) elements.restockNotes.value = '';
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        if (elements.restockQuantity) elements.restockQuantity.focus();
    }, 10);
}

function calculateTotalCost() {
    if (!elements.restockQuantity || !elements.restockPrice || !elements.restockTotalCost) return;
    
    const quantity = parseFloat(elements.restockQuantity.value) || 0;
    const price = parseFloat(elements.restockPrice.value) || 0;
    const total = quantity * price;
    elements.restockTotalCost.value = `₱${total.toFixed(2)}`;
}

function closeModal(modalId) {
    isModalOpen = false;
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        
        // Reset form if it's the item modal
        if (modalId === 'itemModal' && elements.itemForm) {
            elements.itemForm.reset();
            // Remove dynamically added stock fields
            const stockFields = document.querySelectorAll('.stock-field');
            stockFields.forEach(field => field.remove());
        }
    }, 300);
}

function closeAllModals() {
    closeModal('itemModal');
    closeModal('restockModal');
    closeModal('deleteModal');
}

// ==================== EVENT HANDLERS ====================

// In your handleSaveItem function, add:
async function handleSaveItem() {
    if (!elements.itemForm || !elements.itemForm.checkValidity()) {
        elements.itemForm.reportValidity();
        return;
    }
    
    const itemId = elements.itemId ? elements.itemId.value : '';
    const itemData = {
        itemName: elements.itemName ? elements.itemName.value.trim() : '',
        itemType: elements.itemType ? elements.itemType.value : '',
        category: elements.itemCategory ? elements.itemCategory.value : '',
        unit: elements.itemUnit ? parseInt(elements.itemUnit.value) || 1 : 1,
        message: elements.description ? elements.description.value.trim() : '',
        // ADD THESE:
        currentStock: elements.currentStock ? parseInt(elements.currentStock.value) || 0 : 0,
        minStock: elements.minStock ? parseInt(elements.minStock.value) || 10 : 10
    };
    
    if (itemId) {
        itemData._id = itemId;
    }
    
    const result = await saveInventoryItem(itemData, !!itemId);
    if (result.success) {
        closeModal('itemModal');
    }
}

async function handleRestockItem() {
    if (!elements.restockQuantity || !elements.restockQuantity.checkValidity()) {
        elements.restockQuantity.reportValidity();
        return;
    }
    
    const itemId = elements.restockItemId ? elements.restockItemId.value : '';
    const quantity = elements.restockQuantity ? parseFloat(elements.restockQuantity.value) : 0;
    const notes = elements.restockNotes ? elements.restockNotes.value.trim() : '';
    
    if (!itemId) {
        showToast('No item selected for restocking', 'error');
        return;
    }
    
    if (quantity <= 0) {
        showToast('Please enter a valid quantity greater than 0', 'error');
        return;
    }
    
    const result = await updateStock(itemId, quantity, notes);
    if (result.success) {
        showToast('Item restocked successfully!');
        closeModal('restockModal');
    }
}

function filterItems(searchTerm) {
    const filtered = getFilteredItems();
    updateUIWithFilteredItems(filtered);
}

function updateUIWithFilteredItems(filteredItems) {
    updateStats(filteredItems);
    
    switch(currentSection) {
        case 'dashboard':
            displayDashboardItems(filteredItems);
            break;
        case 'inventory':
            displayInventoryItems(filteredItems);
            break;
        case 'restock':
            displayRestockItems(filteredItems);
            break;
    }
}

function setFilter(type) {
    currentFilter = type;
    
    // Update active filter buttons
    if (elements.typeButtons) {
        elements.typeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
    }
    
    updateUI();
}

function switchSection(sectionId) {
    currentSection = sectionId;
    
    // Update active navigation
    if (elements.navLinks) {
        elements.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === sectionId);
        });
    }
    
    // Show/hide sections
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.toggle('active-section', section.id === sectionId);
    });
    
    // Update UI for current section
    updateUI();
}

function handleLogout() {
    fetch('/logout', {
        method: 'GET',
        credentials: 'include'
    }).then(() => {
        window.location.href = '/login';
    });
}

// ==================== EVENT LISTENER SETUP ====================

function setupEventListeners() {
    // Modal close buttons
    if (elements.closeModal) elements.closeModal.onclick = () => closeModal('itemModal');
    if (elements.closeRestockModal) elements.closeRestockModal.onclick = () => closeModal('restockModal');
    if (elements.closeDeleteModal) elements.closeDeleteModal.onclick = () => closeModal('deleteModal');
    
    // Cancel buttons
    if (elements.cancelBtn) elements.cancelBtn.onclick = () => closeModal('itemModal');
    if (elements.cancelRestockBtn) elements.cancelRestockBtn.onclick = () => closeModal('restockModal');
    if (elements.cancelDeleteBtn) elements.cancelDeleteBtn.onclick = () => closeModal('deleteModal');
    
    // Action buttons
    if (elements.saveItemBtn) elements.saveItemBtn.onclick = handleSaveItem;
    if (elements.addNewItem) elements.addNewItem.onclick = openAddModal;
    if (elements.quickAdd) elements.quickAdd.onclick = openAddModal;
    if (elements.confirmRestockBtn) elements.confirmRestockBtn.onclick = handleRestockItem;
    
    // View all items button
    if (elements.viewAllItems) {
        elements.viewAllItems.onclick = () => {
            switchSection('inventory');
        };
    }
    
    // Refresh dashboard
    if (elements.refreshDashboard) {
        elements.refreshDashboard.onclick = () => {
            fetchInventoryItems();
            showToast('Dashboard refreshed', 'success');
        };
    }
    
    // Type filter buttons
    if (elements.typeButtons) {
        elements.typeButtons.forEach(btn => {
            btn.onclick = () => setFilter(btn.dataset.type);
        });
    }
    
    // Navigation links
    if (elements.navLinks) {
        elements.navLinks.forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                switchSection(link.dataset.section);
            };
        });
    }
    
    // Category filters
    if (elements.categoryItems) {
        elements.categoryItems.forEach(item => {
            item.onclick = () => {
                elements.categoryItems.forEach(cat => 
                    cat.classList.remove('active')
                );
                item.classList.add('active');
                currentCategory = item.dataset.category;
                updateUI();
            };
        });
    }
    
    // Search input
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', (e) => {
            debounceSearch(e.target.value);
        });
    }
    
    // Handle unit input validation
    if (elements.itemUnit) {
        elements.itemUnit.addEventListener('input', (e) => {
            // Ensure the value is a positive integer
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 1) {
                e.target.value = 1;
            } else {
                e.target.value = value;
            }
        });
    }
    
    // Handle escape key
    document.addEventListener('keydown', (evt) => {
        if (evt.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    });
    
    // Form submission prevention
    if (elements.itemForm) {
        elements.itemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSaveItem();
        });
    }
}

// ==================== INITIALIZATION ====================

async function initialize() {
    try {
        showLoading();
        
        // Setup event listeners
        setupEventListeners();
        
        // Set default section
        switchSection('inventory');
        
        // Fetch initial data
        await fetchInventoryItems();
        await fetchCategories();
        
        // Hide loading
        setTimeout(hideLoading, 500);
        
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to initialize inventory system', 'error');
        hideLoading();
    }
}

// Start when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Export functions for HTML onclick handlers
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
window.openRestockModal = openRestockModal;
window.handleLogout = handleLogout;
window.debounceSearch = debounceSearch;