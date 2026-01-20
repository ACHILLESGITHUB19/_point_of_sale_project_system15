const inventoryData = {
    raw: [],
    finished: []
};

// Add a flag to track dashboard updates
let dashboardUpdateInProgress = false;
let staffDashboardUpdateInProgress = false;

const typeButtons = document.querySelectorAll('.type-btn');
const navLinks = document.querySelectorAll('.nav-link');
const categoryItems = document.querySelectorAll('.category-item');
const sections = document.querySelectorAll('.section-content');
const modals = document.querySelectorAll('.modal');
const closeButtons = document.querySelectorAll('.close-btn, .btn-secondary[id$="Btn"]');

let currentType = 'all';
let currentCategory = 'all';
let currentSection = 'dashboard';
let currentItemId = null;
let currentRestockItem = null;

// Function to synchronize data across dashboards
function synchronizeDashboards() {
    // Get all dashboard grid elements that need to be updated
    const dashboardGrids = document.querySelectorAll('.inventory-grid, .dashboard-grid, #dashboardGrid, #inventoryGrid, #restockGrid');
    
    // Update each grid if it exists
    dashboardGrids.forEach(grid => {
        if (grid) {
            const section = grid.closest('.section-content')?.id || 
                           grid.closest('[data-section]')?.dataset.section || 
                           'dashboard';
            
            switch(section) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'inventory':
                    loadInventory();
                    break;
                case 'restock':
                    loadRestockAlerts();
                    break;
            }
        }
    });
    
    // Update statistics in all dashboards
    updateAllStats();
}

// Function to update statistics across all dashboard instances
function updateAllStats() {
    const allItems = [...inventoryData.raw, ...inventoryData.finished];
    const totalItems = allItems.length;
    const lowStockItems = allItems.filter(item => 
        getStockStatus(item) === 'warning'
    ).length;
    const outOfStockItems = allItems.filter(item => 
        getStockStatus(item) === 'out'
    ).length;

    // Update all stat elements across both dashboards
    const statElements = {
        'totalItems': document.querySelectorAll('#totalItems, .stat-value'),
        'lowStock': document.querySelectorAll('#lowStock, [data-stat="lowStock"]'),
        'outOfStock': document.querySelectorAll('#outOfStock, [data-stat="outOfStock"]')
    };

    // Update each stat element if found
    Object.keys(statElements).forEach(statKey => {
        statElements[statKey].forEach(element => {
            if (element.id === 'totalItems' || element.dataset.stat === 'totalItems') {
                element.textContent = totalItems;
            } else if (element.id === 'lowStock' || element.dataset.stat === 'lowStock') {
                element.textContent = lowStockItems;
            } else if (element.id === 'outOfStock' || element.dataset.stat === 'outOfStock') {
                element.textContent = outOfStockItems;
            }
        });
    });

    // Update category counts in both dashboards
    updateCategoryCounts();
}

// Modified updateStats function to handle both dashboards
function updateStats() {
    updateAllStats();
}

// Function to update category counts in all dashboards
function updateCategoryCounts() {
    const allItems = [...inventoryData.raw, ...inventoryData.finished];
    
    const categoryCounts = {
        all: allItems.length,
        meat: allItems.filter(item => item.category === 'meat').length,
        dairy: allItems.filter(item => item.category === 'dairy').length,
        produce: allItems.filter(item => item.category === 'produce').length,
        dry: allItems.filter(item => item.category === 'dry').length
    };

    // Update all category count elements
    const categoryCountElements = document.querySelectorAll('.category-count');
    categoryCountElements.forEach(element => {
        const categoryItem = element.closest('.category-item');
        if (categoryItem) {
            const category = categoryItem.dataset.category;
            if (categoryCounts[category] !== undefined) {
                element.textContent = categoryCounts[category];
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    
    // Initialize both dashboards
    loadDashboard();
    updateStats();
    
    const currentPath = window.location.pathname;
    const menuLinks = document.querySelectorAll('.dashboard-menu a');
    menuLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
});

function initEventListeners() {
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;
            loadCurrentSection();
        });
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            
            if (section) {
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                switchSection(section);
            }
        });
    });

    categoryItems.forEach(item => {
        item.addEventListener('click', () => {
            categoryItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentCategory = item.dataset.category;
            loadCurrentSection();
        });
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.id.replace('close', '').replace('cancel', '').replace('Btn', '');
            const modal = document.getElementById(modalId + 'Modal') || 
                         document.getElementById('itemModal') || 
                         document.getElementById('restockModal') || 
                         document.getElementById('deleteModal');
            if (modal) modal.classList.remove('active');
        });
    });

    document.getElementById('quickAdd')?.addEventListener('click', (e) => {
        e.preventDefault();
        openItemModal();
    });

    document.getElementById('addNewItem')?.addEventListener('click', () => {
        openItemModal();
    });

    document.getElementById('viewAllItems')?.addEventListener('click', () => {
        switchSection('inventory');
    });

    document.getElementById('refreshDashboard')?.addEventListener('click', () => {
        loadDashboard();
        synchronizeDashboards();
        showNotification('Dashboard refreshed!', 'success');
    });

    document.getElementById('saveItemBtn')?.addEventListener('click', saveItem);
    document.getElementById('confirmRestockBtn')?.addEventListener('click', confirmRestock);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);

    document.getElementById('restockQuantity')?.addEventListener('input', calculateRestockCost);
    document.getElementById('restockPrice')?.addEventListener('input', calculateRestockCost);
}

function switchSection(section) {
    sections.forEach(sec => sec.classList.remove('active-section'));
    document.getElementById(section).classList.add('active-section');
    currentSection = section;
    loadCurrentSection();
}

function loadCurrentSection() {
    // Prevent infinite update loops
    if (dashboardUpdateInProgress) return;
    
    dashboardUpdateInProgress = true;
    
    switch(currentSection) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'inventory':
            loadInventory();
            break;
        case 'restock':
            loadRestockAlerts();
            break;
    }
    
    // Also update any other dashboard instances
    synchronizeDashboards();
    
    dashboardUpdateInProgress = false;
}

function loadDashboard() {
    const dashboardGrids = document.querySelectorAll('#dashboardGrid, [data-dashboard="dashboard"]');
    
    dashboardGrids.forEach(grid => {
        const allItems = [...inventoryData.raw, ...inventoryData.finished];
        const lowStockItems = allItems.filter(item => 
            getStockStatus(item) !== 'good'
        ).slice(0, 4);

        grid.innerHTML = lowStockItems.map(item => createInventoryCard(item)).join('');
        attachCardEventListeners(grid);
    });
}

function loadInventory() {
    const inventoryGrids = document.querySelectorAll('#inventoryGrid, [data-dashboard="inventory"]');
    
    inventoryGrids.forEach(grid => {
        let items = [];
        if (currentType === 'all') {
            items = [...inventoryData.raw, ...inventoryData.finished];
        } else if (currentType === 'raw') {
            items = [...inventoryData.raw];
        } else if (currentType === 'finished') {
            items = [...inventoryData.finished];
        }

        if (currentCategory !== 'all') {
            items = items.filter(item => item.category === currentCategory);
        }

        if (items.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">No Items</div>
                    <h3>No Items Found</h3>
                    <p>Try changing your filters or add new items to the inventory.</p>
                    <button class="btn btn-primary" onclick="openItemModal()">Add New Item</button>
                </div>
            `;
            return;
        }

        grid.innerHTML = items.map(item => createInventoryCard(item)).join('');
        attachCardEventListeners(grid);
    });
}

function loadRestockAlerts() {
    const restockGrids = document.querySelectorAll('#restockGrid, [data-dashboard="restock"]');
    
    restockGrids.forEach(grid => {
        const allItems = [...inventoryData.raw, ...inventoryData.finished];
        const restockItems = allItems.filter(item => 
            getStockStatus(item) !== 'good'
        );

        if (restockItems.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">All Stocked</div>
                    <h3>All Items Stocked</h3>
                    <p>Great job! All items are sufficiently stocked.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = restockItems.map(item => createInventoryCard(item)).join('');
        attachCardEventListeners(grid);
    });
}

// Modified saveItem function to synchronize both dashboards
function saveItem() {
    const form = document.getElementById('itemForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const itemData = {
        name: document.getElementById('itemName').value,
        type: document.getElementById('itemType').value,
        category: document.getElementById('itemCategory').value,
        unit: document.getElementById('itemUnit').value,
        currentStock: parseInt(document.getElementById('currentStock').value),
        parLevel: parseInt(document.getElementById('parLevel').value),
        costPrice: parseFloat(document.getElementById('costPrice').value),
        supplier: document.getElementById('supplier').value,
        description: document.getElementById('description').value,
        lastUpdated: new Date().toISOString().split('T')[0]
    };

    const itemId = document.getElementById('itemId').value;

    if (itemId) {
        const index = findItemIndexById(itemId);
        if (index !== -1) {
            const oldItem = findItemById(itemId);
            inventoryData[oldItem.type][index] = { ...oldItem, ...itemData };
            showNotification('Item updated successfully!', 'success');
        }
    } else {
        const newId = itemData.type === 'raw' 
            ? inventoryData.raw.length + 1 
            : 100 + inventoryData.finished.length + 1;
        
        itemData.id = newId;
        itemData.status = getStockStatus(itemData);
        inventoryData[itemData.type].push(itemData);
        showNotification('Item added successfully!', 'success');
    }

    document.getElementById('itemModal').classList.remove('active');
    
    // Update both dashboards
    updateStats();
    synchronizeDashboards();
}

// Modified confirmRestock function to synchronize both dashboards
function confirmRestock() {
    const form = document.getElementById('restockForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const quantity = parseInt(document.getElementById('restockQuantity').value);
    const itemId = parseInt(document.getElementById('restockItemId').value);
    
    const item = findItemById(itemId);
    if (!item) return;

    item.currentStock += quantity;
    item.lastUpdated = new Date().toISOString().split('T')[0];
    item.status = getStockStatus(item);

    showNotification(`Restocked ${quantity} ${item.unit} of ${item.name}`, 'success');
    document.getElementById('restockModal').classList.remove('active');
    
    // Update both dashboards
    updateStats();
    synchronizeDashboards();
}

// Modified confirmDelete function to synchronize both dashboards
function confirmDelete() {
    const item = findItemById(currentItemId, currentItemType);
    if (!item) return;

    const index = findItemIndexById(currentItemId, currentItemType);
    if (index !== -1) {
        inventoryData[currentItemType].splice(index, 1);
        showNotification(`Deleted ${item.name}`, 'success');
    }

    document.getElementById('deleteModal').classList.remove('active');
    
    // Update both dashboards
    updateStats();
    synchronizeDashboards();
    
    currentItemId = null;
    currentItemType = null;
}

// The rest of the helper functions remain the same
function createInventoryCard(item) {
    const status = getStockStatus(item);
    const statusText = getStatusText(status);
    const percentage = Math.min((item.currentStock / item.parLevel) * 100, 100);
    const typeText = item.type === 'raw' ? 'Raw Ingredient' : 'Finished Product';
    const typeClass = item.type === 'raw' ? 'type-raw' : 'type-finished';

    return `
        <div class="inventory-card" data-id="${item.id}" data-type="${item.type}">
            <div class="card-header">
                <span class="item-type ${typeClass}">${typeText}</span>
                <span class="stock-status status-${status}">${statusText}</span>
            </div>
            <div class="card-body">
                <h3 class="item-name">${item.name}</h3>
                <div class="item-details">
                    <div class="detail-item">
                        <h4>Current Stock</h4>
                        <div class="detail-value">${item.currentStock} ${item.unit}</div>
                    </div>
                    <div class="detail-item">
                        <h4>Par Level</h4>
                        <div class="detail-value">${item.parLevel} ${item.unit}</div>
                    </div>
                </div>
                <div class="item-details">
                    <div class="detail-item">
                        <h4>Unit Cost</h4>
                        <div class="detail-value">₱${item.costPrice}</div>
                    </div>
                    <div class="detail-item">
                        <h4>Total Value</h4>
                        <div class="detail-value">₱${(item.currentStock * item.costPrice).toFixed(2)}</div>
                    </div>
                </div>
                <div class="stock-progress">
                    <div class="progress-header">
                        <span class="progress-label">Stock Level</span>
                        <span class="progress-label">${percentage.toFixed(0)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill fill-${status}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <button class="card-btn card-btn-edit" data-action="edit">
                    Edit
                </button>
                <button class="card-btn card-btn-restock" data-action="restock">
                    Restock
                </button>
                <button class="card-btn card-btn-delete" data-action="delete">
                    Delete
                </button>
            </div>
        </div>
    `;
}

function attachCardEventListeners(container) {
    container.querySelectorAll('.card-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.inventory-card');
            const itemId = parseInt(card.dataset.id);
            const itemType = card.dataset.type;
            const action = this.dataset.action;

            const item = findItemById(itemId, itemType);

            switch(action) {
                case 'edit':
                    openItemModal(itemId);
                    break;
                case 'restock':
                    openRestockModal(itemId, itemType);
                    break;
                case 'delete':
                    openDeleteModal(itemId, itemType);
                    break;
            }
        });
    });
}

function openItemModal(id = null) {
    const modal = document.getElementById('itemModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('itemForm');

    if (id) {
        title.textContent = 'Edit Item';
        const item = findItemById(id);
        if (item) {
            document.getElementById('itemName').value = item.name;
            document.getElementById('itemType').value = item.type;
            document.getElementById('itemCategory').value = item.category;
            document.getElementById('itemUnit').value = item.unit;
            document.getElementById('currentStock').value = item.currentStock;
            document.getElementById('parLevel').value = item.parLevel;
            document.getElementById('costPrice').value = item.costPrice;
            document.getElementById('supplier').value = item.supplier || '';
            document.getElementById('description').value = item.description || '';
            document.getElementById('itemId').value = item.id;
        }
    } else {
        title.textContent = 'Add New Item';
        form.reset();
        document.getElementById('itemId').value = '';
    }

    modal.classList.add('active');
}

function openRestockModal(id, type) {
    const modal = document.getElementById('restockModal');
    const item = findItemById(id, type);
    
    if (!item) return;

    currentRestockItem = item;
    document.getElementById('restockItemName').value = item.name;
    document.getElementById('restockCurrentStock').value = `${item.currentStock} ${item.unit}`;
    document.getElementById('restockUnit').value = item.unit;
    document.getElementById('restockPrice').value = item.costPrice;
    document.getElementById('restockItemId').value = item.id;
    document.getElementById('restockQuantity').value = Math.max(1, item.parLevel - item.currentStock);
    
    calculateRestockCost();
    modal.classList.add('active');
}

function openDeleteModal(id, type) {
    const modal = document.getElementById('deleteModal');
    const item = findItemById(id, type);
    
    if (!item) return;

    currentItemId = id;
    currentItemType = type;
    document.getElementById('deleteItemName').textContent = item.name;
    modal.classList.add('active');
}

function calculateRestockCost() {
    const quantity = parseInt(document.getElementById('restockQuantity').value) || 0;
    const price = parseFloat(document.getElementById('restockPrice').value) || 0;
    const total = quantity * price;
    document.getElementById('restockTotalCost').value = `₱${total.toFixed(2)}`;
}

function findItemById(id, type = null) {
    const idNum = parseInt(id);
    
    if (type) {
        return inventoryData[type].find(item => item.id === idNum);
    }
    
    return inventoryData.raw.find(item => item.id === idNum) || 
           inventoryData.finished.find(item => item.id === idNum);
}

function findItemIndexById(id, type = null) {
    const item = findItemById(id, type);
    if (!item) return -1;
    
    if (type) {
        return inventoryData[type].findIndex(i => i.id === parseInt(id));
    }
    
    const rawIndex = inventoryData.raw.findIndex(i => i.id === parseInt(id));
    if (rawIndex !== -1) return rawIndex;
    
    return inventoryData.finished.findIndex(i => i.id === parseInt(id));
}

function getStockStatus(item) {
    const percentage = (item.currentStock / item.parLevel) * 100;
    
    if (item.currentStock === 0) return 'out';
    if (percentage <= 25) return 'critical';
    if (percentage <= 50) return 'warning';
    return 'good';
}

function getStatusText(status) {
    const statusMap = {
        'good': 'Good',
        'warning': 'Low',
        'critical': 'Critical',
        'out': 'Out of Stock'
    };
    return statusMap[status] || 'Unknown';
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 90px;
            right: 25px;
            background: ${type === 'success' ? '#38a169' : type === 'error' ? '#e53e3e' : '#3182ce'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            border: 1px solid ${type === 'success' ? '#2f855a' : type === 'error' ? '#c53030' : '#2b6cb0'};
        ">
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

function handleLogout() {
    // Logout implementation
}

function debounceSearch(value) {
    // Search implementation
}

function showSection(section) {
    // Section navigation implementation
}