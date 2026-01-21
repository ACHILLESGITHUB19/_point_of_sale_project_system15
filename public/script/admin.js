// ==================== GLOBAL VARIABLES ====================
let eventSource = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// ==================== DASHBOARD FUNCTIONS ====================

// Format number with commas
function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

// Format currency (PHP) - FIXED VERSION
function formatCurrency(amount) {
    if (amount === undefined || amount === null) {
        return '₱0.00';
    }
    
    // Ensure amount is a number
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
        return '₱0.00';
    }
    
    // Try using Intl.NumberFormat first
    try {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numAmount);
    } catch (error) {
        // Fallback: manually format with ₱ sign
        return '₱' + numAmount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }
}

// SIMPLER ALTERNATIVE - Use this function instead:
function formatCurrencySimple(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return '₱0.00';
    }
    
    const numAmount = parseFloat(amount);
    const formatted = numAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    return '₱' + formatted;
}

// Update dashboard display - FIXED VERSION
function updateDashboardDisplay(stats) {
    console.log('Updating dashboard with stats:', stats);
    
    // Update Total Orders
    const totalOrdersEl = document.getElementById('totalOrders');
    if (totalOrdersEl) {
        totalOrdersEl.textContent = formatNumber(stats.totalOrders || 0);
    }
    
    // Update Total Revenue - USE FIXED FUNCTION
    const totalRevenueEl = document.getElementById('totalRevenue');
    if (totalRevenueEl) {
        // Clear any existing content first
        totalRevenueEl.textContent = '';
        
        // Use the simple formatter to ensure ₱ sign
        const formattedRevenue = formatCurrencySimple(stats.totalRevenue || 0);
        totalRevenueEl.textContent = formattedRevenue;
        
        console.log('Total revenue formatted:', formattedRevenue);
    }
    
    // Update Total Customers
    const totalCustomersEl = document.getElementById('totalCustomers');
    if (totalCustomersEl) {
        totalCustomersEl.textContent = formatNumber(stats.totalCustomers || 0);
    }
    
    // Update Total Products
    const totalProductsEl = document.getElementById('totalProducts');
    if (totalProductsEl) {
        totalProductsEl.textContent = formatNumber(stats.totalProducts || 0);
    }
}

// ==================== REAL-TIME UPDATES ====================

// Initialize real-time updates
function initRealTimeUpdates() {
    console.log('🚀 Initializing real-time updates...');
    
    // Start SSE connection
    setupSSEConnection();
    
    // Initial stats fetch
    fetchDashboardStats();
    
    // Refresh stats every 30 seconds (fallback)
    setInterval(fetchDashboardStats, 30000);
}

// Setup Server-Sent Events connection
function setupSSEConnection() {
    console.log('📡 Setting up SSE connection...');
    
    // Close existing connection if any
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    
    // Create new SSE connection
    eventSource = new EventSource('/api/admin/events', {
        withCredentials: true
    });
    
    eventSource.onopen = () => {
        console.log('✅ Connected to real-time server');
        isConnected = true;
        reconnectAttempts = 0;
    };
    
    eventSource.onmessage = (event) => {
        console.log('📥 Received SSE message:', event.data);
        try {
            const data = JSON.parse(event.data);
            handleSSEEvent(data);
        } catch (error) {
            console.error('❌ Error parsing SSE event:', error);
        }
    };
    
    eventSource.addEventListener('new_order', (event) => {
        try {
            const data = JSON.parse(event.data);
            handleNewOrderEvent(data);
        } catch (error) {
            console.error('❌ Error processing new order event:', error);
        }
    });
    
    eventSource.addEventListener('stats_update', (event) => {
        try {
            const data = JSON.parse(event.data);
            handleStatsUpdateEvent(data);
        } catch (error) {
            console.error('❌ Error processing stats update:', error);
        }
    });
    
    eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        isConnected = false;
        
        // Try to reconnect
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            const delay = Math.min(3000 * Math.pow(2, reconnectAttempts), 30000);
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`);
            
            setTimeout(() => {
                setupSSEConnection();
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached. Real-time updates disabled.');
            // Fall back to polling
            setInterval(fetchDashboardStats, 10000);
        }
    };
}

// Handle SSE events
function handleSSEEvent(data) {
    console.log('🎯 Handling SSE event:', data.type);
    
    switch (data.type) {
        case 'connected':
            console.log('✅ ' + (data.message || 'Connected to real-time updates'));
            break;
            
        case 'new_order':
            handleNewOrderEvent(data.data);
            break;
            
        case 'stats_update':
            handleStatsUpdateEvent(data.data);
            break;
            
        default:
            console.log('❓ Unknown event type:', data.type);
    }
}

// Handle new order event
function handleNewOrderEvent(orderData) {
    console.log('🆕 New order received:', orderData.orderNumber);
    
    // Show notification
    showOrderNotification(orderData);
    
    // Update orders table
    updateOrdersTable(orderData);
    
    // Refresh stats
    fetchDashboardStats();
}

// Handle stats update event
function handleStatsUpdateEvent(statsData) {
    console.log('📊 Stats update received:', statsData);
    updateDashboardDisplay(statsData);
}

// Show order notification
function showOrderNotification(order) {
    // Remove existing notification
    const existing = document.querySelector('.order-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'order-notification';
    notification.innerHTML = `
        <div class="notification-header">
            <strong>🆕 New Order!</strong>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="notification-body">
            <p><strong>Order #:</strong> ${order.orderNumber}</p>
            <p><strong>Total:</strong> ₱${(order.total || 0).toFixed(2)}</p>
            <p><strong>Type:</strong> ${order.type || 'Dine In'}</p>
            <p><strong>Items:</strong> ${order.items || 1}</p>
            <p><small>${order.timestamp || new Date().toLocaleTimeString()}</small></p>
        </div>
    `;
    
    // Add styles if not present
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .order-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-left: 4px solid #4CAF50;
                border-radius: 8px;
                padding: 15px;
                width: 320px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
                font-family: Arial, sans-serif;
            }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid #eee;
            }
            
            .notification-header strong {
                color: #333;
                font-size: 16px;
            }
            
            .notification-header button {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #999;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            }
            
            .notification-header button:hover {
                background: #f5f5f5;
                color: #333;
            }
            
            .notification-body p {
                margin: 5px 0;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .notification-body strong {
                color: #555;
                font-weight: 600;
                display: inline-block;
                width: 80px;
            }
            
            .notification-body small {
                color: #888;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 8000);
}

// Update orders table
function updateOrdersTable(order) {
    const tableBody = document.getElementById('ordersTableBody');
    if (!tableBody) return;
    
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${order.orderNumber}</td>
        <td>${order.timestamp || new Date().toLocaleTimeString()}</td>
        <td>Walk-in</td>
        <td>₱${(order.total || 0).toFixed(2)}</td>
    `;
    
    // Add animation
    newRow.style.animation = 'fadeIn 0.5s ease';
    
    // Add at top of table
    if (tableBody.firstChild) {
        tableBody.insertBefore(newRow, tableBody.firstChild);
    } else {
        tableBody.appendChild(newRow);
    }
    
    // Limit to 10 rows
    const rows = tableBody.getElementsByTagName('tr');
    if (rows.length > 10) {
        tableBody.removeChild(rows[rows.length - 1]);
    }
    
    // Add fadeIn animation if not present
    if (!document.getElementById('fadeIn-animation')) {
        const style = document.createElement('style');
        style.id = 'fadeIn-animation';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Fetch dashboard stats from server - ENHANCED VERSION
async function fetchDashboardStats() {
    try {
        console.log('📊 Fetching dashboard stats...');
        
        const response = await fetch('/api/stats');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stats = await response.json();
        console.log('📊 Stats fetched:', stats);
        
        // Update dashboard display - USE ENHANCED FUNCTION
        updateDashboardDisplay(stats);
        
        // Debug: Log what's being displayed
        console.log('Total Revenue value:', stats.totalRevenue);
        console.log('Formatted Revenue:', formatCurrencySimple(stats.totalRevenue || 0));
        
        // Update orders table if on dashboard
        if (stats.recentOrders && stats.recentOrders.length > 0) {
            updateRecentOrdersTable(stats.recentOrders);
        }
        
    } catch (error) {
        console.error('❌ Error fetching dashboard stats:', error);
        // Try to show something anyway
        const fallbackStats = {
            totalOrders: 0,
            totalRevenue: 0,
            totalCustomers: 0,
            totalProducts: 0
        };
        updateDashboardDisplay(fallbackStats);
    }
}

// Update recent orders table
function updateRecentOrdersTable(orders) {
    const tableBody = document.getElementById('ordersTableBody');
    if (!tableBody || !orders) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add new rows
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.orderNumber || 'N/A'}</td>
            <td>${order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'N/A'}</td>
            <td>Walk-in</td>
            <td>₱${order.total ? order.total.toFixed(2) : '0.00'}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Cleanup on page unload
function cleanup() {
    if (eventSource) {
        eventSource.close();
        console.log('🔌 SSE connection closed');
    }
}

// ==================== INITIALIZATION ====================

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Dashboard page loaded');
    
    // Check if we're on dashboard page
    const isDashboardPage = window.location.pathname.includes('admindashboard') || 
                           window.location.pathname.includes('dashboard');
    
    console.log('Is dashboard page:', isDashboardPage, 'Path:', window.location.pathname);
    
    if (isDashboardPage) {
        console.log('🏁 Starting dashboard initialization...');
        
        // First, set a default value to ensure something shows
        const totalRevenueEl = document.getElementById('totalRevenue');
        if (totalRevenueEl && totalRevenueEl.textContent.trim() === '') {
            totalRevenueEl.textContent = '₱0.00';
        }
        
        // Initial stats fetch
        fetchDashboardStats();
        
        // Start real-time updates after 1 second
        setTimeout(() => {
            initRealTimeUpdates();
        }, 1000);
        
        // Add emergency fallback to check every 2 seconds
        setInterval(() => {
            const revenueEl = document.getElementById('totalRevenue');
            if (revenueEl && !revenueEl.textContent.includes('₱')) {
                console.log('Emergency: Missing ₱ sign, fixing...');
                const current = revenueEl.textContent;
                revenueEl.textContent = '₱' + current.replace(/[^\d.]/g, '');
            }
        }, 2000);
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
});

// Add a global fix function that can be called from console
window.fixPesoSign = function() {
    const revenueEl = document.getElementById('totalRevenue');
    if (revenueEl) {
        const current = revenueEl.textContent;
        if (!current.includes('₱')) {
            const number = current.replace(/[^\d.]/g, '') || '0.00';
            revenueEl.textContent = '₱' + number;
            console.log('Fixed peso sign:', revenueEl.textContent);
        }
    }
};

// ==================== EXPORTS FOR TESTING ====================

// Only export if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateDashboardDisplay,
        fetchDashboardStats,
        initRealTimeUpdates,
        cleanup
    };
}
