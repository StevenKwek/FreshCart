import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import AuthForm from './components/AuthForm';
import AppIcon from './components/AppIcon';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import Toast from './components/Toast';
import { paymentMethods } from './constants/paymentMethods';
import { products as initialProducts } from './data/products';
import {
  createLocalAccount,
  createInventorySeedVersion,
  createSessionUser,
  findAccountByIdentifier,
  getInitialTheme,
  getStoredAccounts,
  getScopedStoredValue,
  getStoredValue,
  getUserStorageKey,
  mergeLegacyScopedValue,
  normalizeUsernameInput,
  normalizeUser,
  normalizeEmail,
  syncCartWithInventory,
  syncInventoryWithSeed,
  syncWishlistWithInventory,
  verifyLocalPassword,
} from './utils/appState';
import {
  checkoutWithFirebaseApi,
  ensureRemoteUserProfile,
  fetchAdminOrders,
  firebaseEnabled,
  loginWithFirebase,
  logoutFirebaseUser,
  registerWithFirebase,
  sendFirebasePasswordReset,
  subscribeToFirebaseAuth,
  subscribeToInventory,
  subscribeToUserProfile,
  syncRemoteProfileToInventory,
  updateAdminOrderStatus,
  updateRemoteUserProfile,
} from './services/firebaseClient';
import { getStockStatus } from './utils/stock';

const currencyFormatter = new Intl.NumberFormat('id-ID');
const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const inventorySeedVersion = createInventorySeedVersion(initialProducts);
const landingFeatureHighlights = [
  {
    icon: 'delivery',
    title: 'Pengiriman Cepat',
    description: 'Pesanan harian diproses cepat untuk area layanan FreshCart.',
  },
  {
    icon: 'leaf',
    title: 'Pilihan Lebih Segar',
    description: 'Produk kebutuhan rumah tangga dipilih dari stok yang rapi dan terjaga.',
  },
  {
    icon: 'wallet',
    title: 'Bayar Mudah',
    description: 'Dukung transfer, QRIS, COD, dan metode pembayaran yang familiar.',
  },
];

const orderStatusOptions = ['accepted', 'processing', 'completed', 'cancelled'];

const getOrderStatusMeta = (status) => {
  switch (status) {
    case 'accepted':
      return {
        label: 'Accepted',
        className: 'accepted',
      };
    case 'processing':
      return {
        label: 'Processing',
        className: 'processing',
      };
    case 'completed':
      return {
        label: 'Completed',
        className: 'completed',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        className: 'cancelled',
      };
    case 'pending':
    default:
      return {
        label: 'Pending',
        className: 'pending',
      };
  }
};

function App() {
  const useFirebase = firebaseEnabled;
  const initialUserState = normalizeUser(getStoredValue('freshcart-user', null));
  const initialAccountsState = getStoredAccounts();
  const initialInventoryState = syncInventoryWithSeed(
    getStoredValue('freshcart-inventory', initialProducts),
    initialProducts,
  );
  const initialCartByUserState = mergeLegacyScopedValue(
    getStoredValue('freshcart-cart-by-user', {}),
    initialUserState,
    getStoredValue('freshcart-cart', []),
  );
  const initialWishlistByUserState = mergeLegacyScopedValue(
    getStoredValue('freshcart-wishlist-by-user', {}),
    initialUserState,
    getStoredValue('freshcart-wishlist', []),
  );
  const initialPaymentByUserState = mergeLegacyScopedValue(
    getStoredValue('freshcart-payment-by-user', {}),
    initialUserState,
    getStoredValue('freshcart-payment-method', ''),
  );
  const [currentView, setCurrentView] = useState('landing');
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState(() => initialUserState);
  const [accounts, setAccounts] = useState(() => initialAccountsState);
  const [inventory, setInventory] = useState(() => initialInventoryState);
  const [cartByUser, setCartByUser] = useState(() => initialCartByUserState);
  const [wishlistByUser, setWishlistByUser] = useState(
    () => initialWishlistByUserState,
  );
  const [paymentMethodByUser, setPaymentMethodByUser] = useState(
    () => initialPaymentByUserState,
  );
  const [cart, setCart] = useState(() =>
    syncCartWithInventory(
      getScopedStoredValue(initialCartByUserState, initialUserState, []),
      initialInventoryState,
    ),
  );
  const [wishlist, setWishlist] = useState(() =>
    syncWishlistWithInventory(
      getScopedStoredValue(initialWishlistByUserState, initialUserState, []),
      initialInventoryState,
    ),
  );
  const [spendingByUser, setSpendingByUser] = useState(() =>
    getStoredValue('freshcart-spending-by-user', {}),
  );
  const [purchaseHistoryByUser, setPurchaseHistoryByUser] = useState(() =>
    getStoredValue('freshcart-purchases-by-user', {}),
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(() =>
    getScopedStoredValue(initialPaymentByUserState, initialUserState, ''),
  );
  const [theme, setTheme] = useState(getInitialTheme);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [previousView, setPreviousView] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [toast, setToast] = useState(null);
  const [firebaseAuthUser, setFirebaseAuthUser] = useState(null);
  const [remoteProfile, setRemoteProfile] = useState(null);
  const [isRemoteAuthReady, setIsRemoteAuthReady] = useState(!useFirebase);
  const [adminOrders, setAdminOrders] = useState([]);
  const [isAdminOrdersLoading, setIsAdminOrdersLoading] = useState(false);
  const [adminOrdersError, setAdminOrdersError] = useState('');
  const [orderStatusUpdatingId, setOrderStatusUpdatingId] = useState('');
  const syncErrorShownRef = useRef(false);
  const skipRemoteSyncRef = useRef(false);

  const categories = ['All', ...new Set(inventory.map((product) => product.category))];
  const username = (user?.username || 'guest').split('@')[0];
  const isAdminUser = useFirebase && username === 'admin';

  useEffect(() => {
    if (useFirebase) {
      return;
    }

    window.localStorage.setItem('freshcart-user', JSON.stringify(user));
  }, [user, useFirebase]);

  useEffect(() => {
    if (useFirebase) {
      return;
    }

    window.localStorage.setItem('freshcart-auth-accounts', JSON.stringify(accounts));
  }, [accounts, useFirebase]);

  useEffect(() => {
    if (useFirebase) {
      return;
    }

    window.localStorage.setItem('freshcart-inventory', JSON.stringify(inventory));
  }, [inventory, useFirebase]);

  useEffect(() => {
    if (useFirebase) {
      return;
    }

    window.localStorage.setItem(
      'freshcart-spending-by-user',
      JSON.stringify(spendingByUser),
    );
  }, [spendingByUser, useFirebase]);

  useEffect(() => {
    if (useFirebase) {
      return;
    }

    window.localStorage.setItem(
      'freshcart-purchases-by-user',
      JSON.stringify(purchaseHistoryByUser),
    );
  }, [purchaseHistoryByUser, useFirebase]);

  useEffect(() => {
    if (useFirebase) {
      return;
    }

    window.localStorage.setItem(
      'freshcart-cart-by-user',
      JSON.stringify(cartByUser),
    );
  }, [cartByUser, useFirebase]);

  useEffect(() => {
    if (useFirebase) {
      return;
    }

    window.localStorage.setItem(
      'freshcart-wishlist-by-user',
      JSON.stringify(wishlistByUser),
    );
  }, [wishlistByUser, useFirebase]);

  useEffect(() => {
    if (useFirebase) {
      return;
    }

    window.localStorage.setItem(
      'freshcart-payment-by-user',
      JSON.stringify(paymentMethodByUser),
    );
  }, [paymentMethodByUser, useFirebase]);

  useEffect(() => {
    window.localStorage.setItem('freshcart-theme', JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('theme-dark', isDark);
    document.body.classList.toggle('theme-dark', isDark);
  }, [theme]);

  useEffect(() => {
    if (!useFirebase) {
      return undefined;
    }

    let unsubscribeProfile = () => {};
    let isActive = true;

    const unsubscribeAuth = subscribeToFirebaseAuth(async (nextFirebaseUser) => {
      if (!isActive) {
        return;
      }

      setFirebaseAuthUser(nextFirebaseUser);

      if (!nextFirebaseUser) {
        unsubscribeProfile();
        setRemoteProfile(null);
        setUser(null);
        setCart([]);
        setWishlist([]);
        setSelectedPaymentMethod('');
        setIsRemoteAuthReady(true);
        return;
      }

      setIsRemoteAuthReady(false);

      try {
        await ensureRemoteUserProfile(nextFirebaseUser);
        unsubscribeProfile();
        unsubscribeProfile = subscribeToUserProfile(nextFirebaseUser.uid, (profile) => {
          if (!isActive) {
            return;
          }

          setRemoteProfile(profile);
          setUser(
            createSessionUser({
              name:
                profile?.name ||
                nextFirebaseUser.displayName ||
                nextFirebaseUser.email ||
                'guest',
              username:
                profile?.username ||
                nextFirebaseUser.email?.split('@')[0] ||
                nextFirebaseUser.uid,
              email: profile?.email || nextFirebaseUser.email || '',
            }),
          );
          setIsRemoteAuthReady(true);
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        unsubscribeProfile();
        setRemoteProfile(null);
        setUser(null);
        setIsRemoteAuthReady(true);
        setToast({
          message:
            error instanceof Error
              ? error.message
              : 'Firebase session could not be restored.',
          type: 'warning',
        });
      }
    });

    return () => {
      isActive = false;
      unsubscribeProfile();
      unsubscribeAuth();
    };
  }, [useFirebase]);

  useEffect(() => {
    if (!useFirebase) {
      return undefined;
    }

    const unsubscribeInventory = subscribeToInventory((remoteInventory) => {
      setInventory(
        remoteInventory.length > 0
          ? syncInventoryWithSeed(remoteInventory, initialProducts)
          : syncInventoryWithSeed(initialProducts, initialProducts),
      );
    });

    return unsubscribeInventory;
  }, [useFirebase]);

  useEffect(() => {
    if (useFirebase) {
      return;
    }

    setInventory((current) => syncInventoryWithSeed(current, initialProducts));
  }, [inventorySeedVersion, useFirebase]);

  useEffect(() => {
    setCart((current) => syncCartWithInventory(current, inventory));
    setWishlist((current) => syncWishlistWithInventory(current, inventory));
  }, [inventory]);

  useEffect(() => {
    if (!useFirebase || !remoteProfile) {
      return;
    }

    const syncedRemoteProfile = syncRemoteProfileToInventory(remoteProfile, inventory);
    skipRemoteSyncRef.current = true;
    setCart(syncedRemoteProfile.cart);
    setWishlist(syncedRemoteProfile.wishlist);
    setSelectedPaymentMethod(remoteProfile.selectedPaymentMethod || '');
  }, [remoteProfile, inventory, useFirebase]);

  useEffect(() => {
    if (!useFirebase || !firebaseAuthUser || !remoteProfile) {
      return;
    }

    if (skipRemoteSyncRef.current) {
      skipRemoteSyncRef.current = false;
      return;
    }

    const nextCart = syncCartWithInventory(cart, inventory);
    const nextWishlist = syncWishlistWithInventory(wishlist, inventory);
    const nextPaymentMethod = selectedPaymentMethod || '';
    const updates = {};

    if (JSON.stringify(remoteProfile.cart || []) !== JSON.stringify(nextCart)) {
      updates.cart = nextCart;
    }

    if (JSON.stringify(remoteProfile.wishlist || []) !== JSON.stringify(nextWishlist)) {
      updates.wishlist = nextWishlist;
    }

    if ((remoteProfile.selectedPaymentMethod || '') !== nextPaymentMethod) {
      updates.selectedPaymentMethod = nextPaymentMethod;
    }

    if (Object.keys(updates).length === 0) {
      syncErrorShownRef.current = false;
      return;
    }

    updateRemoteUserProfile(firebaseAuthUser.uid, updates).catch(() => {
      if (!syncErrorShownRef.current) {
        setToast({
          message: 'Firebase sync failed. Please try your action again.',
          type: 'warning',
        });
        syncErrorShownRef.current = true;
      }
    });
  }, [
    cart,
    firebaseAuthUser,
    inventory,
    remoteProfile,
    selectedPaymentMethod,
    useFirebase,
    wishlist,
  ]);

  useEffect(() => {
    if (useFirebase) {
      return;
    }

    const userKey = getUserStorageKey(user);

    if (!userKey) {
      setCart([]);
      setWishlist([]);
      setSelectedPaymentMethod('');
      return;
    }

    setCart(
      syncCartWithInventory(
        getScopedStoredValue(cartByUser, userKey, []),
        inventory,
      ),
    );
    setWishlist(
      syncWishlistWithInventory(
        getScopedStoredValue(wishlistByUser, userKey, []),
        inventory,
      ),
    );
    setSelectedPaymentMethod(getScopedStoredValue(paymentMethodByUser, userKey, ''));
  }, [user, paymentMethodByUser, cartByUser, wishlistByUser, inventory, useFirebase]);

  useEffect(() => {
    if (useFirebase) {
      return;
    }

    const userKey = getUserStorageKey(user);

    if (!userKey) {
      return;
    }

    setCartByUser((current) => {
      const savedCart = current[userKey] || [];

      if (JSON.stringify(savedCart) === JSON.stringify(cart)) {
        return current;
      }

      return {
        ...current,
        [userKey]: cart,
      };
    });
  }, [cart, user, useFirebase]);

  useEffect(() => {
    if (useFirebase) {
      return;
    }

    const userKey = getUserStorageKey(user);

    if (!userKey) {
      return;
    }

    setWishlistByUser((current) => {
      const savedWishlist = current[userKey] || [];

      if (JSON.stringify(savedWishlist) === JSON.stringify(wishlist)) {
        return current;
      }

      return {
        ...current,
        [userKey]: wishlist,
      };
    });
  }, [wishlist, user, useFirebase]);

  useEffect(() => {
    if (useFirebase) {
      return;
    }

    const userKey = getUserStorageKey(user);

    if (!userKey) {
      return;
    }

    setPaymentMethodByUser((current) => {
      if ((current[userKey] || '') === selectedPaymentMethod) {
        return current;
      }

      return {
        ...current,
        [userKey]: selectedPaymentMethod,
      };
    });
  }, [selectedPaymentMethod, user, useFirebase]);

  useEffect(() => {
    if (user && currentView === 'landing') {
      navigateTo('home');
    }
  }, [user, currentView]);

  useEffect(() => {
    if (activeCategory !== 'All' && !categories.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [activeCategory, categories]);

  useEffect(() => {
    if (
      selectedProductId &&
      !inventory.some((product) => product.id === selectedProductId)
    ) {
      setSelectedProductId(null);

      if (currentView === 'detail') {
        setCurrentView('home');
      }
    }
  }, [selectedProductId, inventory, currentView]);

  useEffect(() => {
    if (!useFirebase || !isAdminUser || currentView !== 'profile') {
      return;
    }

    loadAdminOrders();
  }, [currentView, firebaseAuthUser, isAdminUser, useFirebase]);

  const selectedProduct =
    inventory.find((product) => product.id === selectedProductId) || null;

  const cartItems = cart
    .map((item) => {
      const product = inventory.find((entry) => entry.id === item.productId);
      return product ? { ...product, quantity: item.quantity } : null;
    })
    .filter(Boolean);

  const filteredProducts = inventory.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());
    const matchesCategory =
      activeCategory === 'All' || product.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const wishlistProducts = inventory.filter((product) => wishlist.includes(product.id));

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const navigateTo = (view) => {
    setCurrentView(view);
  };

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const handleAuthSubmit = async ({ mode, name, username, email, password }) => {
    if (useFirebase) {
      try {
        if (mode === 'register') {
          const result = await registerWithFirebase({
            name,
            username,
            email,
            password,
          });

          navigateTo('home');
          showToast(`Welcome, ${result.profile.username}!`);
          return { ok: true };
        }

        if (mode === 'forgot') {
          await sendFirebasePasswordReset(email);
          return {
            ok: true,
            successMessage: `Reset password email has been sent to ${normalizeEmail(email)}.`,
          };
        }

        const result = await loginWithFirebase({
          identifier: username,
          password,
        });

        navigateTo('home');
        showToast(`Welcome back, ${result.profile.username}!`);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Firebase authentication failed.',
        };
      }
    }

    if (mode === 'register') {
      const existingUsername = accounts.find(
        (account) => account.username === normalizeUsernameInput(username),
      );

      if (existingUsername) {
        return {
          ok: false,
          error: 'Username is already in use. Please choose another one.',
        };
      }

      const normalizedEmail = normalizeEmail(email);
      const existingEmail = accounts.find((account) => account.email === normalizedEmail);

      if (existingEmail) {
        return {
          ok: false,
          error: 'Email is already registered. Try logging in instead.',
        };
      }

      const nextAccount = createLocalAccount({
        name,
        username,
        email: normalizedEmail,
        password,
      });

      setAccounts((current) => [...current, nextAccount]);
      setUser(createSessionUser(nextAccount));
      navigateTo('home');
      showToast(`Welcome, ${nextAccount.username}!`);

      return { ok: true };
    }

    if (mode === 'forgot') {
      const account = accounts.find((entry) => entry.email === normalizeEmail(email));

      if (!account) {
        return {
          ok: false,
          error: 'We could not find an account with that email.',
        };
      }

      return {
        ok: true,
        resetForm: true,
        successMessage: `Reset link simulation sent to ${account.email}. Use your existing password for local testing.`,
      };
    }

    const account = findAccountByIdentifier(accounts, username);

    if (!account) {
      return {
        ok: false,
        error: 'Account not found. Check your username or email, or create a new account.',
      };
    }

    if (!verifyLocalPassword(account, password)) {
      return {
        ok: false,
        error: 'Wrong password. Please try again.',
      };
    }

    setUser(createSessionUser(account));
    navigateTo('home');
    showToast(`Welcome back, ${account.username}!`);

    return { ok: true };
  };

  const userKey = useFirebase
    ? firebaseAuthUser?.uid || getUserStorageKey(user)
    : getUserStorageKey(user);
  const activeSpending = useFirebase
    ? remoteProfile?.spendingTotal || 0
    : spendingByUser[username] || 0;
  const purchaseHistory = useFirebase
    ? remoteProfile?.purchaseHistory || []
    : getScopedStoredValue(purchaseHistoryByUser, userKey, []);
  const activePaymentMethod = paymentMethods
    .flatMap((group) => group.options)
    .find((option) => option.id === selectedPaymentMethod);

  const loadAdminOrders = async () => {
    if (!isAdminUser || !firebaseAuthUser) {
      return;
    }

    setIsAdminOrdersLoading(true);
    setAdminOrdersError('');

    try {
      const orders = await fetchAdminOrders(firebaseAuthUser);
      setAdminOrders(orders);
    } catch (error) {
      setAdminOrdersError(
        error instanceof Error ? error.message : 'Failed to load admin orders.',
      );
    } finally {
      setIsAdminOrdersLoading(false);
    }
  };

  const handleLogout = async () => {
    if (useFirebase) {
      try {
        await logoutFirebaseUser();
      } finally {
        navigateTo('landing');
        setSearchTerm('');
        setActiveCategory('All');
        showToast('You have been logged out.', 'info');
      }

      return;
    }

    setUser(null);
    navigateTo('landing');
    setCart([]);
    setWishlist([]);
    setSelectedPaymentMethod('');
    setSearchTerm('');
    setActiveCategory('All');
    showToast('You have been logged out.', 'info');
  };

  const handleAdminOrderStatusChange = async (orderId, status) => {
    if (!firebaseAuthUser) {
      showToast('Please login again to manage orders.', 'warning');
      return;
    }

    setOrderStatusUpdatingId(orderId);

    try {
      await updateAdminOrderStatus({
        firebaseUser: firebaseAuthUser,
        orderId,
        status,
      });
      await loadAdminOrders();
      showToast(`Order status updated to ${status}.`);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to update the selected order.',
        'warning',
      );
    } finally {
      setOrderStatusUpdatingId('');
    }
  };

  const toggleWishlist = (productId) => {
    setWishlist((current) => {
      const exists = current.includes(productId);
      showToast(
        exists ? 'Removed from wishlist.' : 'Added to wishlist.',
        exists ? 'info' : 'success',
      );
      return exists
        ? current.filter((id) => id !== productId)
        : [...current, productId];
    });
  };

  const addToCart = (productId) => {
    const product = inventory.find((item) => item.id === productId);

    if (!product || product.stock === 0) {
      showToast('Product is out of stock.', 'warning');
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === productId);
      const currentQty = existing?.quantity || 0;

      if (currentQty >= product.stock) {
        showToast('Stock limit reached for this product.', 'warning');
        return current;
      }

      showToast(`${product.name} added to cart.`);

      if (existing) {
        return current.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...current, { productId, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId, delta) => {
    setCart((current) => {
      return current
        .map((item) => {
          if (item.productId !== productId) {
            return item;
          }

          const product = inventory.find((entry) => entry.id === productId);
          const nextQuantity = item.quantity + delta;

          if (!product) {
            return null;
          }

          if (nextQuantity <= 0) {
            return null;
          }

          if (nextQuantity > product.stock) {
            showToast('Quantity exceeds available stock.', 'warning');
            return item;
          }

          return { ...item, quantity: nextQuantity };
        })
        .filter(Boolean);
    });
  };

  const placeOrder = async () => {
    if (cartItems.length === 0) {
      showToast('Your cart is still empty.', 'warning');
      return;
    }

    if (!selectedPaymentMethod) {
      showToast('Please choose a payment method first.', 'warning');
      return;
    }

    if (!userKey) {
      showToast('Please login first before placing an order.', 'warning');
      return;
    }

    if (useFirebase) {
      if (!firebaseAuthUser) {
        showToast('Please login first before placing an order.', 'warning');
        return;
      }

      try {
        await checkoutWithFirebaseApi({
          firebaseUser: firebaseAuthUser,
          cart,
          selectedPaymentMethod,
        });

        navigateTo('home');
        showToast('Checkout berhasil. Pesanan kamu sedang diproses.');
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Checkout failed. Please try again.',
          'warning',
        );
      }

      return;
    }

    const checkoutTotal = totalPrice;
    const orderRecord = {
      id: `order-${Date.now()}`,
      createdAt: new Date().toISOString(),
      paymentMethod: activePaymentMethod?.label || selectedPaymentMethod,
      totalItems,
      totalPrice: checkoutTotal,
      items: cartItems.map((item) => ({
        productId: item.id,
        name: item.name,
        category: item.category,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        unit: item.unit,
      })),
    };

    setInventory((current) =>
      current.map((product) => {
        const ordered = cart.find((item) => item.productId === product.id);
        if (!ordered) {
          return product;
        }

        return {
          ...product,
          stock: Math.max(product.stock - ordered.quantity, 0),
        };
      }),
    );
    setSpendingByUser((current) => ({
      ...current,
      [username]: (current[username] || 0) + checkoutTotal,
    }));
    setPurchaseHistoryByUser((current) => ({
      ...current,
      [userKey]: [orderRecord, ...(current[userKey] || [])],
    }));
    setCart([]);
    setSelectedPaymentMethod('');
    navigateTo('home');
    showToast('Checkout berhasil. Pesanan kamu sedang diproses.');
  };

  const openProductDetail = (product) => {
    setPreviousView(currentView === 'detail' ? 'home' : currentView);
    setSelectedProductId(product.id);
    navigateTo('detail');
  };

  const backFromDetail = () => {
    navigateTo(previousView || 'home');
  };

  const renderLanding = () => (
    <main className="landing-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="mini-badge">Modern Grocery Experience</span>
          <h1>Belanja bahan makanan lebih cepat, rapi, dan terasa ringan.</h1>
          <p>
            FreshCart membantu pekerja sibuk, keluarga, dan mahasiswa mengatur
            kebutuhan harian dengan pencarian cepat, wishlist favorit, dan
            checkout sederhana.
          </p>
          <div className="hero-actions">
            <button
              className="primary-button large"
              onClick={() => {
                setAuthMode('login');
                navigateTo('login');
              }}
            >
              Get Started
            </button>
            <button
              className="secondary-button large"
              onClick={() => {
                setAuthMode('register');
                navigateTo('register');
              }}
            >
              Register
            </button>
          </div>
        </div>

        <div className="hero-showcase">
          <div className="showcase-card large-card">
            <p className="section-eyebrow">Why FreshCart</p>
            <h2>Smart Grocery, made simple</h2>
            <div className="feature-stack">
              <div className="feature-tile">
                <strong className="icon-text">
                  <AppIcon type="easy" className="content-icon soft" />
                  Belanja mudah
                </strong>
                <span>Temukan bahan pokok favorit dengan UI yang bersih.</span>
              </div>
              <div className="feature-tile">
                <strong className="icon-text">
                  <AppIcon type="clock" className="content-icon soft" />
                  Hemat waktu
                </strong>
                <span>Search, filter, dan cart flow yang cepat dipahami.</span>
              </div>
              <div className="feature-tile">
                <strong className="icon-text">
                  <AppIcon type="spark" className="content-icon soft" />
                  Rekomendasi pintar
                </strong>
                <span>Pilihan produk harian yang cocok untuk kebutuhan rutin.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="why-us-section">
        <div className="section-header">
          <div>
            <span className="mini-badge">Why Choose Us</span>
            <h2>Kenapa Pilih Kami?</h2>
            <p>
              FreshCart dirancang supaya belanja kebutuhan harian terasa lebih cepat,
              lebih tenang, dan tetap praktis dari awal sampai checkout.
            </p>
          </div>
        </div>

        <div className="why-us-grid">
          {landingFeatureHighlights.map((feature) => (
            <article key={feature.title} className="why-us-card">
              <span className="why-us-icon">
                <AppIcon type={feature.icon} className="why-us-icon-svg" />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );

  const renderHome = () => (
    <main className="page-shell">
      <section className="home-banner">
        <div>
          <span className="mini-badge">Daily essentials</span>
          <h1>Shop smarter for your weekly grocery run.</h1>
          <p>
            Jelajahi produk segar, simpan favorit, dan masukkan ke cart hanya
            dalam beberapa klik.
          </p>
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <span className="card-icon-badge">
              <AppIcon type="products" className="content-icon" />
            </span>
            <strong>{inventory.length}</strong>
            <span>Produk tersedia</span>
          </div>
          <div className="stat-card">
            <span className="card-icon-badge">
              <AppIcon type="heart" className="content-icon" />
            </span>
            <strong>{wishlist.length}</strong>
            <span>Wishlist item</span>
          </div>
          <div className="stat-card">
            <span className="card-icon-badge">
              <AppIcon type="cart" className="content-icon" />
            </span>
            <strong>{totalItems}</strong>
            <span>Cart item</span>
          </div>
        </div>
      </section>

      <section className="toolbar">
        <label className="search-box">
          <span className="icon-text">
            <AppIcon type="search" className="content-icon soft" />
            Search Product
          </span>
          <input
            type="text"
            placeholder="Search by product name..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <div className="filter-section">
          <span className="filter-label icon-text">
            <AppIcon type="grid" className="content-icon soft" />
            Filter Category
          </span>
          <div className="filter-group">
          {categories.map((category) => (
            <button
              key={category}
              className={`filter-button ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        </div>
      </section>

      <section className="products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isWishlisted={wishlist.includes(product.id)}
              onToggleWishlist={toggleWishlist}
              onViewDetail={openProductDetail}
              onAddToCart={addToCart}
            />
          ))
        ) : (
          <div className="empty-state">
            <h3>No products found</h3>
            <p>Try changing your search or category filter.</p>
          </div>
        )}
      </section>
    </main>
  );

  const renderDetail = () => {
    if (!selectedProduct) {
      return renderHome();
    }

    const isOutOfStock = selectedProduct.stock === 0;
    const stockStatus = getStockStatus(selectedProduct.stock);

    return (
      <main className="page-shell">
        <section className="detail-layout">
          <div className="detail-image-panel">
            <img src={selectedProduct.image} alt={selectedProduct.name} />
          </div>

          <div className="detail-card">
            <button className="detail-back-button" onClick={backFromDetail}>
              <AppIcon type="back" className="button-icon" />
              Back
            </button>
            <span className="category-pill">{selectedProduct.category}</span>
            <h1>{selectedProduct.name}</h1>
            <p className="detail-price">
              Rp {currencyFormatter.format(selectedProduct.price)}
              <span> / {selectedProduct.unit}</span>
            </p>
            <p className="detail-description">{selectedProduct.description}</p>

            <div className="detail-meta-grid">
              <div className="detail-meta-card">
                <span className="card-icon-badge">
                  <AppIcon type="star" className="content-icon" />
                </span>
                <strong>{selectedProduct.rating}</strong>
                <span>Customer rating</span>
              </div>
              <div className="detail-meta-card">
                <span className="card-icon-badge">
                  <AppIcon type="stock" className="content-icon" />
                </span>
                <strong>{selectedProduct.stock}</strong>
                <span>{stockStatus.label}</span>
              </div>
            </div>

            <div className="detail-actions">
              <button
                className="primary-button large"
                onClick={() => addToCart(selectedProduct.id)}
                disabled={isOutOfStock}
              >
                Add to Cart
              </button>
              <button
                className={`secondary-button large ${wishlist.includes(selectedProduct.id) ? 'liked' : ''}`}
                onClick={() => toggleWishlist(selectedProduct.id)}
              >
                {wishlist.includes(selectedProduct.id) ? 'Remove Wishlist' : 'Save to Wishlist'}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  };

  const renderWishlist = () => (
    <main className="page-shell">
      <section className="section-header">
        <div>
          <span className="mini-badge">
            <AppIcon type="heart" className="badge-icon" />
            Wishlist
          </span>
          <h1>Produk favorit kamu</h1>
          <p>Simpan produk yang ingin dibeli nanti dan akses lagi dengan cepat.</p>
        </div>
      </section>

      <section className="products-grid">
        {wishlistProducts.length > 0 ? (
          wishlistProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isWishlisted={wishlist.includes(product.id)}
              onToggleWishlist={toggleWishlist}
              onViewDetail={openProductDetail}
              onAddToCart={addToCart}
            />
          ))
        ) : (
          <div className="empty-state">
            <h3>Your wishlist is empty</h3>
            <p>Tap the heart icon on a product card to save favorites.</p>
          </div>
        )}
      </section>
    </main>
  );

  const renderCart = () => (
    <main className="page-shell">
      <section className="checkout-layout">
        <div className="order-card">
          <div className="section-header compact">
            <div>
              <span className="mini-badge">
                <AppIcon type="cart" className="badge-icon" />
                Cart
              </span>
              <h1>Keranjang belanja</h1>
            </div>
          </div>

          {cartItems.length > 0 ? (
            <div className="cart-list">
              {cartItems.map((item) => (
                <article key={item.id} className="cart-item">
                  <img src={item.image} alt={item.name} />
                  <div className="cart-item-content">
                    <div>
                      <h3>{item.name}</h3>
                      <p>Rp {currencyFormatter.format(item.price)}</p>
                      <span
                        className={`stock-label ${getStockStatus(item.stock).className}`}
                      >
                        {getStockStatus(item.stock).label}
                      </span>
                    </div>
                    <div className="quantity-controls">
                      <button onClick={() => updateCartQuantity(item.id, -1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, 1)}>+</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state left">
              <h3>Your cart is empty</h3>
              <p>Add products from the home page to start your order.</p>
            </div>
          )}
        </div>

        <aside className="summary-card">
          <span className="mini-badge">
            <AppIcon type="wallet" className="badge-icon" />
            Order Summary
          </span>
          <h2>Simple and ready to checkout</h2>
          <div className="summary-row">
            <span className="icon-text">
              <AppIcon type="products" className="summary-icon" />
              Total item
            </span>
            <strong>{totalItems}</strong>
          </div>
          <div className="summary-row">
            <span className="icon-text">
              <AppIcon type="wallet" className="summary-icon" />
              Total price
            </span>
            <strong>Rp {currencyFormatter.format(totalPrice)}</strong>
          </div>
          <button className="primary-button full-width" onClick={() => navigateTo('checkout')}>
            Go to Checkout
          </button>
        </aside>
      </section>
    </main>
  );

  const renderCheckout = () => (
    <main className="page-shell">
      <section className="checkout-layout">
        <div className="order-card">
          <div className="section-header compact">
            <div>
              <span className="mini-badge">
                <AppIcon type="wallet" className="badge-icon" />
                Checkout
              </span>
              <h1>Ringkasan pesanan</h1>
            </div>
          </div>

          {cartItems.length > 0 ? (
            <div className="checkout-items">
              {cartItems.map((item) => (
                <div key={item.id} className="checkout-item-row with-divider">
                  <div className="checkout-item-copy">
                    <span className="checkout-item-name">{item.name}</span>
                    <span className="checkout-item-qty">Qty {item.quantity}</span>
                  </div>
                  <strong className="checkout-item-price">
                    Rp {currencyFormatter.format(item.price * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state left">
              <h3>No order to checkout</h3>
              <p>Please add some products to your cart first.</p>
            </div>
          )}
        </div>

        <aside className="summary-card">
          <div className="summary-section">
            <span className="mini-badge">
              <AppIcon type="wallet" className="badge-icon" />
              Payment Method
            </span>
            <h2>Pilih metode pembayaran</h2>
            <div className="payment-method-groups">
              {paymentMethods.map((group) => (
                <div key={group.group} className="payment-method-group">
                  <p className="payment-group-title">{group.group}</p>
                  <div className="payment-method-list">
                    {group.options.map((option) => (
                      <button
                        key={option.id}
                        className={`payment-method-card ${
                          selectedPaymentMethod === option.id ? 'active' : ''
                        }`}
                        onClick={() => setSelectedPaymentMethod(option.id)}
                      >
                        <span className="payment-method-name">{option.label}</span>
                        <span className="payment-method-note">{option.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="summary-section">
            <span className="mini-badge">
              <AppIcon type="delivery" className="badge-icon" />
              Delivery
            </span>
            <h2>Order details</h2>
            <div className="summary-row">
              <span className="icon-text">
                <AppIcon type="user" className="summary-icon" />
                Customer
              </span>
              <strong>{username}</strong>
            </div>
            <div className="summary-row">
              <span className="icon-text">
                <AppIcon type="products" className="summary-icon" />
                Items
              </span>
              <strong>{totalItems}</strong>
            </div>
            <div className="summary-row">
              <span className="icon-text">
                <AppIcon type="wallet" className="summary-icon" />
                Payment
              </span>
              <strong>{activePaymentMethod?.label || 'Belum dipilih'}</strong>
            </div>
            <div className="summary-row">
              <span className="icon-text">
                <AppIcon type="wallet" className="summary-icon" />
                Total
              </span>
              <strong>Rp {currencyFormatter.format(totalPrice)}</strong>
            </div>
          </div>
          <button className="primary-button full-width" onClick={placeOrder}>
            Place Order
          </button>
        </aside>
      </section>
    </main>
  );

  const renderProfile = () => (
    <main className="page-shell">
      <section className="profile-layout">
        <div className="profile-card">
          <span className="mini-badge">
            <AppIcon type="user" className="badge-icon" />
            Profile
          </span>
          <h1>Profil akun kamu</h1>
          <p className="section-copy">
            Kelola informasi akun sederhana, lihat ringkasan aktivitas, lalu logout
            dari satu tempat yang rapi.
          </p>

          <div className="profile-identity">
            <span className="profile-avatar">{username[0]?.toUpperCase() || 'G'}</span>
            <div>
              <h2>{username}</h2>
              <p>{user?.email || 'No email available'}</p>
            </div>
          </div>

          <div className="profile-stat-grid">
            <div className="detail-meta-card">
              <span className="card-icon-badge">
                <AppIcon type="heart" className="content-icon" />
              </span>
              <strong>{wishlist.length}</strong>
              <span>Wishlist item</span>
            </div>
            <div className="detail-meta-card">
              <span className="card-icon-badge">
                <AppIcon type="cart" className="content-icon" />
              </span>
              <strong>{totalItems}</strong>
              <span>Items in cart</span>
            </div>
            <div className="detail-meta-card">
              <span className="card-icon-badge">
                <AppIcon type="products" className="content-icon" />
              </span>
              <strong>{inventory.length}</strong>
              <span>Available products</span>
            </div>
          </div>
        </div>

        <aside className="summary-card">
          <span className="mini-badge">
            <AppIcon type="spark" className="badge-icon" />
            Account Actions
          </span>
          <h2>Quick actions</h2>
          <div className="profile-action-list">
            <div className="summary-row">
              <span className="icon-text">
                <AppIcon type="wallet" className="summary-icon" />
                Total belanja aktif
              </span>
              <strong>Rp {currencyFormatter.format(activeSpending)}</strong>
            </div>
            <div className="summary-row">
              <span className="icon-text">
                <AppIcon type="products" className="summary-icon" />
                Riwayat pembelian
              </span>
              <strong>{purchaseHistory.length} order</strong>
            </div>
            <div className="summary-row">
              <span className="icon-text">
                <AppIcon type="delivery" className="summary-icon" />
                Role akun
              </span>
              <strong>{isAdminUser ? 'Admin' : 'Active'}</strong>
            </div>
          </div>
          <div className="profile-action-buttons">
            <button className="secondary-button full-width" onClick={() => navigateTo('home')}>
              Back to Home
            </button>
            <button className="primary-button full-width" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        <div className="profile-card profile-section-card profile-orders-card">
          <div className="section-header compact profile-section-header">
            <div>
              <span className="mini-badge">
                <AppIcon type="products" className="badge-icon" />
                Order History
              </span>
              <h2>Riwayat pesanan kamu</h2>
            </div>
          </div>

          {purchaseHistory.length > 0 ? (
            <div className="order-history-list">
              {purchaseHistory.map((order) => {
                const statusMeta = getOrderStatusMeta(order.status);

                return (
                  <article key={order.id} className="order-history-card">
                    <div className="order-history-top">
                      <div>
                        <strong className="order-history-id">{order.id}</strong>
                        <p className="order-history-date">
                          {dateTimeFormatter.format(new Date(order.createdAt))}
                        </p>
                      </div>
                      <span className={`order-status-pill ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="order-history-meta">
                      <span>Payment: {order.paymentMethod}</span>
                      <span>{order.totalItems} item</span>
                      <strong>Rp {currencyFormatter.format(order.totalPrice || 0)}</strong>
                    </div>

                    <div className="order-history-items">
                      {(order.items || []).map((item) => (
                        <div
                          key={`${order.id}-${item.productId}`}
                          className="order-history-item"
                        >
                          <span>{item.name}</span>
                          <span>
                            {item.quantity} x {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state left compact-empty-state">
              <h3>Belum ada order</h3>
              <p>Pesanan yang sudah kamu checkout akan muncul di sini.</p>
            </div>
          )}
        </div>

        {isAdminUser ? (
          <div className="profile-card profile-section-card admin-orders-card">
            <div className="section-header compact profile-section-header">
              <div>
                <span className="mini-badge">
                  <AppIcon type="delivery" className="badge-icon" />
                  Admin Orders
                </span>
                <h2>Kelola status pesanan</h2>
              </div>
              <button
                className="secondary-button"
                onClick={loadAdminOrders}
                disabled={isAdminOrdersLoading}
              >
                {isAdminOrdersLoading ? 'Refreshing...' : 'Refresh Orders'}
              </button>
            </div>

            {adminOrdersError ? (
              <div className="form-error">{adminOrdersError}</div>
            ) : null}

            {isAdminOrdersLoading && adminOrders.length === 0 ? (
              <div className="empty-state left compact-empty-state">
                <h3>Loading orders</h3>
                <p>Sedang mengambil pesanan terbaru dari Firestore.</p>
              </div>
            ) : null}

            {!isAdminOrdersLoading && adminOrders.length === 0 ? (
              <div className="empty-state left compact-empty-state">
                <h3>Belum ada pesanan</h3>
                <p>Order baru yang masuk akan tampil di panel admin ini.</p>
              </div>
            ) : null}

            {adminOrders.length > 0 ? (
              <div className="admin-order-list">
                {adminOrders.map((order) => {
                  const statusMeta = getOrderStatusMeta(order.status);

                  return (
                    <article key={order.id} className="admin-order-item">
                      <div className="order-history-top">
                        <div>
                          <strong className="order-history-id">{order.id}</strong>
                          <p className="order-history-date">
                            {order.userEmail || order.userId}
                          </p>
                        </div>
                        <span className={`order-status-pill ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="order-history-meta">
                        <span>
                          {dateTimeFormatter.format(new Date(order.createdAt))}
                        </span>
                        <span>{order.totalItems} item</span>
                        <strong>Rp {currencyFormatter.format(order.totalPrice || 0)}</strong>
                      </div>

                      <div className="admin-order-actions">
                        {orderStatusOptions.map((status) => (
                          <button
                            key={`${order.id}-${status}`}
                            className={`status-action-button ${
                              order.status === status ? 'active' : ''
                            }`}
                            data-status={status}
                            onClick={() =>
                              handleAdminOrderStatusChange(order.id, status)
                            }
                            disabled={
                              order.status === status ||
                              orderStatusUpdatingId === order.id
                            }
                          >
                            {status === 'accepted'
                              ? 'Accept'
                              : status === 'processing'
                                ? 'Process'
                                : status === 'completed'
                                  ? 'Complete'
                                  : 'Cancel'}
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );

  const renderAuthenticatedView = () => {
    switch (currentView) {
      case 'wishlist':
        return renderWishlist();
      case 'cart':
        return renderCart();
      case 'checkout':
        return renderCheckout();
      case 'profile':
        return renderProfile();
      case 'detail':
        return renderDetail();
      case 'home':
      default:
        return renderHome();
    }
  };

  const renderCurrentPage = () => {
    if (useFirebase && !isRemoteAuthReady) {
      return (
        <main className="landing-page">
          <div className="empty-state">
            <h3>Loading your account</h3>
            <p>Syncing Firebase Auth and Firestore data for this session.</p>
          </div>
        </main>
      );
    }

    if (!user) {
      if (
        currentView === 'login' ||
        currentView === 'register' ||
        currentView === 'forgot'
      ) {
        return (
          <AuthForm
            mode={authMode}
            onSwitchMode={(mode) => {
              setAuthMode(mode);
              navigateTo(mode);
            }}
            onSubmit={handleAuthSubmit}
          />
        );
      }

      return renderLanding();
    }

    return (
      <>
        <Navbar
          currentView={currentView === 'detail' ? 'home' : currentView}
          onNavigate={navigateTo}
          cartCount={totalItems}
          wishlistCount={wishlist.length}
          user={user}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        {renderAuthenticatedView()}
        <Footer user={user} onNavigate={navigateTo} />
      </>
    );
  };

  return (
    <div className={`app-shell ${theme === 'dark' ? 'dark-theme' : ''}`}>
      {!user &&
      !(
        currentView === 'login' ||
        currentView === 'register' ||
        currentView === 'forgot'
      ) ? (
        <>
          {renderCurrentPage()}
          <Footer user={user} onNavigate={navigateTo} />
        </>
      ) : (
        renderCurrentPage()
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default App;
