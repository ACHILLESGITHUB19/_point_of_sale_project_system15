// Menu Management JavaScript
class MenuManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.currentFilter = 'all';
        this.currentCategory = 'all';
        this.currentSort = 'name';
        this.currentSearch = '';
        this.menuItems = [];
        this.selectedItemId = null;
        
        this.init();
    }
    
    init() {
        this.loadMenuItems();
        this.setupEventListeners();
        this.updateSummary();
        
        const priceInput = document.getElementById('itemPrice');
        const costInput = document.getElementById('itemCost');
        if (priceInput && costInput) {
            priceInput.addEventListener('input', () => this.calculateProfit());
            costInput.addEventListener('input', () => this.calculateProfit());
        }
    }
    
    loadMenuItems() {
        const storedItems = localStorage.getItem('menuItems');
        if (storedItems) {
            this.menuItems = JSON.parse(storedItems);
        } else {
            this.menuItems = [];
        }
        
        this.renderMenuGrid();
    }
    
    saveMenuItems() {
        localStorage.setItem('menuItems', JSON.stringify(this.menuItems));
    }
    
    setupEventListeners() {
        let searchTimeout;
        const searchInput = document.getElementById('menuSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchMenu(e.target.value);
                }, 300);
            });
        }
        
        const addForm = document.getElementById('addDishForm');
        if (addForm) {
            addForm.addEventListener('submit', (e) => this.handleAddItem(e));
        }
    }
    
    calculateProfit() {
        const price = parseFloat(document.getElementById('itemPrice').value) || 0;
        const cost = parseFloat(document.getElementById('itemCost').value) || 0;
        const profit = price - cost;
        const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : 0;
        
        document.getElementById('profitPreview').textContent = profit.toFixed(2);
        document.getElementById('marginPreview').textContent = `${margin}%`;
    }
    
    filterMenu() {
        this.currentFilter = document.getElementById('menuFilter').value;
        this.currentCategory = document.getElementById('categoryFilter').value;
        this.currentPage = 1;
        this.renderMenuGrid();
    }
    
    sortMenu() {
        this.currentSort = document.getElementById('sortFilter').value;
        this.renderMenuGrid();
    }
    
    searchMenu(query) {
        this.currentSearch = query.toLowerCase();
        this.currentPage = 1;
        this.renderMenuGrid();
    }
    
    clearSearch() {
        document.getElementById('menuSearchInput').value = '';
        this.searchMenu('');
    }
    
    getFilteredItems() {
        let filtered = [...this.menuItems];
        
        if (this.currentSearch) {
            filtered = filtered.filter(item => 
                item.name.toLowerCase().includes(this.currentSearch) ||
                item.description.toLowerCase().includes(this.currentSearch) ||
                item.category.toLowerCase().includes(this.currentSearch)
            );
        }
        
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(item => item.category === this.currentCategory);
        }
        
        switch (this.currentFilter) {
            case 'active':
                filtered = filtered.filter(item => item.status === 'active');
                break;
            case 'slow':
                filtered = filtered.filter(item => item.sales < 10);
                break;
            case 'new':
                filtered = filtered.filter(item => item.status === 'new');
                break;
            case 'outofstock':
                filtered = filtered.filter(item => false);
                break;
        }
        
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'price-asc':
                    return a.price - b.price;
                case 'price-desc':
                    return b.price - a.price;
                case 'sales':
                    return b.sales - a.sales;
                case 'profit':
                    return b.profitMargin - a.profitMargin;
                default:
                    return 0;
            }
        });
        
        return filtered;
    }
    
    renderMenuGrid() {
        const filteredItems = this.getFilteredItems();
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageItems = filteredItems.slice(startIndex, endIndex);
        
        const menuGrid = document.getElementById('menuGrid');
        if (!menuGrid) return;
        
        if (filteredItems.length === 0) {
            menuGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No menu items found</h3>
                    <p>Try adjusting your filters or add new items</p>
                </div>
            `;
            this.updatePagination(filteredItems.length);
            return;
        }
        
        menuGrid.innerHTML = pageItems.map(item => this.createMenuItemCard(item)).join('');
        this.updatePagination(filteredItems.length);
    }
    
    createMenuItemCard(item) {
        const badge = this.getBadge(item);
        const profitColor = item.profitMargin > 60 ? 'success' : item.profitMargin > 40 ? 'warning' : 'danger';
        
        return `
            <div class="menu-item-card" data-id="${item.id}">
                <div class="menu-item-header">
                    ${badge}
                    <span class="item-price">₱${item.price.toFixed(2)}</span>
                </div>
                <div class="menu-item-body">
                    <h4>${item.name}</h4>
                    <p class="item-category">
                        <i class="fas fa-tag"></i> ${this.formatCategory(item.category)}
                    </p>
                    <p class="item-desc">${item.description}</p>
                    <div class="item-stats">
                        <span class="stat">
                            <i class="fas fa-chart-line"></i> ${item.sales} sold
                        </span>
                        <span class="stat ${profitColor}">
                            <i class="fas fa-percentage"></i> ${item.profitMargin.toFixed(1)}% margin
                        </span>
                    </div>
                </div>
                <div class="menu-item-footer">
                    <span class="sales-data">
                        Added: ${this.formatDate(item.createdAt)}
                    </span>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="menuManager.editMenuItem(${item.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-delete" onclick="menuManager.showDeleteModal(${item.id})">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    getBadge(item) {
        if (item.isFeatured) {
            return '<span class="item-badge star"><i class="fas fa-star"></i> Featured</span>';
        }
        if (item.status === 'new') {
            return '<span class="item-badge new"><i class="fas fa-certificate"></i> New</span>';
        }
        if (item.sales < 10) {
            return '<span class="item-badge warning"><i class="fas fa-exclamation-triangle"></i> Low Sales</span>';
        }
        return '';
    }
    
    formatCategory(category) {
        const categories = {
            meal: 'Rice Meals',
            drinks: 'Drinks',
            coffee: 'Coffee',
            snacks: 'Snacks',
            special: 'Specials',
            dessert: 'Desserts'
        };
        return categories[category] || category;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    
    updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const currentPage = this.currentPage;
        
        document.getElementById('currentPage').textContent = currentPage;
        document.getElementById('totalPages').textContent = totalPages;
        
        const prevBtn = document.querySelector('.page-btn:first-child');
        const nextBtn = document.querySelector('.page-btn:last-child');
        
        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }
    
    changePage(direction) {
        const totalItems = this.getFilteredItems().length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const newPage = this.currentPage + direction;
        
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderMenuGrid();
        }
    }
    
    updateSummary() {
        const totalItems = this.menuItems.length;
        const topSellers = this.menuItems.filter(item => item.sales > 50).length;
        const needReview = this.menuItems.filter(item => item.sales < 10).length;
        
        let avgMargin = 0;
        let topItem = null;
        let bestProfitItem = null;
        
        if (totalItems > 0) {
            avgMargin = this.menuItems.reduce((sum, item) => sum + item.profitMargin, 0) / totalItems;
            topItem = this.menuItems.reduce((prev, current) => 
                (prev.sales > current.sales) ? prev : current, this.menuItems[0]
            );
            bestProfitItem = this.menuItems.reduce((prev, current) => 
                (prev.profitMargin > current.profitMargin) ? prev : current, this.menuItems[0]
            );
        }
        
        document.getElementById('totalMenuItems').textContent = totalItems;
        document.getElementById('topSellers').textContent = topSellers;
        document.getElementById('bestProfitMargin').textContent = totalItems > 0 ? avgMargin.toFixed(1) + '%' : '0%';
        document.getElementById('needReview').textContent = needReview;
        
        if (topItem) {
            document.getElementById('topItemName').textContent = topItem.name.substring(0, 15) + '...';
        } else {
            document.getElementById('topItemName').textContent = '-';
        }
        
        if (bestProfitItem) {
            document.getElementById('bestProfitItem').textContent = bestProfitItem.name.substring(0, 15) + '...';
        } else {
            document.getElementById('bestProfitItem').textContent = '-';
        }
    }
    
    // ADD NEW ITEM FUNCTION
    showAddDishModal() {
        document.getElementById('addDishModal').style.display = 'flex';
        document.getElementById('itemName').focus();
    }
    
    closeAddModal() {
        document.getElementById('addDishModal').style.display = 'none';
        document.getElementById('addDishForm').reset();
        this.calculateProfit();
    }
    
    handleAddItem(event) {
        event.preventDefault();
        
        const newItem = {
            id: Date.now(),
            name: document.getElementById('itemName').value.trim(),
            price: parseFloat(document.getElementById('itemPrice').value),
            cost: parseFloat(document.getElementById('itemCost').value),
            category: document.getElementById('itemCategory').value,
            status: document.getElementById('itemStatus').value,
            description: document.getElementById('itemDescription').value.trim(),
            image: document.getElementById('itemImage').value.trim(),
            isFeatured: document.getElementById('itemFeatured').checked,
            sales: 0,
            profitMargin: 0,
            createdAt: new Date().toISOString().split('T')[0]
        };
        
        // Validate inputs
        if (newItem.price <= 0 || newItem.cost < 0) {
            this.showNotification('Please enter valid price and cost values', 'warning');
            return;
        }
        
        if (newItem.cost > newItem.price) {
            this.showNotification('Cost cannot be higher than selling price', 'warning');
            return;
        }
        
        newItem.profitMargin = parseFloat(((newItem.price - newItem.cost) / newItem.price * 100).toFixed(1));
        
        this.menuItems.unshift(newItem);
        this.saveMenuItems();
        this.renderMenuGrid();
        this.updateSummary();
        this.closeAddModal();
        
        this.showNotification('Menu item added successfully!', 'success');
    }
    
    editMenuItem(id) {
        const item = this.menuItems.find(item => item.id === id);
        if (!item) return;
        
        const editModal = document.getElementById('editModal');
        editModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Edit Menu Item</h3>
                    <button class="close-modal" onclick="this.closest('.menu-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editDishForm" onsubmit="menuManager.handleEditItem(event, ${id})">
                        <div class="form-group">
                            <label>Item Name</label>
                            <input type="text" value="${item.name.replace(/"/g, '&quot;')}" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Price (₱)</label>
                                <input type="number" value="${item.price}" required>
                            </div>
                            <div class="form-group">
                                <label>Cost (₱)</label>
                                <input type="number" value="${item.cost}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Category</label>
                                <select>
                                    <option value="meal" ${item.category === 'meal' ? 'selected' : ''}>Rice Meals</option>
                                    <option value="drinks" ${item.category === 'drinks' ? 'selected' : ''}>Drinks</option>
                                    <option value="coffee" ${item.category === 'coffee' ? 'selected' : ''}>Coffee</option>
                                    <option value="snacks" ${item.category === 'snacks' ? 'selected' : ''}>Snacks</option>
                                    <option value="special" ${item.category === 'special' ? 'selected' : ''}>Specials</option>
                                    <option value="dessert" ${item.category === 'dessert' ? 'selected' : ''}>Desserts</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select>
                                    <option value="active" ${item.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${item.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    <option value="new" ${item.status === 'new' ? 'selected' : ''}>New Arrival</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea rows="3">${item.description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" ${item.isFeatured ? 'checked' : ''}>
                                Mark as Featured Item
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" onclick="this.closest('.menu-modal').style.display='none'">Cancel</button>
                            <button type="submit" class="btn-save">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        editModal.style.display = 'flex';
    }
    
    handleEditItem(event, id) {
        event.preventDefault();
        const form = event.target;
        
        const updatedItem = {
            name: form.querySelector('input[type="text"]').value.trim(),
            price: parseFloat(form.querySelector('input[type="number"]:first-of-type').value),
            cost: parseFloat(form.querySelectorAll('input[type="number"]')[1].value),
            category: form.querySelector('select:first-of-type').value,
            status: form.querySelectorAll('select')[1].value,
            description: form.querySelector('textarea').value.trim(),
            isFeatured: form.querySelector('input[type="checkbox"]').checked
        };
        
        // Validate inputs
        if (updatedItem.price <= 0 || updatedItem.cost < 0) {
            this.showNotification('Please enter valid price and cost values', 'warning');
            return;
        }
        
        if (updatedItem.cost > updatedItem.price) {
            this.showNotification('Cost cannot be higher than selling price', 'warning');
            return;
        }
        
        const index = this.menuItems.findIndex(item => item.id === id);
        if (index !== -1) {
            this.menuItems[index] = {
                ...this.menuItems[index],
                ...updatedItem,
                profitMargin: parseFloat(((updatedItem.price - updatedItem.cost) / updatedItem.price * 100).toFixed(1))
            };
            
            this.saveMenuItems();
            this.renderMenuGrid();
            this.updateSummary();
            document.getElementById('editModal').style.display = 'none';
            
            this.showNotification('Menu item updated successfully!', 'success');
        }
    }
    
    showDeleteModal(id) {
        const item = this.menuItems.find(item => item.id === id);
        if (!item) return;
        
        this.selectedItemId = id;
        document.getElementById('deleteItemName').textContent = `"${item.name}"`;
        document.getElementById('deleteModal').style.display = 'flex';
    }
    
    closeDeleteModal() {
        document.getElementById('deleteModal').style.display = 'none';
        this.selectedItemId = null;
    }
    
    confirmDelete() {
        if (!this.selectedItemId) return;
        
        const index = this.menuItems.findIndex(item => item.id === this.selectedItemId);
        if (index !== -1) {
            this.menuItems.splice(index, 1);
            this.saveMenuItems();
            this.renderMenuGrid();
            this.updateSummary();
            this.closeDeleteModal();
            
            this.showNotification('Menu item deleted successfully!', 'warning');
        }
    }
    
    // VIEW PERFORMANCE FUNCTION
    showPerformanceModal() {
        document.getElementById('performanceModal').style.display = 'flex';
        this.renderPerformanceCharts();
        this.renderPerformanceRecommendations();
    }
    
    closePerformanceModal() {
        document.getElementById('performanceModal').style.display = 'none';
    }
    
    switchPerformanceTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.textContent.toLowerCase() === tabName) {
                btn.classList.add('active');
            }
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }
    
    renderPerformanceCharts() {
        if (this.menuItems.length === 0) {
            this.setEmptyPerformanceData();
            return;
        }
        
        const topItem = this.menuItems.reduce((a, b) => a.sales > b.sales ? a : b, this.menuItems[0]);
        const highMarginItem = this.menuItems.reduce((a, b) => a.profitMargin > b.profitMargin ? a : b, this.menuItems[0]);
        const avgMargin = this.menuItems.reduce((sum, item) => sum + item.profitMargin, 0) / this.menuItems.length;
        
        const categorySales = {};
        this.menuItems.forEach(item => {
            categorySales[item.category] = (categorySales[item.category] || 0) + item.sales;
        });
        
        let popularCategory = 'None';
        if (Object.keys(categorySales).length > 0) {
            popularCategory = Object.keys(categorySales).reduce((a, b) => 
                categorySales[a] > categorySales[b] ? a : b
            );
        }
        
        const totalRevenue = this.menuItems.reduce((sum, item) => sum + (item.price * item.sales), 0);
        const avgDailySales = totalRevenue / 30;
        
        document.getElementById('topSellerItem').textContent = `${topItem.name} (${topItem.sales} sold)`;
        document.getElementById('avgDailySales').textContent = `₱${avgDailySales.toFixed(0)}`;
        document.getElementById('highestMarginItem').textContent = `${highMarginItem.name} (${highMarginItem.profitMargin.toFixed(1)}% margin)`;
        document.getElementById('avgMargin').textContent = `${avgMargin.toFixed(1)}%`;
        document.getElementById('popularCategory').textContent = this.formatCategory(popularCategory);
        document.getElementById('reviewItems').textContent = `${this.menuItems.filter(item => item.sales < 10).length} items`;
    }
    
    renderPerformanceRecommendations() {
        const recommendations = document.getElementById('recommendationsList');
        
        if (this.menuItems.length === 0) {
            recommendations.innerHTML = '<li>Add menu items to see performance data</li>';
            return;
        }
        
        let recommendationsHTML = '';
        const lowSalesItems = this.menuItems.filter(item => item.sales < 10);
        const highProfitItems = this.menuItems.filter(item => item.profitMargin > 60);
        const inactiveItems = this.menuItems.filter(item => item.status === 'inactive');
        
        if (lowSalesItems.length > 0) {
            recommendationsHTML += `<li>Consider promoting "${lowSalesItems[0].name}" - low sales detected (${lowSalesItems[0].sales} sold)</li>`;
        }
        
        if (highProfitItems.length > 0) {
            recommendationsHTML += `<li>"${this.formatCategory(highProfitItems[0].category)}" category shows high profit margins (up to ${highProfitItems[0].profitMargin.toFixed(1)}%)</li>`;
        }
        
        if (inactiveItems.length > 0) {
            recommendationsHTML += `<li>Review ${inactiveItems.length} inactive items - consider reactivating or removing</li>`;
        }
        
        if (this.menuItems.length < 10) {
            recommendationsHTML += '<li>Add more menu items to increase customer choice</li>';
        }
        
        recommendations.innerHTML = recommendationsHTML || '<li>Menu performance is good. Keep up the good work!</li>';
    }
    
    setEmptyPerformanceData() {
        document.getElementById('topSellerItem').textContent = 'No items';
        document.getElementById('avgDailySales').textContent = '₱0';
        document.getElementById('highestMarginItem').textContent = 'No items';
        document.getElementById('avgMargin').textContent = '0%';
        document.getElementById('popularCategory').textContent = 'None';
        document.getElementById('reviewItems').textContent = '0 items';
    }
    
    // EXPORT DATA FUNCTION
    exportMenu() {
        if (this.menuItems.length === 0) {
            this.showNotification('No menu items to export', 'warning');
            return;
        }
        
        // Create CSV format
        const headers = ['ID', 'Name', 'Category', 'Price', 'Cost', 'Profit Margin', 'Sales', 'Status', 'Featured', 'Created Date', 'Description'];
        const csvRows = [];
        
        // Add headers
        csvRows.push(headers.join(','));
        
        // Add data rows
        this.menuItems.forEach(item => {
            const row = [
                item.id,
                `"${item.name.replace(/"/g, '""')}"`,
                item.category,
                item.price.toFixed(2),
                item.cost.toFixed(2),
                `${item.profitMargin.toFixed(1)}%`,
                item.sales,
                item.status,
                item.isFeatured ? 'Yes' : 'No',
                item.createdAt,
                `"${item.description.replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });
        
        // Create CSV string
        const csvString = csvRows.join('\n');
        
        // Create download link
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `menu_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('Menu data exported to CSV successfully!', 'info');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="close-notification">&times;</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'warning' ? '#856404' : '#0c5460'};
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 3000;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        notification.querySelector('.close-notification').onclick = () => notification.remove();
    }
}

// Initialize Menu Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.menuManager = new MenuManager();
});

// Global functions for onclick handlers
function showAddDishModal() {
    if (window.menuManager) window.menuManager.showAddDishModal();
}

function closeAddModal() {
    if (window.menuManager) window.menuManager.closeAddModal();
}

function showPerformanceModal() {
    if (window.menuManager) window.menuManager.showPerformanceModal();
}

function closePerformanceModal() {
    if (window.menuManager) window.menuManager.closePerformanceModal();
}

function filterMenu() {
    if (window.menuManager) window.menuManager.filterMenu();
}

function sortMenu() {
    if (window.menuManager) window.menuManager.sortMenu();
}

function searchMenu(query) {
    if (window.menuManager) window.menuManager.searchMenu(query);
}

function clearSearch() {
    if (window.menuManager) window.menuManager.clearSearch();
}

function exportMenu() {
    if (window.menuManager) window.menuManager.exportMenu();
}

function switchPerformanceTab(tabName) {
    if (window.menuManager) window.menuManager.switchPerformanceTab(tabName);
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/login';
    }
}

// Function to handle sidebar search
let debounceTimer;
function debounceSearch(query) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        console.log('Searching for:', query);
    }, 500);
}

// Add function to handle form submission
function addNewMenuItem(event) {
    if (window.menuManager) {
        window.menuManager.handleAddItem(event);
    }
}