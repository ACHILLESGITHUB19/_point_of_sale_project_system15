// Dashboard Data Object - Shared between admin and staff
const dashboardData = {
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    lastUpdate: null,
    customers: new Set() // Track unique customers
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load dashboard totals
    loadDashboardTotals();
    
    // Set up update listeners
    listenForUpdates();
    
    // Start real-time updates
    startRealTimeUpdates();
});

// Function to load and display totals
function loadDashboardTotals() {
    // Try to get data from localStorage first
    const savedData = localStorage.getItem('dashboardData');
    
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        dashboardData.totalOrders = parsedData.totalOrders || 0;
        dashboardData.totalRevenue = parsedData.totalRevenue || 0;
        dashboardData.totalCustomers = parsedData.totalCustomers || 0;
        
        // Restore customers set if available
        if (parsedData.customerIds) {
            dashboardData.customers = new Set(parsedData.customerIds);
        }
    }
    
    // Update the UI with current data
    updateDashboardDisplay();
    
    // Also try to fetch from server
    fetchUpdatedTotals();
}

function updateDashboardDisplay() {
    // Update Total Orders
    const totalOrdersEl = document.getElementById('totalOrders');
    if (totalOrdersEl) {
        totalOrdersEl.textContent = formatNumber(dashboardData.totalOrders);
    }
    
    // Update Total Revenue
    const totalRevenueEl = document.getElementById('totalRevenue');
    if (totalRevenueEl) {
        totalRevenueEl.textContent = formatCurrency(dashboardData.totalRevenue);
    }
    
    // Update Total Customers
    const totalCustomersEl = document.getElementById('totalCustomers');
    if (totalCustomersEl) {
        totalCustomersEl.textContent = formatNumber(dashboardData.totalCustomers);
    }
    
    // Update last update timestamp
    dashboardData.lastUpdate = new Date().toISOString();
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
}

// Real-time update system
function startRealTimeUpdates() {
    // Option 1: Long polling (every 5 seconds)
    setInterval(fetchUpdatedTotals, 5000);
    
    // Option 2: WebSocket for instant updates
    // setupWebSocketConnection();
}

function fetchUpdatedTotals() {
    // Fetch latest totals from server API
    fetch('/api/dashboard/totals')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            // Update dashboard data
            if (data.totalOrders !== undefined) dashboardData.totalOrders = data.totalOrders;
            if (data.totalRevenue !== undefined) dashboardData.totalRevenue = data.totalRevenue;
            if (data.totalCustomers !== undefined) dashboardData.totalCustomers = data.totalCustomers;
            
            // Update UI
            updateDashboardDisplay();
            
            // Save to localStorage
            saveDashboardData();
        })
        .catch(error => {
            console.log('Using local data:', error.message);
            // If server fetch fails, use local data
            updateDashboardDisplay();
        });
}

// Save dashboard data to localStorage
function saveDashboardData() {
    const dataToSave = {
        totalOrders: dashboardData.totalOrders,
        totalRevenue: dashboardData.totalRevenue,
        totalCustomers: dashboardData.totalCustomers,
        lastUpdate: dashboardData.lastUpdate,
        customerIds: Array.from(dashboardData.customers)
    };
    
    localStorage.setItem('dashboardData', JSON.stringify(dataToSave));
}

// Listen for real-time updates from other tabs/staff dashboard
function listenForUpdates() {
    // Listen for storage events (cross-tab communication)
    window.addEventListener('storage', function(e) {
        if (e.key === 'dashboardData') {
            try {
                const newData = JSON.parse(e.newValue);
                updateFromStorage(newData);
            } catch (error) {
                console.error('Error parsing storage update:', error);
            }
        }
    });
    
    // Use BroadcastChannel API for more reliable communication
    if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('dashboard_updates');
        channel.onmessage = function(e) {
            if (e.data.type === 'dashboard_update') {
                updateFromBroadcast(e.data.payload);
            }
        };
    }
}

function updateFromStorage(newData) {
    // Update dashboard data
    dashboardData.totalOrders = newData.totalOrders || dashboardData.totalOrders;
    dashboardData.totalRevenue = newData.totalRevenue || dashboardData.totalRevenue;
    dashboardData.totalCustomers = newData.totalCustomers || dashboardData.totalCustomers;
    
    // Update customers set
    if (newData.customerIds) {
        dashboardData.customers = new Set(newData.customerIds);
    }
    
    // Update UI
    updateDashboardDisplay();
}

function updateFromBroadcast(payload) {
    if (payload.totalOrders !== undefined) dashboardData.totalOrders = payload.totalOrders;
    if (payload.totalRevenue !== undefined) dashboardData.totalRevenue = payload.totalRevenue;
    if (payload.totalCustomers !== undefined) dashboardData.totalCustomers = payload.totalCustomers;
    
    updateDashboardDisplay();
    saveDashboardData();
}

// Simulated order creation (to be called from staff dashboard)
function createNewOrder(orderDetails) {
    // Update local data
    dashboardData.totalOrders += 1;
    dashboardData.totalRevenue += orderDetails.total || 0;
    
    // Check for new customer
    if (orderDetails.customerId && !dashboardData.customers.has(orderDetails.customerId)) {
        dashboardData.customers.add(orderDetails.customerId);
        dashboardData.totalCustomers = dashboardData.customers.size;
    }
    
    // Update UI
    updateDashboardDisplay();
    
    // Save to localStorage
    saveDashboardData();
    
    // Broadcast update to other tabs
    broadcastUpdate();
    
    // Send to server
    sendOrderToServer(orderDetails);
}

function customerExists(customerId) {
    return dashboardData.customers.has(customerId);
}

function broadcastUpdate() {
    // Update localStorage to trigger storage event
    saveDashboardData();
    
    // Use BroadcastChannel if available
    if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('dashboard_updates');
        channel.postMessage({
            type: 'dashboard_update',
            payload: {
                totalOrders: dashboardData.totalOrders,
                totalRevenue: dashboardData.totalRevenue,
                totalCustomers: dashboardData.totalCustomers,
                lastUpdate: dashboardData.lastUpdate
            }
        });
    }
}

function sendOrderToServer(orderDetails) {
    // Send order to backend server
    fetch('/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderDetails)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Order saved to server:', data);
    })
    .catch(error => {
        console.error('Error saving order:', error);
    });
}

// WebSocket setup for real-time communication
function setupWebSocketConnection() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/dashboard`;
    
    try {
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = function() {
            console.log('WebSocket connection established');
        };
        
        socket.onmessage = function(event) {
            const data = JSON.parse(event.data);
            
            if (data.type === 'dashboard_update') {
                updateFromBroadcast(data.payload);
            }
        };
        
        socket.onclose = function() {
            console.log('WebSocket disconnected, retrying in 5 seconds...');
            setTimeout(setupWebSocketConnection, 5000);
        };
        
        socket.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
    } catch (error) {
        console.log('WebSocket not available, using fallback methods');
    }
}

// Export functions for use in staff dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        dashboardData,
        createNewOrder,
        loadDashboardTotals,
        updateDashboardDisplay
    };
}