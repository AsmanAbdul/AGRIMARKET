// DOM Elements
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const closeBtns = document.querySelectorAll('.close');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const userMenu = document.querySelector('.user-menu');
const authButtons = document.querySelector('.auth-buttons');
const usernameDisplay = document.getElementById('username-display');
const logoutLink = document.getElementById('logout-link');
const cartIcon = document.querySelector('.cart-icon');
const cartModal = document.getElementById('cart-modal');
const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.querySelector('.cart-count');
const checkoutBtn = document.getElementById('checkout-btn');
const checkoutModal = document.getElementById('checkout-modal');
const checkoutForm = document.getElementById('checkout-form');
const productModal = document.getElementById('product-modal');
const ordersModal = document.getElementById('orders-modal');
const ordersLink = document.getElementById('orders-link');
const ordersList = document.getElementById('orders-list');
const sellerModal = document.getElementById('seller-modal');
const profileLink = document.getElementById('profile-link');
const countyFilter = document.getElementById('county-filter');
const subCountyFilter = document.getElementById('sub-county-filter');
const searchBtn = document.getElementById('search-btn');
const featuredProducts = document.getElementById('featured-products');
const registerCounty = document.getElementById('register-county');
const registerSubCounty = document.getElementById('register-sub-county');
const productCounty = document.getElementById('product-county');
const productSubCounty = document.getElementById('product-sub-county');
const deliveryCounty = document.getElementById('delivery-county');
const deliverySubCounty = document.getElementById('delivery-sub-county');
const sellerProductsGrid = document.getElementById('seller-products-grid');
const sellerOrdersList = document.getElementById('seller-orders-list');
const addProductForm = document.getElementById('add-product-form');
const addNewProductBtn = document.getElementById('add-new-product-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const sellLink = document.getElementById('sell-link');

// Global Variables
let currentUser = null;
let kenyaLocations = {};
let cart = [];
let products = [];

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  checkAuthStatus();
  
  // Load Kenyan locations
  loadKenyaLocations();
  
  // Load featured products
  loadFeaturedProducts();
});

loginBtn.addEventListener('click', () => {
  loginModal.style.display = 'block';
});

registerBtn.addEventListener('click', () => {
  registerModal.style.display = 'block';
});

showRegister.addEventListener('click', (e) => {
  e.preventDefault();
  loginModal.style.display = 'none';
  registerModal.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  registerModal.style.display = 'none';
  loginModal.style.display = 'block';
});

closeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = btn.closest('.modal');
    modal.style.display = 'none';
  });
});

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
logoutLink.addEventListener('click', handleLogout);
cartIcon.addEventListener('click', openCartModal);
checkoutBtn.addEventListener('click', openCheckoutModal);
checkoutForm.addEventListener('submit', handleCheckout);
ordersLink.addEventListener('click', openOrdersModal);
profileLink.addEventListener('click', openProfile);
sellLink.addEventListener('click', openSellerDashboard);
addNewProductBtn.addEventListener('click', () => {
  // Switch to add product tab
  tabBtns.forEach(btn => btn.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  document.querySelector('.tab-btn[data-tab="add-product"]').classList.add('active');
  document.getElementById('add-product').classList.add('active');
});
addProductForm.addEventListener('submit', handleAddProduct);

// Tab switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.getAttribute('data-tab');
    
    // Update active tab button
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update active tab content
    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    // Load content if needed
    if (tabId === 'seller-products') {
      loadSellerProducts();
    } else if (tabId === 'seller-orders') {
      loadSellerOrders();
    }
  });
});

// County and sub-county selection
[registerCounty, productCounty, deliveryCounty].forEach(select => {
  select?.addEventListener('change', (e) => {
    const subCountySelect = e.target.id === 'register-county' ? registerSubCounty :
                           e.target.id === 'product-county' ? productSubCounty :
                           deliverySubCounty;
    updateSubCountyOptions(e.target.value, subCountySelect);
  });
});

// Functions
async function checkAuthStatus() {
  const token = localStorage.getItem('token');
  
  if (token) {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const user = await response.json();
        currentUser = user;
        updateUIForLoggedInUser(user);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Error verifying token:', error);
    }
  }
}

async function loadKenyaLocations() {
  try {
    const response = await fetch('/api/auth/locations');
    if (response.ok) {
      kenyaLocations = await response.json();
      populateCountySelects();
    }
  } catch (error) {
    console.error('Error loading Kenya locations:', error);
  }
}

function populateCountySelects() {
  const countySelects = [countyFilter, registerCounty, productCounty, deliveryCounty];
  
  countySelects.forEach(select => {
    if (select) {
      select.innerHTML = '<option value="">All Counties</option>' + 
        Object.keys(kenyaLocations).map(county => 
          `<option value="${county}">${county}</option>`
        ).join('');
    }
  });
}

function updateSubCountyOptions(county, subCountySelect) {
  if (!county) {
    subCountySelect.innerHTML = '<option value="">All Sub-Counties</option>';
    return;
  }
  
  const subCounties = kenyaLocations[county] || [];
  subCountySelect.innerHTML = '<option value="">All Sub-Counties</option>' + 
    subCounties.map(subCounty => 
      `<option value="${subCounty}">${subCounty}</option>`
    ).join('');
}

async function loadFeaturedProducts() {
  try {
    const response = await fetch('/api/products');
    if (response.ok) {
      products = await response.json();
      renderFeaturedProducts(products.slice(0, 8)); // Show first 8 products as featured
    }
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function renderFeaturedProducts(productsToRender) {
  featuredProducts.innerHTML = productsToRender.map(product => `
    <div class="product-card" data-id="${product.product_id}">
      <div class="product-image">
        <img src="${product.image_url || 'images/default-product.jpg'}" alt="${product.name}">
      </div>
      <div class="product-info">
        <h4>${product.name}</h4>
        <p class="product-price">KSh ${product.price.toFixed(2)}/${product.unit}</p>
        <p class="product-location">${product.county}, ${product.sub_county}</p>
        <button class="btn btn-primary view-product">View Details</button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to view product buttons
  document.querySelectorAll('.view-product').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.target.closest('.product-card').getAttribute('data-id');
      openProductModal(productId);
    });
  });
}

async function openProductModal(productId) {
  try {
    const response = await fetch(`/api/products/${productId}`);
    if (response.ok) {
      const product = await response.json();
      
      // Populate modal with product data
      document.getElementById('product-name').textContent = product.name;
      document.getElementById('product-seller').textContent = `Sold by: ${product.seller_name || 'Seller'}`;
      document.getElementById('product-location').textContent = `Location: ${product.county}, ${product.sub_county}`;
      document.getElementById('product-price').textContent = `KSh ${product.price.toFixed(2)}/${product.unit}`;
      document.getElementById('product-description').textContent = product.description || 'No description available';
      document.getElementById('product-unit').textContent = product.unit;
      document.getElementById('product-main-image').src = product.image_url || 'images/default-product.jpg';
      document.getElementById('product-quantity').value = 1;
      document.getElementById('product-quantity').max = product.quantity;
      
      // Set up add to cart button
      const addToCartBtn = document.getElementById('add-to-cart-btn');
      addToCartBtn.onclick = () => {
        const quantity = parseInt(document.getElementById('product-quantity').value);
        if (quantity > 0 && quantity <= product.quantity) {
          addToCart(product, quantity);
          productModal.style.display = 'none';
        } else {
          alert('Please enter a valid quantity');
        }
      };
      
      productModal.style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading product details:', error);
  }
}

function addToCart(product, quantity) {
  const existingItem = cart.find(item => item.product_id === product.product_id);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      product_id: product.product_id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      seller_id: product.seller_id,
      quantity: quantity,
      unit: product.unit
    });
  }
  
  updateCartCount();
  saveCartToStorage();
}

function updateCartCount() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  cartCount.textContent = count;
}

function saveCartToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  const savedCart = localStorage.getItem('cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartCount();
  }
}

function openCartModal() {
  if (!currentUser) {
    alert('Please login to view your cart');
    loginModal.style.display = 'block';
    return;
  }
  
  renderCartItems();
  cartModal.style.display = 'block';
}

function renderCartItems() {
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
    document.getElementById('cart-total').textContent = 'KSh 0.00';
    return;
  }
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  cartItemsContainer.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.product_id}">
      <div class="cart-item-image">
        <img src="${item.image_url || 'images/default-product.jpg'}" alt="${item.name}">
      </div>
      <div class="cart-item-details">
        <h4 class="cart-item-name">${item.name}</h4>
        <p class="cart-item-price">KSh ${item.price.toFixed(2)}/${item.unit}</p>
        <div class="cart-item-quantity">
          <button class="decrease-quantity">-</button>
          <span>${item.quantity}</span>
          <button class="increase-quantity">+</button>
        </div>
      </div>
      <div class="cart-item-actions">
        <span class="cart-item-remove">Remove</span>
      </div>
    </div>
  `).join('');
  
  document.getElementById('cart-total').textContent = `KSh ${total.toFixed(2)}`;
  
  // Add event listeners to quantity buttons
  document.querySelectorAll('.decrease-quantity').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.target.closest('.cart-item').getAttribute('data-id');
      const item = cart.find(i => i.product_id == productId);
      if (item.quantity > 1) {
        item.quantity--;
      } else {
        cart = cart.filter(i => i.product_id != productId);
      }
      renderCartItems();
      updateCartCount();
      saveCartToStorage();
    });
  });
  
  document.querySelectorAll('.increase-quantity').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const productId = e.target.closest('.cart-item').getAttribute('data-id');
      const item = cart.find(i => i.product_id == productId);
      
      // Check product stock
      try {
        const response = await fetch(`/api/products/${productId}`);
        if (response.ok) {
          const product = await response.json();
          if (item.quantity < product.quantity) {
            item.quantity++;
          } else {
            alert(`Only ${product.quantity} available in stock`);
          }
          renderCartItems();
          updateCartCount();
          saveCartToStorage();
        }
      } catch (error) {
        console.error('Error checking product stock:', error);
      }
    });
  });
  
  document.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.target.closest('.cart-item').getAttribute('data-id');
      cart = cart.filter(i => i.product_id != productId);
      renderCartItems();
      updateCartCount();
      saveCartToStorage();
    });
  });
}

function openCheckoutModal() {
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }
  
  checkoutModal.style.display = 'block';
}

async function handleCheckout(e) {
  e.preventDefault();
  
  const deliveryCounty = document.getElementById('delivery-county').value;
  const deliverySubCounty = document.getElementById('delivery-sub-county').value;
  const deliveryAddress = document.getElementById('delivery-address').value;
  const paymentMethod = document.getElementById('payment-method').value;
  
  try {
    const response = await fetch('/api/orders/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        delivery_county: deliveryCounty,
        delivery_sub_county: deliverySubCounty,
        delivery_address: deliveryAddress,
        payment_method: paymentMethod,
        cart: cart
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      alert('Order placed successfully!');
      cart = [];
      updateCartCount();
      saveCartToStorage();
      checkoutModal.style.display = 'none';
      cartModal.style.display = 'none';
      
      // Refresh orders if orders modal is open
      if (ordersModal.style.display === 'block') {
        loadUserOrders();
      }
    } else {
      const error = await response.json();
      alert(error.message || 'Failed to place order');
    }
  } catch (error) {
    console.error('Error placing order:', error);
    alert('Failed to place order');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.token);
      currentUser = data.user;
      updateUIForLoggedInUser(data.user);
      loginModal.style.display = 'none';
      
      // Load user's cart from server if any
      loadUserCart();
    } else {
      const error = await response.json();
      alert(error.message || 'Login failed');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    alert('Login failed');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  const phone = document.getElementById('register-phone').value;
  const userType = document.getElementById('user-type').value;
  const county = document.getElementById('register-county').value;
  const subCounty = document.getElementById('register-sub-county').value;
  
  if (password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        email,
        password,
        user_type: userType,
        phone,
        county,
        sub_county: subCounty
      })
    });
    
    if (response.ok) {
      alert('Registration successful! Please login.');
      registerModal.style.display = 'none';
      loginModal.style.display = 'block';
      registerForm.reset();
    } else {
      const error = await response.json();
      alert(error.message || 'Registration failed');
    }
  } catch (error) {
    console.error('Error registering:', error);
    alert('Registration failed');
  }
}

function handleLogout(e) {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('cart');
  currentUser = null;
  cart = [];
  updateCartCount();
  authButtons.style.display = 'flex';
  userMenu.classList.add('hidden');
  window.location.reload();
}

function updateUIForLoggedInUser(user) {
  authButtons.style.display = 'none';
  userMenu.classList.remove('hidden');
  usernameDisplay.textContent = user.username;
  
  if (user.user_type === 'seller') {
    sellLink.style.display = 'block';
  } else {
    sellLink.style.display = 'none';
  }
  
  // Load user's cart from local storage if not logged in