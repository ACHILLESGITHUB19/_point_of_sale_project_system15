let currentOrder = [];
let orderType = null;
let currentCategory = 'all';
let selectedPaymentMethod = null;
let orderCounter = 1;
let currentAmountPaid = 0;
let todaysSales = 0;
let totalSales = 0;
let totalTransactions = 0;
let productCatalog = [];

// Load menu items from API when page loads
document.addEventListener('DOMContentLoaded', function() {
  loadMenuItemsFromAPI();
  setupCategoryButtons();
  
  // Initial setup
  renderMenu();
  updatePayButtonState();
  
  if (!orderType) {
    setDineIn();
  }
  
  initializeQRCodeImages();
  
  // Event listeners
  const tableInput = document.getElementById('tableNumber');
  if (tableInput) {
    tableInput.addEventListener('input', updatePayButtonState);
  }
  
  const inputPayment = document.getElementById('inputPayment');
  if (inputPayment) {
    inputPayment.addEventListener('input', updatePayButtonState);
  }
  
  // Category buttons
  const categoryButtons = document.querySelectorAll('.category-btn');
  if (categoryButtons.length > 0) {
    categoryButtons.forEach(btn => {
      const category = btn.getAttribute('data-category');
      btn.addEventListener('click', () => filterCategory(category));
      
      if (category === 'all') {
        btn.classList.add('active');
      }
    });
  }
  
  // Search input
  const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchFood(e.target.value);
    });
  }
  
  console.log('Point of Sale System - GCash & Cash Payment Methods Only');
  
  // Sync pending orders on load
  syncPendingOrders();
  setInterval(syncPendingOrders, 300000);
});

// Load menu items from the API
async function loadMenuItemsFromAPI() {
  try {
    const response = await fetch('/api/menu', {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Failed to load menu items:', response.status);
      loadDefaultCatalog();
      return;
    }

    const result = await response.json();
    
    if (result.success && result.data) {
      productCatalog = result.data.map(item => ({
        name: item.name,
        price: item.price,
        category: item.category,
        image: item.image || 'default_food.jpg',
        stock: 100,
        unit: 'pcs',
        vatable: true,
        _id: item._id
      }));
      
      console.log('Menu items loaded from API:', productCatalog.length);
      renderMenu();
    } else {
      console.error('Invalid API response:', result);
      loadDefaultCatalog();
    }
  } catch (error) {
    console.error('Error loading menu items from API:', error);
    loadDefaultCatalog();
  }
}

// Setup category button listeners
function setupCategoryButtons() {
  const categoryButtons = document.querySelectorAll('.category-btn');
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      categoryButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentCategory = this.dataset.category;
      renderMenu();
    });
  });
}

// Complete loadDefaultCatalog function with ALL products
function loadDefaultCatalog() {
  productCatalog = [
    // Rice Bowl Meals
    { name: 'Korean Spicy Bulgogi (Pork)', price: 158, category: 'Rice', image: 'rice/korean_spicy_bulgogi.png', stock: 100, unit: 'pcs', vatable: true },
    { name: 'Korean Salt and Pepper (Pork)', price: 158, category: 'Rice', image: 'rice/korean_salt_pepper_pork.png', stock: 100, unit: 'pcs', vatable: true },
    { name: 'Crispy Pork Lechon Kawali', price: 158, category: 'Rice', image: 'rice/lechon_kawali.png', stock: 100, unit: 'pcs', vatable: true },
    { name: 'Cream Dory Fish Fillet', price: 138, category: 'Rice', image: 'rice/cream_dory.png', stock: 100, unit: 'pcs', vatable: true },
    { name: 'Buttered Honey Chicken', price: 128, category: 'Rice', image: 'rice/buttered_honey_chicken.png', stock: 100, unit: 'pcs', vatable: true },
    { name: 'Buttered Spicy Chicken', price: 128, category: 'Rice', image: 'rice/buttered_spicy_chicken.png', stock: 100, unit: 'pcs', vatable: true },
    { name: 'Chicken Adobo', price: 128, category: 'Rice', image: 'rice/chicken_adobo.png', stock: 100, unit: 'pcs', vatable: true },
    { name: 'Pork Shanghai', price: 128, category: 'Rice', image: 'rice/pork_shanghai.png', stock: 100, unit: 'pcs', vatable: true },
    
    // Hot Sizzlers
    { name: 'Sizzling Pork Sisig', price: 168, category: 'Sizzling', image: 'sizzling/pork_sisig.png', stock: 100, unit: 'pcs', vatable: true },
    { name: 'Sizzling Liempo', price: 168, category: 'Sizzling', image: 'sizzling/liempo.png', stock: 100, unit: 'pcs', vatable: true },
    { name: 'Sizzling Porkchop', price: 148, category: 'Sizzling', image: 'sizzling/porkchop.png', stock: 100, unit: 'pcs', vatable: true },
    { name: 'Sizzling Fried Chicken', price: 148, category: 'Sizzling', image: 'sizzling/fried_chicken.png', stock: 100, unit: 'pcs', vatable: true },
    
    // Party Tray
    { name: 'Pancit Bihon (S)', price: 300, category: 'Party', image: 'party/pancit_bihon_small.png', stock: 100, unit: 'trays', vatable: true },
    { name: 'Pancit Bihon (M)', price: 500, category: 'Party', image: 'party/pancit_bihon_medium.png', stock: 100, unit: 'trays', vatable: true },
    { name: 'Pancit Bihon (L)', price: 700, category: 'Party', image: 'party/pancit_bihon_large.png', stock: 100, unit: 'trays', vatable: true },
    { name: 'Pancit Canton (S)', price: 300, category: 'Party', image: 'party/pancit_canton_small.png', stock: 100, unit: 'trays', vatable: true },
    { name: 'Pancit Canton (M)', price: 500, category: 'Party', image: 'party/pancit_canton_medium.png', stock: 100, unit: 'trays', vatable: true },
    { name: 'Pancit Canton (L)', price: 700, category: 'Party', image: 'party/pancit_canton_large.png', stock: 100, unit: 'trays', vatable: true },
    { name: 'Spaghetti (S)', price: 400, category: 'Party', image: 'party/spaghetti_small.png', stock: 100, unit: 'trays', vatable: true },
    { name: 'Spaghetti (M)', price: 700, category: 'Party', image: 'party/spaghetti_medium.png', stock: 100, unit: 'trays', vatable: true },
    { name: 'Spaghetti (L)', price: 1000, category: 'Party', image: 'party/spaghetti_large.png', stock: 100, unit: 'trays', vatable: true },
    
    // Drinks
    { name: 'Cucumber Lemonade (Glass)', price: 38, category: 'Drink', image: 'drinks/cucumber_lemonade.png', stock: 100, unit: 'glasses', vatable: true },
    { name: 'Cucumber Lemonade (Pitcher)', price: 108, category: 'Drink', image: 'drinks/cucumber_lemonade_pitcher.png', stock: 100, unit: 'pitchers', vatable: true },
    { name: 'Blue Lemonade (Glass)', price: 38, category: 'Drink', image: 'drinks/blue_lemonade.png', stock: 100, unit: 'glasses', vatable: true },
    { name: 'Blue Lemonade (Pitcher)', price: 108, category: 'Drink', image: 'drinks/blue_lemonade_pitcher.png', stock: 100, unit: 'pitchers', vatable: true },
    { name: 'Red Tea (Glass)', price: 38, category: 'Drink', image: 'drinks/red_tea.png', stock: 100, unit: 'glasses', vatable: true },
    { name: 'Soda (Mismo)', price: 28, category: 'Drink', image: 'drinks/soda_mismo.png', stock: 100, unit: 'bottles', vatable: true },
    { name: 'Soda 1.5L', price: 118, category: 'Drink', image: 'drinks/soda_1.5liter.png', stock: 100, unit: 'bottles', vatable: true },
    
    // Coffee
    { name: 'Cafe Americano Tall', price: 88, category: 'Cafe', image: 'coffee/cafe_americano_tall.png', stock: 100, unit: 'cups', vatable: true },
    { name: 'Cafe Americano Grande', price: 108, category: 'Cafe', image: 'coffee/cafe_americano_grande.png', stock: 100, unit: 'cups', vatable: true },
    { name: 'Cafe Latte Tall', price: 108, category: 'Cafe', image: 'coffee/cafe_latte_tall.png', stock: 100, unit: 'cups', vatable: true },
    { name: 'Cafe Latte Grande', price: 128, category: 'Cafe', image: 'coffee/cafe_latte_grande.png', stock: 100, unit: 'cups', vatable: true },
    { name: 'Caramel Macchiato Tall', price: 108, category: 'Cafe', image: 'coffee/caramel_macchiato_tall.png', stock: 100, unit: 'cups', vatable: true },
    { name: 'Caramel Macchiato Grande', price: 128, category: 'Cafe', image: 'coffee/caramel_macchiato_grande.png', stock: 100, unit: 'cups', vatable: true },
    
    // Milk Tea
    { name: 'Milk Tea Regular HC', price: 68, category: 'Milk', image: 'milktea/Milktea_regular.png', stock: 100, unit: 'cups', vatable: true },
    { name: 'Milk Tea Regular MC', price: 88, category: 'Milk', image: 'milktea/Milktea_regular_MC.png', stock: 100, unit: 'cups', vatable: true },
    { name: 'Matcha Green Tea HC', price: 78, category: 'Milk', image: 'milktea/Matcha_greentea_HC.png', stock: 100, unit: 'cups', vatable: true },
    { name: 'Matcha Green Tea MC', price: 88, category: 'Milk', image: 'milktea/Matcha_greentea_MC.png', stock: 100, unit: 'cups', vatable: true },
    
    // Frappe
    { name: 'Matcha Green Tea HC', price: 108, category: 'Frappe', image: 'frappe/Matcha_greentea_HC.png', stock: 100, unit: 'cups', vatable: true },
    { name: 'Matcha Green Tea MC', price: 138, category: 'Frappe', image: 'frappe/Matcha_greentea_MC.png', stock: 100, unit: 'cups', vatable: true },
    { name: 'Cookies & Cream HC', price: 98, category: 'Frappe', image: 'frappe/Cookies_&Cream_HC.png', stock: 100, unit: 'cups', vatable: true },
    { name: 'Cookies & Cream MC', price: 128, category: 'Frappe', image: 'frappe/Cookies_&Cream_MC.png', stock: 100, unit: 'cups', vatable: true },
    { name: 'Strawberry & Cream HC', price: 180, category: 'Frappe', image: 'frappe/Strawberry_Cream_frappe_HC.png', stock: 100, unit: 'cups', vatable: true },
    { name: 'Mango cheese cake HC', price: 180, category: 'Frappe', image: 'frappe/Mango_cheesecake_HC.png', stock: 100, unit: 'cups', vatable: true },
    
    // Snack & Appetizer
    { name: 'Cheesy Nachos', price: 88, category: 'Snack & Appetizer', image: 'snacks/cheesy_nachos.png', stock: 100, unit: 'servings', vatable: true },
    { name: 'Nachos Supreme', price: 108, category: 'Snack & Appetizer', image: 'snacks/nachos_supreme.png', stock: 100, unit: 'servings', vatable: true },
    { name: 'French fries', price: 58, category: 'Snack & Appetizer', image: 'snacks/french_fries.png', stock: 100, unit: 'servings', vatable: true },
    { name: 'Clubhouse Sandwich', price: 118, category: 'Snack & Appetizer', image: 'snacks/club_house_sandwich.png', stock: 100, unit: 'sandwiches', vatable: true },
    { name: 'Fish and Fries', price: 128, category: 'Snack & Appetizer', image: 'snacks/fish_fries.png', stock: 100, unit: 'servings', vatable: true },
    { name: 'Cheesy Dynamite Lumpia', price: 88, category: 'Snack & Appetizer', image: 'snacks/Cheesy_dynamite.png', stock: 100, unit: 'pieces', vatable: true },
    { name: 'Lumpiang Shanghai', price: 88, category: 'Snack & Appetizer', image: 'snacks/lumpiang_shanghai.png', stock: 100, unit: 'pieces', vatable: true },
    
    // Budget Meals Served with Rice
    { name: 'Fried Chicken', price: 78, category: 'Budget Meals Served with Rice', image: 'budget/fried_chicken_Meal.png', stock: 100, unit: 'meals', vatable: true },
    { name: 'Buttered Honey Chicken', price: 78, category: 'Budget Meals Served with Rice', image: 'budget/buttered_honey_chicken.png', stock: 100, unit: 'meals', vatable: true },
    { name: 'Buttered Spicy Chicken', price: 78, category: 'Budget Meals Served with Rice', image: 'budget/buttered_spicy_chicken.png', stock: 100, unit: 'meals', vatable: true },
    { name: 'Tinapa Rice', price: 108, category: 'Budget Meals Served with Rice', image: 'budget/Tinapa_fried_rice.png', stock: 100, unit: 'meals', vatable: true },
    { name: 'Tuyo Pesto', price: 108, category: 'Budget Meals Served with Rice', image: 'budget/Tuyo_pesto.png', stock: 100, unit: 'meals', vatable: true },
    { name: 'Fried Rice', price: 128, category: 'Budget Meals Served with Rice', image: 'budget/fried_rice.png', stock: 100, unit: 'servings', vatable: true },
    { name: 'Plain Rice', price: 18, category: 'Budget Meals Served with Rice', image: 'budget/plain_rice.png', stock: 100, unit: 'bowls', vatable: true },
    
    // Specialties
    { name: 'Sinigang (PORK)', price: 188, category: 'Specialties', image: 'specialties/sinigang_pork.png', stock: 100, unit: 'servings', vatable: true },
    { name: 'Sinigang (Shrimp)', price: 178, category: 'Specialties', image: 'specialties/sinigang_shrimp.png', stock: 100, unit: 'servings', vatable: true },
    { name: 'Paknet (Pakbet w/ Bagnet)', price: 188, category: 'Specialties', image: 'specialties/paknet.png', stock: 100, unit: 'servings', vatable: true },
    { name: 'Buttered Shrimp', price: 108, category: 'Specialties', image: 'specialties/buttered_shrimp.png', stock: 100, unit: 'servings', vatable: true },
    { name: 'Special Bulalo (good for 2-3 Persons)', price: 128, category: 'Specialties', image: 'specialties/Special_Bulalo.png', stock: 100, unit: 'pots', vatable: true },
    { name: 'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)', price: 180, category: 'Specialties', image: 'specialties/Special_Bulalo_buy1_take1.png', stock: 100, unit: 'pots', vatable: false }
  ];
  renderMenu();
}


function checkAllFieldsFilled() {
  const hasItems = currentOrder.length > 0;
  const hasOrderType = orderType && orderType !== "None";
  const hasPaymentMethod = selectedPaymentMethod && selectedPaymentMethod.trim() !== '';
  
  let hasTableNumber = true;
  if (orderType === "Dine In") {
    const tableInput = document.getElementById('tableNumber');
    hasTableNumber = tableInput && tableInput.value.trim() !== '';
  }
  
  let hasPaymentAmount = true;
  if (selectedPaymentMethod === 'cash') {
    const inputPayment = document.getElementById('inputPayment');
    hasPaymentAmount = inputPayment && inputPayment.value.trim() !== '';
  }
  
  return hasItems && hasOrderType && hasPaymentMethod && hasTableNumber && hasPaymentAmount;
}

function updatePayButtonState() {
  const payButton = document.getElementById('payButton');
  if (!payButton) return;
  
  const allFieldsFilled = checkAllFieldsFilled();
  
  if (allFieldsFilled) {
    payButton.disabled = false;
    payButton.style.opacity = '1';
    payButton.style.cursor = 'pointer';
    payButton.style.backgroundColor = '#28a745';
  } else {
    payButton.disabled = true;
    payButton.style.opacity = '0.6';
    payButton.style.cursor = 'not-allowed';
    payButton.style.backgroundColor = '#6c757d';
  }
}

function searchFood(searchTerm) {
  const container = document.getElementById('menuContainer');
  if (!container) return;
  
  if (!searchTerm.trim()) {
    renderMenu();
    return;
  }
  
  const term = searchTerm.toLowerCase().trim();
  const filteredProducts = productCatalog.filter(product => {
    if (currentCategory !== 'all' && product.category !== currentCategory) return false;
    if (product.name.toLowerCase().includes(term)) return true;
    if (product.category.toLowerCase().includes(term)) return true;
    return false;
  });
  
  container.innerHTML = '';
  
  if (filteredProducts.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h3>No products found</h3>
        <p>Try searching with different keywords</p>
      </div>
    `;
    return;
  }
  
  filteredProducts.forEach(product => {
    const card = createProductCard(product);
    container.appendChild(card);
  });
  
  updatePayButtonState();
}

function renderMenu() {
  const container = document.getElementById('menuContainer');
  if (!container) return;
  container.innerHTML = '';

  const items = currentCategory === 'all'
    ? productCatalog
    : productCatalog.filter(p => p.category === currentCategory);

  if (items.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <i class="fas fa-utensils"></i>
        <h3>No products in this category</h3>
        <p>Try selecting a different category</p>
      </div>
    `;
    return;
  }

  items.forEach(product => {
    const card = createProductCard(product);
    container.appendChild(card);
  });
  
  updatePayButtonState();
}

// SINGLE CORRECTED createProductCard function
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'compact-product-card';
  
  const isOutOfStock = product.stock <= 0;
  
  if (isOutOfStock) {
    card.classList.add('out-of-stock');
  } else {
    card.onclick = () => addItemToOrder(product.name, product.price, product.stock);
  }

  let stockStatus = '';
  let stockClass = '';
  
  if (product.stock <= 0) {
    stockStatus = 'Out of Stock';
    stockClass = 'out-stock';
  } else if (product.stock <= 10) {
    stockStatus = `${product.stock} ${product.unit} left`;
    stockClass = 'low-stock';
  } else if (product.stock <= 30) {
    stockStatus = `${product.stock} ${product.unit}`;
    stockClass = 'medium-stock';
  } else {
    stockStatus = `${product.stock} ${product.unit} available`;
    stockClass = 'high-stock';
  }

  // CORRECTED IMAGE PATH - Using organized folder structure
  card.innerHTML = `
    <img src="/images/${product.image}" 
         onerror="this.onerror=null; this.src='/images/default_food.jpg';" 
         alt="${product.name}" />
    <div class="compact-product-name">${product.name}</div>
    <div class="compact-product-category">${product.category}</div>
    <div class="compact-product-price">₱${product.price}</div>
    <div class="compact-product-stock ${stockClass}">
      ${stockStatus}
    </div>
  `;
  
  return card;
}

function addItemToOrder(name, price, stock) {
  const product = productCatalog.find(p => p.name === name);
  
  if (!product) {
    alert('Product Not Found In Menu');
    return;
  }
  
  if (product.stock <= 0) {
    alert(`Sorry, ${name} is out of stock!`);
    return;
  }
  
  const existingItem = currentOrder.find(i => i.name === name);
  
  const currentQuantity = existingItem ? existingItem.quantity : 0;
  if (currentQuantity >= product.stock) {
    alert(`Only ${product.stock} ${product.unit} of ${name} available in stock!`);
    return;
  }
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    currentOrder.push({ 
      name, 
      price, 
      quantity: 1, 
      stock: product.stock, 
      unit: product.unit, 
      vatable: product.vatable,
      _id: product._id,
      image: product.image 
    });
  }
  
  renderOrder();
  updateInputPaymentField();
  updatePayButtonState();
}

function removeItemFromOrder(index) {
  if (currentOrder[index].quantity > 1) {
    currentOrder[index].quantity--;
  } else {
    currentOrder.splice(index, 1);
  }
  renderOrder();
  updateInputPaymentField();
  updatePayButtonState();
}

function renderOrder() {
  const list = document.getElementById('productlist');
  const subtotalEl = document.getElementById('subtotal');
  const taxEl = document.getElementById('tax');
  const totalEl = document.getElementById('totals');

  if (!list) {
    console.error('productlist element not found!');
    return;
  }

  list.innerHTML = '';
  let subtotal = 0;
  let vatableAmount = 0;

  currentOrder.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    
    if (item.vatable) {
      vatableAmount += itemTotal;
    }

    const product = productCatalog.find(p => p.name === item.name);
    const remainingStock = product ? product.stock - item.quantity : 0;
    
    list.innerHTML += `
      <li>
        <div class="order-item-info">
          <span class="order-item-name">${item.name}</span>
          <span class="order-item-stock">Stock: ${remainingStock} ${item.unit || 'left'}</span>
        </div>
        <div class="order-item-controls">
          <span class="order-item-quantity">x${item.quantity}</span>
          <span class="order-item-price">₱${itemTotal.toFixed(2)}</span>
          <button onclick="removeItemFromOrder(${index})" class="remove-item-btn">✕</button>
        </div>
      </li>`;
  });

  const fixedTax = 57.70;
  const total = subtotal + fixedTax;

  if (subtotalEl) subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
  if (taxEl) taxEl.textContent = '₱57.70';
  if (totalEl) totalEl.textContent = `${total.toFixed(2)}`;
  
  updatePayButtonState();
}

function updateStockAfterPayment() {
  currentOrder.forEach(orderItem => {
    const productIndex = productCatalog.findIndex(p => p.name === orderItem.name);
    if (productIndex !== -1) {
      productCatalog[productIndex].stock -= orderItem.quantity;
      if (productCatalog[productIndex].stock < 0) {
        productCatalog[productIndex].stock = 0;
      }
    }
  });
  
  renderMenu();
}

function setDineIn() {
  orderType = "Dine In";
  
  const display = document.getElementById("orderTypeDisplay");
  if (display) display.textContent = orderType;
  
  const dineInBtn = document.querySelector('.dineinandtakeout-btn:nth-child(1)');
  const takeoutBtn = document.querySelector('.dineinandtakeout-btn:nth-child(2)');
  
  if (dineInBtn) dineInBtn.classList.add('active');
  if (takeoutBtn) takeoutBtn.classList.remove('active');
  
  const tableInput = document.getElementById('tableNumber');
  if (tableInput) {
    tableInput.placeholder = "Enter Table:";
    tableInput.value = '';
    tableInput.disabled = false;
  }
  
  updatePayButtonState();
}

function setTakeout() {
  orderType = "Take Out";
  
  const display = document.getElementById("orderTypeDisplay");
  if (display) display.textContent = orderType;
  
  const dineInBtn = document.querySelector('.dineinandtakeout-btn:nth-child(1)');
  const takeoutBtn = document.querySelector('.dineinandtakeout-btn:nth-child(2)');
  
  if (dineInBtn) dineInBtn.classList.remove('active');
  if (takeoutBtn) takeoutBtn.classList.add('active');
  
  const tableInput = document.getElementById('tableNumber');
  if (tableInput) {
    tableInput.value = 'Takeout';
    tableInput.disabled = true;
  }
  
  updatePayButtonState();
}

function selectPaymentMethod(method) {
  selectedPaymentMethod = method.toLowerCase();
  
  const buttons = document.querySelectorAll('.payment-method-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    btn.style.backgroundColor = '';
    btn.style.color = '';
  });
  
  const clickedButton = event ? event.currentTarget : null;
  
  if (clickedButton) {
    clickedButton.classList.add('active');
    clickedButton.style.backgroundColor = '#28a745';
    clickedButton.style.color = 'white';
  } else {
    const buttonsArray = Array.from(buttons);
    const selectedBtn = buttonsArray.find(btn => {
      const onclickAttr = btn.getAttribute('onclick');
      return onclickAttr && onclickAttr.toLowerCase().includes(method.toLowerCase());
    });
    
    if (selectedBtn) {
      selectedBtn.classList.add('active');
      selectedBtn.style.backgroundColor = '#28a745';
      selectedBtn.style.color = 'white';
    }
  }
  
  updatePaymentMethodDisplay();
  updateInputPaymentField();
  
  if (method.toLowerCase() === 'gcash' && currentOrder.length > 0) {
    const totalEl = document.getElementById('totals');
    const totalAmount = parseFloat(totalEl?.textContent) || 0;
    
    if (totalAmount > 0) {
      showQRCodeModal(method.toLowerCase(), totalAmount, true);
    } else {
      showQRCodeModal(method.toLowerCase(), 0, true);
    }
  }
}

function updatePaymentMethodDisplay() {
  const displayElement = document.getElementById("paymentMethodDisplay");
  
  if (displayElement) {
    let displayText = "None";
    
    switch(selectedPaymentMethod) {
      case 'gcash':
        displayText = 'GCash';
        break;
      case 'cash':
        displayText = 'Cash';
        break;
      default:
        if (selectedPaymentMethod) {
          displayText = selectedPaymentMethod.charAt(0).toUpperCase() + selectedPaymentMethod.slice(1);
        }
    }
    
    displayElement.textContent = displayText;
  }
}

function updateInputPaymentField() {
  const inputPayment = document.getElementById('inputPayment');
  const changeSection = document.getElementById('changeSection');
  
  if (!inputPayment) return;
  
  if (selectedPaymentMethod === 'cash' && currentOrder.length > 0) {
    inputPayment.disabled = false;
    inputPayment.placeholder = "Enter Cash Amount";
    inputPayment.value = '';
    inputPayment.oninput = calculateChange;
    
    setTimeout(() => {
      inputPayment.focus();
    }, 100);
  } else {
    inputPayment.disabled = true;
    inputPayment.placeholder = "Select Cash Payment First";
    inputPayment.value = '';
    if (changeSection) changeSection.style.display = 'none';
  }
  
  updatePayButtonState();
}

function calculateChange() {
  const inputPayment = document.getElementById('inputPayment');
  const changeSection = document.getElementById('changeSection');
  const changeAmount = document.getElementById('changeAmount');
  const totalEl = document.getElementById('totals');
  
  if (!inputPayment || !changeSection || !changeAmount || !totalEl) return;
  
  const total = parseFloat(totalEl.textContent.replace('₱', '')) || 0;
  const paid = parseFloat(inputPayment.value) || 0;
  
  if (paid >= total && paid > 0) {
    const change = paid - total;
    changeAmount.textContent = change.toFixed(2);
    changeSection.style.display = 'block';
  } else {
    changeSection.style.display = 'none';
  }
  
  updatePayButtonState();
}

function showModal(title, content, modalClass = '') {
  let modal = document.getElementById('customModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'customModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    document.body.appendChild(modal);
  }
  
  modal.className = modalClass;
  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 400px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: modalFadeIn 0.3s ease;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid #e9ecef;
        background: #f8f9fa;
        border-radius: 8px 8px 0 0;
      ">
        <h3 style="margin: 0; color: #333; font-size: 18px;">${title}</h3>
        <button onclick="closeQRCodeModal()" style="
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
          padding: 0;
          line-height: 1;
        ">&times;</button>
      </div>
      <div style="padding: 20px;">
        ${content}
      </div>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
  
  modal.style.display = 'flex';
  modal.onclick = function(e) {
    if (e.target === modal) {
      closeQRCodeModal();
    }
  };
}

function closeQRCodeModal() {
  const modal = document.getElementById('customModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function showQRCodeModal(method, totalAmount, isPreview = false) {
  const methodName = 'GCash';
  const imageFilename = 'gcash-qr.png';
  
  const modalContent = `
    <div style="text-align: center; padding: 20px;">
      <h3 style="margin-bottom: 20px; color: #333;">${methodName} Payment</h3>
      
      ${totalAmount > 0 ? `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; border: 2px solid #28a745;">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #495057;">Total Amount</div>
          <div style="font-size: 32px; color: #28a745; font-weight: bold;">₱${totalAmount.toFixed(2)}</div>
        </div>
      ` : `
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ffeaa7;">
          <div style="font-size: 14px; color: #856404;">
            <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
            Add items to order to see the total amount
          </div>
        </div>
      `}
      
      <div style="margin-bottom: 20px;">
        <img src="/images/${imageFilename}" onerror="this.src='/images/default.png'; this.onerror=null;" alt="${methodName} QR Code" style="width: 250px; height: 250px; border: 2px solid #ddd; padding: 15px; background: white;">
      </div>
      
      <div style="margin-bottom: 25px; color: #666; font-size: 14px; font-weight: bold;">
        ${methodName} QR Code
      </div>
      
      ${!isPreview ? `
        <div style="display: flex; gap: 15px; justify-content: center;">
          <button onclick="completeQRPayment('${method}', ${totalAmount})" style="padding: 12px 35px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; min-width: 160px;">
            <i class="fas fa-check-circle" style="margin-right: 8px;"></i>
            Payment Done
          </button>
          <button onclick="closeQRCodeModal()" style="padding: 12px 25px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; min-width: 120px;">
            <i class="fas fa-times-circle" style="margin-right: 8px;"></i>
            Cancel
          </button>
        </div>
      ` : `
        <button onclick="closeQRCodeModal()" style="padding: 12px 40px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; min-width: 160px;">
          <i class="fas fa-times" style="margin-right: 8px;"></i>
          Close Preview
        </button>
      `}
    </div>
  `;
  
  showModal(`Pay with ${methodName}`, modalContent, 'qr-code-modal');
}

function completeQRPayment(method, total) {
  closeQRCodeModal();
  
  const tableNumber = orderType.toLowerCase() === 'dine in' 
    ? (document.getElementById('tableNumber')?.value || '1')
    : 'N/A';
  
  const methodName = 'GCash';
  const confirmMessage = `Confirm ${methodName} Payment:\n\n` +
    `Order Type: ${orderType}\n` +
    `Table: ${tableNumber}\n` +
    `Payment Method: ${methodName}\n` +
    `Total Amount: ₱${total.toFixed(2)}\n\n` +
    `Have you received payment confirmation in ${methodName}?`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  completePayment(method, total, total, 0, tableNumber);
}

function initializeQRCodeImages() {
  const qrImages = [
    { path: '/images/gcash-qr.png', method: 'GCash' },
    { path: '/images/default.png', method: 'Default' }
  ];
  
  qrImages.forEach(qr => {
    const img = new Image();
    img.src = qr.path;
  });
}

// Save order locally (fallback when offline)
function saveOrderLocally(orderData) {
  try {
    let pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
    pendingOrders.push({
      ...orderData,
      _localId: Date.now().toString(),
      _synced: false,
      _timestamp: new Date().toISOString()
    });
    localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders));
    console.log('Order saved locally for later sync');
  } catch (error) {
    console.error('Error saving order locally:', error);
  }
}

// Sync pending orders
async function syncPendingOrders() {
  try {
    const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
    const unsyncedOrders = pendingOrders.filter(order => !order._synced);
    
    for (const order of unsyncedOrders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order),
          credentials: 'include'
        });
        
        if (response.ok) {
          order._synced = true;
          order._syncedAt = new Date().toISOString();
        }
      } catch (syncError) {
        console.error('Error syncing order:', syncError);
      }
    }
    
    localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders.filter(order => !order._synced)));
    
    if (unsyncedOrders.length > 0) {
      console.log(`Synced ${unsyncedOrders.filter(o => o._synced).length} pending orders`);
    }
  } catch (error) {
    console.error('Error syncing pending orders:', error);
  }
}

// Save order to MongoDB
async function saveOrderToMongoDB(orderData) {
  try {
    console.log('Saving order to MongoDB...');
    
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('Order saved to MongoDB:', result);
      return {
        success: true,
        orderId: result.orderId,
        orderNumber: result.orderNumber
      };
    } else {
      throw new Error(result.message || 'Failed to save order');
    }
  } catch (error) {
    console.error('Error saving order to MongoDB:', error);
    
    // Fallback: Try to save locally and sync later
    saveOrderLocally(orderData);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// SINGLE completePayment function - THIS IS THE ONLY ONE NOW
async function completePayment(paymentMethod, total, paid, change, tableNumber) {
  console.log('completePayment called:', { paymentMethod, total, paid, change, tableNumber });
  
  // Calculate subtotal
  const subtotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Prepare order data - FIXED: Changed 'id' to 'productId' to match server expectation
  const orderData = {
    items: currentOrder.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      size: "Regular",
      image: item.image || 'default_food.jpg',
      id: item._id || null  // Changed from productId to id to match server
    })),
    subtotal: subtotal,
    tax: 57.70,
    total: total,
    type: orderType || "Dine In",
    notes: "",
    payment: {
      method: paymentMethod,
      amountPaid: paid,
      change: change
    }
  };
  
  console.log('Sending order data to server:', orderData);
  
  try {
    // 1. Save to MongoDB
    const saved = await saveOrderToMongoDB(orderData);
    
    if (saved.success) {
      // 2. Update local stock
      updateStockAfterPayment();
      
      // 3. Print receipt
      await printReceipt({
        ...orderData,
        orderNumber: saved.orderNumber,
        tableNumber: tableNumber,
        paymentMethod: paymentMethod,
        amountPaid: paid,
        change: change,
        vatAmount: 57.70,
        vatableAmount: subtotal - 57.70
      });
      
      // 4. Show success message
      alert(`Payment Successful!\n\nOrder #: ${saved.orderNumber}\nTotal: ₱${total.toFixed(2)}\nThank you!`);
      
      // 5. Reset UI
      resetOrderUI();
      
    } else {
      alert('Error: ' + (saved.error || 'Failed to save order'));
    }
  } catch (error) {
    console.error('Error in completePayment:', error);
    alert('Payment processed but failed to save to database. Please inform admin.');
    resetOrderUI();
  }
}

// MAIN PAYMENT FUNCTION
function Payment() {
  console.log('=== PAYMENT PROCESS STARTED ===');
  console.log('currentOrder:', JSON.stringify(currentOrder, null, 2));
  console.log('orderType:', orderType);
  console.log('selectedPaymentMethod:', selectedPaymentMethod);
  
  if (!Array.isArray(currentOrder) || currentOrder.length === 0) {
    alert("Please Add Product First");
    return;
  }
  
  if (!orderType || orderType.trim() === '' || orderType === "None") {
    alert("Please Choose if Dine or Take Out");
    return;
  }
  
  if (!selectedPaymentMethod || selectedPaymentMethod.trim() === '') {
    alert("Please Select a payment method");
    return;
  }
  
  if (orderType === "Dine In") {
    const tableInput = document.getElementById('tableNumber');
    if (!tableInput || !tableInput.value.trim()) {
      alert("Please Enter table number");
      tableInput?.focus();
      return;
    }
  }
  
  for (let i = 0; i < currentOrder.length; i++) {
    const item = currentOrder[i];
    if (!item || typeof item !== 'object') {
      alert(`Invalid item at position ${i + 1}!`);
      return;
    }
    
    if (!item.name || typeof item.price !== 'number' || typeof item.quantity !== 'number') {
      alert(`Invalid Product data: ${JSON.stringify(item)}`);
      return;
    }
    
    if (item.price <= 0 || item.quantity <= 0) {
      alert(`Product "${item.name}" has invalid price`);
      return;
    }
  }
  
  let subtotal = 0;
  
  try {
    currentOrder.forEach(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
    });
    
    if (subtotal <= 0) {
      alert("Order total must be greater than 0!");
      return;
    }
    
    const fixedTax = 57.70;
    const total = parseFloat((subtotal + fixedTax).toFixed(2));
    
    console.log('Calculated amounts:', { subtotal, fixedTax, total });
    
    const tableNumber = orderType.toLowerCase() === 'dine in' 
      ? (document.getElementById('tableNumber')?.value || '1')
      : 'N/A';
    
    switch(selectedPaymentMethod) {
      case 'cash':
        const inputPayment = document.getElementById('inputPayment');
        if (!inputPayment) {
          alert("Payment input field not found! Please refresh the page.");
          return;
        }
        
        if (!inputPayment.value.trim()) {
          alert("Please Input Cash Amount");
          inputPayment.focus();
          return;
        }
        
        const paid = parseFloat(inputPayment.value);
        if (isNaN(paid)) {
          alert("Please enter a valid number for cash amount!");
          inputPayment.value = '';
          inputPayment.focus();
          return;
        }
        
        if (paid < total) {
          alert(`Insufficient payment!\n\nTotal: ₱${total.toFixed(2)}\nPaid: ₱${paid.toFixed(2)}\nShort: ₱${(total - paid).toFixed(2)}`);
          inputPayment.focus();
          inputPayment.select();
          return;
        }
        
        const change = parseFloat((paid - total).toFixed(2));
        
        const confirmMessage = `Confirm Cash Payment:\n\n` +
          `Order Type: ${orderType}\n` +
          `Table: ${tableNumber}\n` +
          `Payment Method: Cash\n` +
          `Total Amount: ₱${total.toFixed(2)}\n` +
          `Amount Paid: ₱${paid.toFixed(2)}\n` +
          `Change: ₱${change.toFixed(2)}\n\n` +
          `Proceed with payment?`;
        
        if (!confirm(confirmMessage)) {
          return;
        }
        
        completePayment('cash', total, paid, change, tableNumber);
        break;
        
      case 'gcash':
        showQRCodeModal(selectedPaymentMethod, total, false);
        break;
        
      default:
        alert(`Unsupported payment method: ${selectedPaymentMethod}`);
        return;
    }
    
  } catch (error) {
    console.error('Error processing payment:', error);
    alert(`Payment processing error: ${error.message}`);
  }
}

function resetOrderUI() {
  currentOrder = [];
  
  renderOrder();
  renderMenu();
  
  const orderTypeDisplay = document.getElementById("orderTypeDisplay");
  if (orderTypeDisplay) orderTypeDisplay.textContent = "None";
  
  const paymentMethodDisplayEl = document.getElementById("paymentMethodDisplay");
  if (paymentMethodDisplayEl) {
    paymentMethodDisplayEl.textContent = "None";
  }
  
  document.querySelectorAll('.payment-method-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.style.backgroundColor = '';
    btn.style.color = '';
  });
  
  document.querySelectorAll('.dineinandtakeout-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const tableInput = document.getElementById('tableNumber');
  if (tableInput) {
    tableInput.value = '';
    tableInput.disabled = false;
    tableInput.placeholder = "Enter table #";
  }
  
  const inputPayment = document.getElementById('inputPayment');
  if (inputPayment) {
    inputPayment.value = '';
    inputPayment.disabled = true;
    inputPayment.placeholder = "Select cash payment first";
  }
  
  const changeSection = document.getElementById('changeSection');
  if (changeSection) changeSection.style.display = 'none';
  
  orderType = null;
  selectedPaymentMethod = null;
  
  updatePayButtonState();
  
  console.log('UI reset successfully');
}

function printReceipt(orderData) {
  return new Promise((resolve) => {
    const now = new Date();
    const dateString = now.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const timeString = now.toLocaleTimeString('en-PH', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const companyName = "GRAY COUNTRYSIDE CAFE";
    const storeLocation = "JD Building, Crossing, Norzagaray, Bulacan, Norzagaray, Philippines, 3013";
    const tinNumber = "000-000-000-000";
    const posSerial = "POS001";
    const minNumber = now.getTime().toString().slice(-15);
    const cashier = "CASHIER001";
    
    const invoiceNumber = `SI-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;
    const transactionNumber = `TRX-${now.getTime().toString().slice(-8)}`;
    
    const totalQuantity = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = orderData.subtotal;
    const totalDue = orderData.total;
    
    let itemsHTML = '';
    orderData.items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      itemsHTML += `
        <div class="item-row">
          <div class="item-left">
            <span class="item-name">${item.name}</span>
          </div>
          <div class="item-right">
            <span class="item-price">${itemTotal.toFixed(2)}</span>
          </div>
        </div>
      `;
    });
    
    itemsHTML += `
      <div class="divider">---</div>
      
      <div class="subtotal-row">
        <span>SUB-TOTAL</span>
        <span>PHP ${subtotal.toFixed(2)}</span>
      </div>
      
      <div class="subtotal-row">
        <span>VAT (12%)</span>
        <span>PHP ${orderData.vatAmount.toFixed(2)}</span>
      </div>
      
      <div class="divider">---</div>
      
      <div class="total-due-row">
        <span>TOTAL DUE</span>
        <span>PHP ${totalDue.toFixed(2)}</span>
      </div>
    `;
    
    const vatableSales = orderData.vatableAmount || (subtotal - orderData.vatAmount);
    const vatAmount = orderData.vatAmount;
    const zeroRatedSales = 0.00;
    const vatExemptSales = 0.00;
    
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>POS RECEIPT</title>
        <meta charset="UTF-8">
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
              padding: 0;
            }
            
            body {
              width: 76mm;
              margin: 0 auto;
              padding: 1mm;
              font-family: 'Courier New', monospace;
              font-size: 9px;
              line-height: 1.2;
              background: white;
              letter-spacing: -0.5px;
            }
            
            .no-print {
              display: none !important;
            }
          }
          
          @media screen {
            body {
              font-family: 'Courier New', monospace;
              font-size: 9px;
              line-height: 1.2;
              width: 76mm;
              margin: 20px auto;
              padding: 5mm;
              border: 1px solid #ccc;
              background: white;
              letter-spacing: -0.5px;
            }
          }
          
          .receipt {
            width: 100%;
            max-width: 76mm;
          }
          
          .header {
            text-align: center;
            margin-bottom: 2px;
          }
          
          .company-name {
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 1px;
          }
          
          .store-location {
            font-size: 8px;
            line-height: 1;
            margin: 1px 0;
          }
          
          .tin-info {
            font-size: 8px;
            margin: 2px 0;
            text-align: center;
            line-height: 1;
          }
          
          .receipt-title {
            text-align: center;
            font-size: 9px;
            font-weight: bold;
            margin: 3px 0;
          }
          
          .invoice-info {
            font-size: 8px;
            margin: 2px 0;
            text-align: center;
            line-height: 1;
          }
          
          .date-time {
            text-align: center;
            font-size: 8px;
            margin: 2px 0;
            line-height: 1;
          }
          
          .divider {
            text-align: center;
            margin: 2px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 1px 0;
          }
          
          .order-type {
            text-align: center;
            font-size: 8px;
            margin: 2px 0;
            line-height: 1;
          }
          
          .items-list {
            margin: 3px 0;
          }
          
          .item-row {
            margin: 1px 0;
            line-height: 1.1;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          
          .item-left {
            flex: 1;
            display: flex;
            align-items: flex-start;
          }
          
          .item-right {
            flex-shrink: 0;
            text-align: right;
          }
          
          .item-name {
            display: inline-block;
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .item-price {
            display: inline-block;
            min-width: 25px;
            text-align: right;
          }
          
          .subtotal-row {
            margin-top: 3px;
            padding-top: 2px;
            font-size: 8px;
            line-height: 1.1;
            display: flex;
            justify-content: space-between;
          }
          
          .total-due-row {
            margin-top: 2px;
            font-size: 9px;
            font-weight: bold;
            line-height: 1.1;
            display: flex;
            justify-content: space-between;
          }
          
          .payment-method {
            font-size: 8px;
            margin: 2px 0;
            text-align: center;
            line-height: 1;
          }
          
          .vat-breakdown {
            font-size: 8px;
            margin: 3px 0;
            padding-top: 2px;
            border-top: 1px dashed #000;
          }
          
          .vat-row {
            margin: 1px 0;
            display: flex;
            justify-content: space-between;
          }
          
          .footer {
            text-align: center;
            font-size: 7px;
            margin-top: 5px;
            padding-top: 3px;
            border-top: 1px solid #000;
            line-height: 1;
          }
          
          .thank-you {
            text-align: center;
            font-size: 8px;
            font-weight: bold;
            margin: 3px 0;
            line-height: 1;
          }
          
          .print-btn {
            display: block;
            width: 100%;
            padding: 8px;
            margin-top: 10px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
          }
          
          .print-btn:hover {
            background: #0056b3;
          }
          
          .close-btn {
            display: block;
            width: 100%;
            padding: 8px;
            margin-top: 5px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="company-name">${companyName}</div>
            <div class="store-location">${storeLocation}</div>
          </div>
          
          <div class="tin-info">
            TIN: ${tinNumber}<br>
            POS: ${posSerial}<br>
            MIN#: ${minNumber}
          </div>
          
          <div class="receipt-title">RECEIPT</div>
          
          <div class="invoice-info">
            Trans# ${transactionNumber}<br>
            Cashier: ${cashier}
          </div>
          
          <div class="date-time">
            ${dateString} ${timeString} #02
          </div>
          
          <div class="divider">
            ---
          </div>
          
          <div class="order-type">
            ${orderData.type || 'DINE-IN'} ${orderData.tableNumber ? `(Table: ${orderData.tableNumber})` : ''}
          </div>
          
          <div class="items-list">
            ${itemsHTML}
          </div>
          
          <div class="payment-method">
            ${orderData.paymentMethod.toUpperCase()} ${orderData.amountPaid.toFixed(2)}
          </div>
          
          ${orderData.change > 0 ? `
            <div class="subtotal-row">
              <span>CHANGE</span>
              <span>PHP ${orderData.change.toFixed(2)}</span>
            </div>
          ` : ''}
          
          <div class="vat-breakdown">
            <div class="vat-row">
              <span>VATable Sales</span>
              <span>${vatableSales.toFixed(2)}</span>
            </div>
            <div class="vat-row">
              <span>VAT Amount</span>
              <span>${vatAmount.toFixed(2)}</span>
            </div>
            <div class="vat-row">
              <span>Zero-Rated Sales</span>
              <span>${zeroRatedSales.toFixed(2)}</span>
            </div>
            <div class="vat-row">
              <span>VAT-Exempt Sales</span>
              <span>${vatExemptSales.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="thank-you">
            THANK YOU. PLEASE COME AGAIN.
          </div>
          
          <div class="footer">
            ${dateString.replace(/\//g, '').replace(/(\d{2})(\d{2})(\d{4})/, '$3$1$2')}-${timeString}-00000<br>
          </div>
          
          <button class="print-btn no-print" onclick="window.print()">Print Receipt</button>
          <button class="close-btn no-print" onclick="window.close()">Close Window</button>
        </div>
        
        <script>
          setTimeout(function() {
            try {
              window.print();
            } catch(e) {
              console.log('Print failed:', e);
            }
          }, 500);
        </script>
      </body>
      </html>
    `;
    
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.name = 'receiptFrame';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(receiptContent);
      iframeDoc.close();
      
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (printError) {
          console.log('Iframe print failed:', printError);
        }
        
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          resolve();
        }, 1000);
      }, 500);
      
    } catch (error) {
      console.log('Print failed:', error);
      resolve();
    }
  });
}

function clearCurrentOrder() {
  if (currentOrder.length === 0) {
    alert("No items to clear");
    return;
  }
  
  if (confirm(`Clear current order with ${currentOrder.length} item(s)?`)) {
    currentOrder = [];
    renderOrder();
    
    const inputPayment = document.getElementById('inputPayment');
    if (inputPayment) {
      inputPayment.value = '';
    }
    
    const changeSection = document.getElementById('changeSection');
    if (changeSection) {
      changeSection.style.display = 'none';
    }
    
    alert("Order cleared successfully");
    updatePayButtonState();
  }
}

function filterCategory(category) {
  const categoryMapping = {
    'all': 'all',
    'Rice Bowl Meals': 'Rice',
    'Hot Sizzlers': 'Sizzling',
    'Party Tray': 'Party',
    'Drinks': 'Drink',
    'Coffee': 'Cafe',
    'Milk Tea': 'Milk',
    'Frappe': 'Frappe',
    'Snack & Appetizer': 'Snack & Appetizer',
    'Budget Meals Served with Rice': 'Budget Meals Served with Rice',
    'Specialties': 'Specialties'
  };
  
  const actualCategory = categoryMapping[category] || category;
  currentCategory = actualCategory;
  console.log(`Filtering category: ${category} -> ${actualCategory}`);
  renderMenu();
  
  document.querySelectorAll('.category-btn').forEach(btn => {
    const btnCategory = btn.getAttribute('data-category');
    if (btnCategory === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Test function to check if API is working
async function testOrderAPI() {
  const testOrder = {
    items: [{
      name: "Test Item",
      price: 100,
      quantity: 1,
      size: "Regular",
      image: "default_food.jpg",
      id: null
    }],
    subtotal: 100,
    tax: 57.70,
    total: 157.70,
    type: "Dine In",
    notes: "Test order",
    payment: {
      method: "cash",
      amountPaid: 200,
      change: 42.30
    }
  };
  
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testOrder),
      credentials: 'include'
    });
    
    console.log('Test API Response status:', response.status);
    const result = await response.json();
    console.log('Test API Response:', result);
    
    if (response.ok) {
      alert('API is working! Check console for details.');
    } else {
      alert(`API Error: ${result.message || response.status}`);
    }
  } catch (error) {
    console.error('Test API Error:', error);
    alert(`API Connection Failed: ${error.message}`);
  }
}