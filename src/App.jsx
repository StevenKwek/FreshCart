import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import AuthForm from './components/AuthForm';
import AppIcon from './components/AppIcon';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import Toast from './components/Toast';
import {
  defaultPaymentMethods,
  normalizePaymentMethodsData,
} from './constants/paymentMethods';
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
  cancelUserOrder,
  checkoutWithFirebaseApi,
  createAdminProduct,
  createAdminPaymentMethod,
  deleteAdminProduct,
  deleteAdminPaymentMethod,
  ensureRemoteUserProfile,
  fetchAdminOrders,
  fetchPaymentMethods,
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
const monthShortFormatter = new Intl.DateTimeFormat('id-ID', {
  month: 'short',
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
const userNavItems = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'products', label: 'Products', icon: 'products' },
  { key: 'wishlist', label: 'Wishlist', icon: 'wishlist' },
  { key: 'cart', label: 'Cart', icon: 'cart' },
  { key: 'checkout', label: 'Checkout', icon: 'checkout' },
];
const adminNavItems = [
  { key: 'home', label: 'Dashboard', icon: 'home' },
  { key: 'admin-products', label: 'Products', icon: 'products' },
  { key: 'admin-orders', label: 'Orders', icon: 'orders' },
  { key: 'wishlist', label: 'Wishlist', icon: 'wishlist' },
  { key: 'payments', label: 'Payments', icon: 'payment' },
];
const createEmptyAdminProductForm = () => ({
  name: '',
  category: '',
  price: '',
  stock: '',
  unit: '',
  rating: '4.5',
  image: '',
  description: '',
});
const createEmptyAdminPaymentForm = () => ({
  group: '',
  label: '',
  note: '',
});

const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isSameMonth = (left, right) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();

const formatDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getOrdersForDateMatch = (orders, matcher) =>
  orders.filter((order) => {
    const orderDate = new Date(order.createdAt);

    if (Number.isNaN(orderDate.getTime())) {
      return false;
    }

    return matcher(orderDate);
  });

const buildSmoothLinePath = (points) => {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;

    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
};

const normalizeOrderStatusValue = (status) =>
  typeof status === 'string' ? status.trim().toLowerCase() : 'pending';

const getOrderStatusMeta = (status) => {
  const normalizedStatus = normalizeOrderStatusValue(status);

  switch (normalizedStatus) {
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
    case 'canceled':
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

const canUserCancelOrderStatus = (status) => {
  const normalizedStatus = normalizeOrderStatusValue(status);
  return normalizedStatus === 'pending' || normalizedStatus === 'accepted';
};
const getOrderStatusValue = (order) =>
  normalizeOrderStatusValue(order?.status);
const getOrderTotalPrice = (order) => {
  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    );
  }

  return Number(order?.totalPrice || 0);
};
const getOrderTotalItems = (order) => {
  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  return Number(order?.totalItems || 0);
};
const isCancelledOrder = (order) =>
  ['cancelled', 'canceled', 'cancel'].includes(getOrderStatusValue(order));

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
  const [paymentMethodGroups, setPaymentMethodGroups] = useState(
    defaultPaymentMethods,
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(() =>
    getScopedStoredValue(initialPaymentByUserState, initialUserState, ''),
  );
  const [statsAnchorDate, setStatsAnchorDate] = useState(() => new Date());
  const [chartYear, setChartYear] = useState(() => new Date().getFullYear());
  const [hoveredChartIndex, setHoveredChartIndex] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [previousView, setPreviousView] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [toast, setToast] = useState(null);
  const [firebaseAuthUser, setFirebaseAuthUser] = useState(null);
  const [remoteProfile, setRemoteProfile] = useState(null);
  const [isRemoteAuthReady, setIsRemoteAuthReady] = useState(!useFirebase);
  const [showStartupSplash, setShowStartupSplash] = useState(useFirebase);
  const [adminOrders, setAdminOrders] = useState([]);
  const [isAdminOrdersLoading, setIsAdminOrdersLoading] = useState(false);
  const [adminOrdersError, setAdminOrdersError] = useState('');
  const [orderStatusUpdatingId, setOrderStatusUpdatingId] = useState('');
  const [userOrderCancellingId, setUserOrderCancellingId] = useState('');
  const [adminProductForm, setAdminProductForm] = useState(createEmptyAdminProductForm);
  const [isAdminProductSaving, setIsAdminProductSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [adminPaymentForm, setAdminPaymentForm] = useState(createEmptyAdminPaymentForm);
  const [isAdminPaymentSaving, setIsAdminPaymentSaving] = useState(false);
  const [deletingPaymentMethodId, setDeletingPaymentMethodId] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const syncErrorShownRef = useRef(false);
  const skipRemoteSyncRef = useRef(false);
  const startupSplashTimerRef = useRef(null);
  const placeOrderLockRef = useRef(false);

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

    const finishStartupSplash = () => {
      if (startupSplashTimerRef.current) {
        window.clearTimeout(startupSplashTimerRef.current);
      }

      startupSplashTimerRef.current = window.setTimeout(() => {
        if (!isActive) {
          return;
        }

        setShowStartupSplash(false);
      }, 220);
    };

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
        finishStartupSplash();
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
          finishStartupSplash();
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
        finishStartupSplash();
      }
    });

    return () => {
      isActive = false;
      if (startupSplashTimerRef.current) {
        window.clearTimeout(startupSplashTimerRef.current);
      }
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
    if (!selectedPaymentMethod) {
      return;
    }

    const availableMethodIds = new Set(
      paymentMethodGroups.flatMap((group) => group.options.map((option) => option.id)),
    );

    if (!availableMethodIds.has(selectedPaymentMethod)) {
      setSelectedPaymentMethod('');
    }
  }, [paymentMethodGroups, selectedPaymentMethod]);

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
    if (
      !useFirebase ||
      !isAdminUser ||
      !['home', 'admin-orders'].includes(currentView)
    ) {
      return;
    }

    loadAdminOrders();
  }, [currentView, firebaseAuthUser, isAdminUser, useFirebase]);

  useEffect(() => {
    if (
      !useFirebase ||
      (typeof window !== 'undefined' &&
        window.location.hostname === 'localhost' &&
        window.location.port === '5173')
    ) {
      return;
    }

    let isMounted = true;

    fetchPaymentMethods()
      .then((groups) => {
        if (!isMounted) {
          return;
        }

        setPaymentMethodGroups(normalizePaymentMethodsData(groups));
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [useFirebase]);

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
  const adminProductList = [...inventory].sort((left, right) => left.id - right.id);

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
  const purchaseHistory = useFirebase
    ? remoteProfile?.purchaseHistory || []
    : getScopedStoredValue(purchaseHistoryByUser, userKey, []);
  const visiblePurchaseHistory = purchaseHistory.filter(
    (order) => !isCancelledOrder(order),
  );
  const visibleAdminOrders = adminOrders.filter((order) => !isCancelledOrder(order));
  const activeSpending = visiblePurchaseHistory.reduce(
    (sum, order) => sum + getOrderTotalPrice(order),
    0,
  );
  const activePaymentMethod = paymentMethodGroups
    .flatMap((group) => group.options)
    .find((option) => option.id === selectedPaymentMethod);
  const filteredStatsOrders = getOrdersForDateMatch(
    visiblePurchaseHistory,
    (orderDate) => isSameDay(orderDate, statsAnchorDate),
  );
  const statsItemsTotal = filteredStatsOrders.reduce(
    (sum, order) => sum + getOrderTotalItems(order),
    0,
  );
  const statsTotal = filteredStatsOrders.reduce(
    (sum, order) => sum + getOrderTotalPrice(order),
    0,
  );
  const overallItemsPurchased = visiblePurchaseHistory.reduce(
    (sum, order) => sum + getOrderTotalItems(order),
    0,
  );
  const chartSeries = Array.from({ length: 12 }, (_, index) => {
    const currentDate = new Date(chartYear, index, 1);
    const total = visiblePurchaseHistory
      .filter((order) => isSameMonth(new Date(order.createdAt), currentDate))
      .reduce((sum, order) => sum + getOrderTotalPrice(order), 0);

    return {
      monthIndex: index,
      date: currentDate,
      total,
    };
  });
  const chartMaxTotal = chartSeries.reduce(
    (max, point) => Math.max(max, point.total),
    0,
  );
  const chartWidth = 760;
  const chartHeight = 300;
  const chartPadding = {
    top: 18,
    right: 12,
    bottom: 42,
    left: 12,
  };
  const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const chartDenominator = Math.max(chartSeries.length - 1, 1);
  const chartPoints = chartSeries.map((point, index) => {
    const x =
      chartPadding.left + (index / chartDenominator) * chartInnerWidth;
    const y =
      chartPadding.top +
      chartInnerHeight -
      (chartMaxTotal > 0 ? (point.total / chartMaxTotal) * chartInnerHeight : 0);

    return {
      ...point,
      x,
      y,
    };
  });
  const chartLinePath = buildSmoothLinePath(chartPoints);
  const chartAreaPath = chartPoints.length
    ? `${chartLinePath} L ${chartPoints[chartPoints.length - 1].x} ${chartHeight - chartPadding.bottom} L ${chartPoints[0].x} ${chartHeight - chartPadding.bottom} Z`
    : '';
  const chartGridValues = Array.from({ length: 5 }, (_, index) =>
    Math.round(((4 - index) / 4) * chartMaxTotal),
  );
  const hoveredChartPoint =
    hoveredChartIndex === null ? null : chartPoints[hoveredChartIndex] || null;
  const chartMonthLabels = chartSeries.map((point) => monthShortFormatter.format(point.date));
  const chartSelectedPointLabel = hoveredChartPoint
    ? `${monthShortFormatter.format(hoveredChartPoint.date)} ${chartYear}`
    : '';

  const handleChartPointerMove = (event) => {
    if (!chartPoints.length) {
      return;
    }

    const svgElement = event.currentTarget.ownerSVGElement || event.currentTarget;
    const bounds = svgElement.getBoundingClientRect();

    if (!bounds.width) {
      return;
    }

    const relativeX = ((event.clientX - bounds.left) / bounds.width) * chartWidth;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    chartPoints.forEach((point, index) => {
      const distance = Math.abs(point.x - relativeX);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setHoveredChartIndex(nearestIndex);
  };

  const handleChartPointerLeave = () => {
    setHoveredChartIndex(null);
  };

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

  const handleUserOrderCancel = async (order) => {
    const currentStatus =
      typeof order?.status === 'string' ? order.status : 'pending';

    if (!canUserCancelOrderStatus(currentStatus)) {
      showToast('This order can no longer be cancelled.', 'warning');
      return;
    }

    if (
      typeof window !== 'undefined' &&
      !window.confirm('Cancel this order?')
    ) {
      return;
    }

    if (useFirebase) {
      if (!firebaseAuthUser) {
        showToast('Please login again to continue.', 'warning');
        return;
      }

      setUserOrderCancellingId(order.id);

      try {
        await cancelUserOrder({
          firebaseUser: firebaseAuthUser,
          orderId: order.id,
        });
        showToast('Order cancelled successfully.', 'info');
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Failed to cancel order.',
          'warning',
        );
      } finally {
        setUserOrderCancellingId('');
      }

      return;
    }

    if (!userKey) {
      showToast('Please login again to continue.', 'warning');
      return;
    }

    setUserOrderCancellingId(order.id);

    try {
      const items = Array.isArray(order.items) ? order.items : [];
      const orderTotal = getOrderTotalPrice(order);

      setInventory((current) =>
        current.map((product) => {
          const cancelledItem = items.find(
            (item) => Number(item.productId) === Number(product.id),
          );

          if (!cancelledItem) {
            return product;
          }

          return {
            ...product,
            stock: product.stock + Number(cancelledItem.quantity || 0),
          };
        }),
      );

      setSpendingByUser((current) => ({
        ...current,
        [username]: Math.max((current[username] || 0) - orderTotal, 0),
      }));

      setPurchaseHistoryByUser((current) => {
        const scopedHistory = getScopedStoredValue(current, userKey, []);

        return {
          ...current,
          [userKey]: scopedHistory.filter((entry) => entry.id !== order.id),
        };
      });

      showToast('Order cancelled successfully.', 'info');
    } finally {
      setUserOrderCancellingId('');
    }
  };

  const handleAdminProductFieldChange = (field, value) => {
    setAdminProductForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAdminProductSubmit = async (event) => {
    event.preventDefault();

    if (!firebaseAuthUser) {
      showToast('Please login again before managing products.', 'warning');
      return;
    }

    setIsAdminProductSaving(true);

    try {
      await createAdminProduct({
        firebaseUser: firebaseAuthUser,
        product: {
          ...adminProductForm,
          price: Number(adminProductForm.price),
          stock: Number(adminProductForm.stock),
          rating: Number(adminProductForm.rating || 4.5),
        },
      });
      setAdminProductForm(createEmptyAdminProductForm());
      showToast('Produk baru berhasil ditambahkan.');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to create the product.',
        'warning',
      );
    } finally {
      setIsAdminProductSaving(false);
    }
  };

  const handleAdminProductDelete = async (product) => {
    if (!firebaseAuthUser) {
      showToast('Please login again before managing products.', 'warning');
      return;
    }

    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Hapus produk "${product.name}" dari katalog?`)
    ) {
      return;
    }

    setDeletingProductId(product.id);

    try {
      await deleteAdminProduct({
        firebaseUser: firebaseAuthUser,
        productId: product.id,
      });
      showToast(`${product.name} berhasil dihapus.`, 'info');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to delete the product.',
        'warning',
      );
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleAdminPaymentFieldChange = (field, value) => {
    setAdminPaymentForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAdminPaymentSubmit = async (event) => {
    event.preventDefault();

    if (!firebaseAuthUser) {
      showToast('Please login again before managing payment methods.', 'warning');
      return;
    }

    setIsAdminPaymentSaving(true);

    try {
      const nextGroups = await createAdminPaymentMethod({
        firebaseUser: firebaseAuthUser,
        group: adminPaymentForm.group,
        label: adminPaymentForm.label,
        note: adminPaymentForm.note,
      });
      setPaymentMethodGroups(normalizePaymentMethodsData(nextGroups));
      setAdminPaymentForm(createEmptyAdminPaymentForm());
      showToast('Metode pembayaran baru berhasil ditambahkan.');
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to create the payment method.',
        'warning',
      );
    } finally {
      setIsAdminPaymentSaving(false);
    }
  };

  const handleAdminPaymentDelete = async (option) => {
    if (!firebaseAuthUser) {
      showToast('Please login again before managing payment methods.', 'warning');
      return;
    }

    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Hapus metode pembayaran "${option.label}"?`)
    ) {
      return;
    }

    setDeletingPaymentMethodId(option.id);

    try {
      const nextGroups = await deleteAdminPaymentMethod({
        firebaseUser: firebaseAuthUser,
        methodId: option.id,
      });
      setPaymentMethodGroups(normalizePaymentMethodsData(nextGroups));
      showToast(`${option.label} berhasil dihapus.`, 'info');
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to delete the payment method.',
        'warning',
      );
    } finally {
      setDeletingPaymentMethodId('');
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
    if (placeOrderLockRef.current || isPlacingOrder) {
      return;
    }

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

    placeOrderLockRef.current = true;
    setIsPlacingOrder(true);

    if (useFirebase) {
      if (!firebaseAuthUser) {
        showToast('Please login first before placing an order.', 'warning');
        placeOrderLockRef.current = false;
        setIsPlacingOrder(false);
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
      } finally {
        placeOrderLockRef.current = false;
        setIsPlacingOrder(false);
      }

      return;
    }

    try {
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
    } finally {
      placeOrderLockRef.current = false;
      setIsPlacingOrder(false);
    }
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

  const renderHome = () => {
    if (isAdminUser) {
      return (
        <main className="page-shell">
          <section className="home-banner admin-home-banner">
            <div>
              <span className="mini-badge">Admin dashboard</span>
              <h1>Kelola katalog, order, wishlist, dan payment method dari satu tempat.</h1>
              <p>
                Mode admin sekarang punya jalur kerja yang lebih lengkap, jadi kamu
                tidak hanya memantau pesanan tapi juga bisa mengurus isi toko.
              </p>
            </div>
            <div className="stat-grid">
              <div className="stat-card">
                <span className="card-icon-badge">
                  <AppIcon type="products" className="content-icon" />
                </span>
                <strong>{inventory.length}</strong>
                <span>Total produk</span>
              </div>
              <div className="stat-card">
                <span className="card-icon-badge">
                  <AppIcon type="delivery" className="content-icon" />
                </span>
                <strong>
                  {visibleAdminOrders.filter(
                    (order) => getOrderStatusValue(order) === 'pending',
                  ).length}
                </strong>
                <span>Pending orders</span>
              </div>
              <div className="stat-card">
                <span className="card-icon-badge">
                  <AppIcon type="wallet" className="content-icon" />
                </span>
                <strong>
                  {paymentMethodGroups.reduce(
                    (sum, group) => sum + group.options.length,
                    0,
                  )}
                </strong>
                <span>Payment options</span>
              </div>
            </div>
          </section>

          <section className="admin-shortcut-grid">
            <button className="admin-shortcut-card" onClick={() => navigateTo('admin-products')}>
              <span className="mini-badge">
                <AppIcon type="products" className="badge-icon" />
                Products
              </span>
              <h2>Tambah dan hapus produk</h2>
              <p>Atur katalog aktif, stok baru, dan produk yang sudah tidak dijual.</p>
            </button>
            <button className="admin-shortcut-card" onClick={() => navigateTo('admin-orders')}>
              <span className="mini-badge">
                <AppIcon type="delivery" className="badge-icon" />
                Orders
              </span>
              <h2>Pantau order masuk</h2>
              <p>Lihat pesanan terbaru lalu ubah statusnya tanpa masuk ke profile.</p>
            </button>
            <button className="admin-shortcut-card" onClick={() => navigateTo('payments')}>
              <span className="mini-badge">
                <AppIcon type="wallet" className="badge-icon" />
                Payments
              </span>
              <h2>Atur metode pembayaran</h2>
              <p>Pilih metode default admin untuk simulasi checkout berikutnya.</p>
            </button>
          </section>
        </main>
      );
    }

    return (
      <main className="page-shell">
        <section className="home-banner analytics-home-banner">
          <div className="analytics-hero-copy">
            <span className="mini-badge">Spending dashboard</span>
            <h1>Pantau pengeluaran kamu dari satu dashboard yang lebih fokus.</h1>
            <p>
              Home sekarang fokus ke total belanja dan analisis grafik, jadi kamu bisa
              lihat pola pengeluaran tanpa campuran katalog produk.
            </p>
          </div>
          <div className="stat-grid analytics-stat-grid">
            <div className="stat-card">
              <span className="card-icon-badge">
                <AppIcon type="wallet" className="content-icon" />
              </span>
              <strong>Rp {currencyFormatter.format(activeSpending)}</strong>
              <span>Total pengeluaran keseluruhan</span>
            </div>
            <div className="stat-card">
              <span className="card-icon-badge">
                <AppIcon type="cart" className="content-icon" />
              </span>
              <strong>{overallItemsPurchased}</strong>
              <span>Total item dibeli</span>
            </div>
          </div>
        </section>

        <section className="checkout-layout analytics-layout">
          <div className="order-card analytics-panel">
            <div className="section-header compact">
              <div>
                <span className="mini-badge">
                  <AppIcon type="spark" className="badge-icon" />
                  Analytics Controls
                </span>
                <h1>Atur periode statistik</h1>
                <p>Pilih tanggal untuk melihat total pengeluaran dan jumlah barang yang dibeli pada hari itu.</p>
              </div>
            </div>

            <div className="analytics-control-row">
              <label className="analytics-calendar-field field-group">
                <span>Tanggal acuan</span>
                <input
                  type="date"
                  value={formatDateInputValue(statsAnchorDate)}
                  onChange={(event) => {
                    if (!event.target.value) {
                      return;
                    }

                    const nextDate = new Date(`${event.target.value}T00:00:00`);

                    if (!Number.isNaN(nextDate.getTime())) {
                      setStatsAnchorDate(nextDate);
                    }
                  }}
                />
              </label>
            </div>

            <div className="analytics-summary-grid">
              <div className="detail-meta-card analytics-summary-card">
                <span className="card-icon-badge">
                  <AppIcon type="wallet" className="content-icon" />
                </span>
                <strong>Rp {currencyFormatter.format(statsTotal)}</strong>
                <span>Total pengeluaran tanggal terpilih</span>
              </div>
              <div className="detail-meta-card analytics-summary-card">
                <span className="card-icon-badge">
                  <AppIcon type="cart" className="content-icon" />
                </span>
                <strong>{statsItemsTotal}</strong>
                <span>Total barang tanggal terpilih</span>
              </div>
            </div>
          </div>

          <aside className="summary-card analytics-side-panel">
            <div className="pivot-chart-header">
              <div>
                <span className="mini-badge">
                  <AppIcon type="products" className="badge-icon" />
                  Pivot Analysis
                </span>
                <h2>Chart pengeluaran bulanan</h2>
                <p className="pivot-chart-copy">Data per bulan untuk tahun yang dipilih.</p>
              </div>
              <div className="pivot-year-switcher">
                <button
                  className="secondary-button"
                  onClick={() => setChartYear((current) => current - 1)}
                >
                  ←
                </button>
                <strong>{chartYear}</strong>
                <button
                  className="secondary-button"
                  onClick={() => setChartYear((current) => current + 1)}
                >
                  →
                </button>
              </div>
            </div>

            <div className="pivot-chart-card">
              <div className="pivot-section-header">
                <strong>Total pengeluaran per bulan</strong>
                <span>Berdasarkan tahun yang dipilih</span>
              </div>
              <div className="pivot-line-chart-shell">
                {hoveredChartPoint ? (
                  <div
                    className="pivot-chart-tooltip"
                    style={{
                      left: `${(hoveredChartPoint.x / chartWidth) * 100}%`,
                      top: `${(hoveredChartPoint.y / chartHeight) * 100}%`,
                    }}
                  >
                    <span>{chartSelectedPointLabel}</span>
                    <strong>Rp {currencyFormatter.format(hoveredChartPoint.total)}</strong>
                  </div>
                ) : null}
                <svg
                  className="pivot-line-chart"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  role="img"
                  aria-label={`Grafik pengeluaran bulanan tahun ${chartYear}`}
                >
                  <defs>
                    <linearGradient id="pivot-chart-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1f8b57" stopOpacity="0.26" />
                      <stop offset="100%" stopColor="#1f8b57" stopOpacity="0.03" />
                    </linearGradient>
                  </defs>
                  {chartGridValues.map((value, index) => {
                    const y = chartPadding.top + (index / 4) * chartInnerHeight;

                    return (
                      <g key={`${value}-${index}`}>
                        <line
                          x1={chartPadding.left}
                          y1={y}
                          x2={chartWidth - chartPadding.right}
                          y2={y}
                          className="pivot-line-grid"
                        />
                        <text
                          x={chartPadding.left + 6}
                          y={Math.max(y - 8, chartPadding.top + 12)}
                          className="pivot-line-grid-label"
                        >
                          Rp {currencyFormatter.format(value)}
                        </text>
                      </g>
                    );
                  })}

                  {chartAreaPath ? <path d={chartAreaPath} className="pivot-line-area" /> : null}
                  {chartLinePath ? <path d={chartLinePath} className="pivot-line-stroke" /> : null}
                  {chartLinePath ? (
                    <path
                      d={chartLinePath}
                      className="pivot-line-hitline"
                      onPointerMove={handleChartPointerMove}
                      onPointerEnter={handleChartPointerMove}
                      onPointerLeave={handleChartPointerLeave}
                    />
                  ) : null}

                  {hoveredChartPoint ? (
                    <g>
                      <line
                        x1={hoveredChartPoint.x}
                        y1={chartPadding.top}
                        x2={hoveredChartPoint.x}
                        y2={chartHeight - chartPadding.bottom}
                        className="pivot-line-marker"
                      />
                      <circle
                        cx={hoveredChartPoint.x}
                        cy={hoveredChartPoint.y}
                        r="6"
                        className="pivot-line-point"
                      />
                    </g>
                  ) : null}
                  {chartPoints.map((point) => (
                    <circle
                      key={point.monthIndex}
                      cx={point.x}
                      cy={point.y}
                      r="16"
                      className="pivot-line-hitbox"
                      onPointerEnter={() => setHoveredChartIndex(point.monthIndex)}
                    />
                  ))}
                </svg>

                <div className="pivot-chart-xlabels">
                  {chartMonthLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>

                <div className="pivot-chart-caption">
                  <strong>Bulan</strong>
                  <span>Gunakan panah kiri-kanan untuk mengganti tahun pada pivot chart.</span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    );
  };

  const renderProducts = () => (
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
      return isAdminUser ? renderHome() : renderProducts();
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

      <section className="products-grid wishlist-grid">
        {wishlistProducts.length > 0 ? (
          wishlistProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant="wishlist"
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
          <button
            className="primary-button full-width"
            onClick={() => navigateTo('checkout')}
            disabled={cartItems.length === 0}
          >
            Go to Checkout
          </button>
        </aside>
      </section>
    </main>
  );

  const renderPaymentMethodSelector = () => (
    <div className="payment-method-groups">
      {paymentMethodGroups.map((group) => (
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
            {renderPaymentMethodSelector()}
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
          <button
            className="primary-button full-width"
            onClick={placeOrder}
            disabled={cartItems.length === 0 || !selectedPaymentMethod || isPlacingOrder}
          >
            {isPlacingOrder ? 'Please wait...' : 'Place Order'}
          </button>
        </aside>
      </section>
    </main>
  );

  const renderPayments = () => (
    <main className="page-shell">
      <section className="checkout-layout">
        <div className="order-card">
          <div className="section-header compact">
            <div>
              <span className="mini-badge">
                <AppIcon type="wallet" className="badge-icon" />
                Payment Settings
              </span>
              <h1>
                {isAdminUser ? 'Atur metode pembayaran admin' : 'Pilih metode pembayaran'}
              </h1>
              <p>
                {isAdminUser
                  ? 'Metode yang dipilih di sini akan jadi preferensi default saat admin melakukan simulasi checkout.'
                  : 'Pilih metode pembayaran favorit supaya checkout berikutnya lebih cepat.'}
              </p>
            </div>
          </div>

          {renderPaymentMethodSelector()}

          {isAdminUser ? (
            <div className="admin-payment-manager">
              <div className="section-header compact admin-payment-header">
                <div>
                  <span className="mini-badge">
                    <AppIcon type="payment" className="badge-icon" />
                    Admin Controls
                  </span>
                  <h2>Tambah metode pembayaran baru</h2>
                </div>
              </div>

              <form className="admin-payment-form" onSubmit={handleAdminPaymentSubmit}>
                <div className="admin-product-form-grid">
                  <label className="field-group">
                    <span>Group</span>
                    <input
                      type="text"
                      value={adminPaymentForm.group}
                      onChange={(event) =>
                        handleAdminPaymentFieldChange('group', event.target.value)
                      }
                      placeholder="Contoh: COD atau Virtual Account"
                    />
                  </label>
                  <label className="field-group">
                    <span>Label</span>
                    <input
                      type="text"
                      value={adminPaymentForm.label}
                      onChange={(event) =>
                        handleAdminPaymentFieldChange('label', event.target.value)
                      }
                      placeholder="Contoh: QRIS"
                    />
                  </label>
                  <label className="field-group admin-product-form-full">
                    <span>Note</span>
                    <input
                      type="text"
                      value={adminPaymentForm.note}
                      onChange={(event) =>
                        handleAdminPaymentFieldChange('note', event.target.value)
                      }
                      placeholder="Catatan singkat untuk user"
                    />
                  </label>
                </div>

                <div className="admin-product-form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setAdminPaymentForm(createEmptyAdminPaymentForm())}
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isAdminPaymentSaving}
                  >
                    {isAdminPaymentSaving ? 'Saving...' : 'Add Payment Method'}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>

        <aside className="summary-card">
          <span className="mini-badge">
            <AppIcon type="spark" className="badge-icon" />
            Payment Summary
          </span>
          <h2>Preferensi aktif</h2>
          <div className="summary-row">
            <span className="icon-text">
              <AppIcon type="wallet" className="summary-icon" />
              Metode terpilih
            </span>
            <strong>{activePaymentMethod?.label || 'Belum dipilih'}</strong>
          </div>
          <div className="summary-row">
            <span className="icon-text">
              <AppIcon type="products" className="summary-icon" />
              Total opsi
            </span>
            <strong>
              {paymentMethodGroups.reduce((sum, group) => sum + group.options.length, 0)}
            </strong>
          </div>
          <div className="empty-state left compact-empty-state payment-preference-note">
            <h3>Disimpan otomatis</h3>
            <p>
              FreshCart akan menyimpan pilihan ini ke akun kamu supaya tidak perlu
              memilih ulang setiap kali kembali.
            </p>
          </div>
        </aside>
      </section>

      {isAdminUser ? (
        <section className="profile-card profile-section-card admin-payment-list-section">
          <div className="section-header compact">
            <div>
              <span className="mini-badge">
                <AppIcon type="payment" className="badge-icon" />
                Payment List
              </span>
              <h2>Daftar metode pembayaran aktif</h2>
            </div>
          </div>

          <div className="admin-payment-list">
            {paymentMethodGroups.map((group) => (
              <div key={group.group} className="admin-payment-group-card">
                <div className="admin-payment-group-header">
                  <strong>{group.group}</strong>
                  <span>{group.options.length} metode</span>
                </div>
                <div className="admin-payment-option-list">
                  {group.options.map((option) => (
                    <article key={option.id} className="admin-payment-option">
                      <div>
                        <strong>{option.label}</strong>
                        <p>{option.note}</p>
                      </div>
                      <button
                        className="secondary-button danger-button"
                        onClick={() => handleAdminPaymentDelete(option)}
                        disabled={deletingPaymentMethodId === option.id}
                      >
                        {deletingPaymentMethodId === option.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );

  const renderAdminProducts = () => (
    <main className="page-shell">
      <section className="checkout-layout admin-products-layout">
        <div className="order-card admin-product-form-card">
          <div className="section-header compact">
            <div>
              <span className="mini-badge">
                <AppIcon type="products" className="badge-icon" />
                Product Manager
              </span>
              <h1>Tambah produk baru</h1>
              <p>Lengkapi form ini untuk menambahkan item baru ke katalog FreshCart.</p>
            </div>
          </div>

          <form className="admin-product-form" onSubmit={handleAdminProductSubmit}>
            <div className="admin-product-form-grid">
              <label className="field-group">
                <span>Nama produk</span>
                <input
                  type="text"
                  value={adminProductForm.name}
                  onChange={(event) =>
                    handleAdminProductFieldChange('name', event.target.value)
                  }
                  placeholder="Contoh: Alpukat Mentega"
                />
              </label>
              <label className="field-group">
                <span>Kategori</span>
                <input
                  type="text"
                  value={adminProductForm.category}
                  onChange={(event) =>
                    handleAdminProductFieldChange('category', event.target.value)
                  }
                  placeholder="Buah Segar"
                />
              </label>
              <label className="field-group">
                <span>Harga</span>
                <input
                  type="number"
                  min="0"
                  value={adminProductForm.price}
                  onChange={(event) =>
                    handleAdminProductFieldChange('price', event.target.value)
                  }
                  placeholder="28000"
                />
              </label>
              <label className="field-group">
                <span>Stok</span>
                <input
                  type="number"
                  min="0"
                  value={adminProductForm.stock}
                  onChange={(event) =>
                    handleAdminProductFieldChange('stock', event.target.value)
                  }
                  placeholder="40"
                />
              </label>
              <label className="field-group">
                <span>Satuan</span>
                <input
                  type="text"
                  value={adminProductForm.unit}
                  onChange={(event) =>
                    handleAdminProductFieldChange('unit', event.target.value)
                  }
                  placeholder="per kg"
                />
              </label>
              <label className="field-group">
                <span>Rating</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={adminProductForm.rating}
                  onChange={(event) =>
                    handleAdminProductFieldChange('rating', event.target.value)
                  }
                  placeholder="4.5"
                />
              </label>
              <label className="field-group admin-product-form-full">
                <span>URL gambar</span>
                <input
                  type="url"
                  value={adminProductForm.image}
                  onChange={(event) =>
                    handleAdminProductFieldChange('image', event.target.value)
                  }
                  placeholder="https://..."
                />
              </label>
              <label className="field-group admin-product-form-full">
                <span>Deskripsi</span>
                <input
                  type="text"
                  value={adminProductForm.description}
                  onChange={(event) =>
                    handleAdminProductFieldChange('description', event.target.value)
                  }
                  placeholder="Tulis deskripsi singkat produk"
                />
              </label>
            </div>

            <div className="admin-product-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setAdminProductForm(createEmptyAdminProductForm())}
              >
                Reset Form
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={isAdminProductSaving}
              >
                {isAdminProductSaving ? 'Saving...' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>

        <aside className="summary-card">
          <span className="mini-badge">
            <AppIcon type="products" className="badge-icon" />
            Catalog Overview
          </span>
          <h2>Ringkasan katalog</h2>
          <div className="summary-row">
            <span className="icon-text">
              <AppIcon type="products" className="summary-icon" />
              Total produk
            </span>
            <strong>{adminProductList.length}</strong>
          </div>
          <div className="summary-row">
            <span className="icon-text">
              <AppIcon type="grid" className="summary-icon" />
              Kategori aktif
            </span>
            <strong>{categories.filter((category) => category !== 'All').length}</strong>
          </div>
          <div className="summary-row">
            <span className="icon-text">
              <AppIcon type="stock" className="summary-icon" />
              Total stok
            </span>
            <strong>
              {adminProductList.reduce((sum, product) => sum + Number(product.stock || 0), 0)}
            </strong>
          </div>
        </aside>
      </section>

      <section className="profile-card profile-section-card">
        <div className="section-header compact">
          <div>
            <span className="mini-badge">
              <AppIcon type="products" className="badge-icon" />
              Product List
            </span>
            <h2>Produk aktif di FreshCart</h2>
          </div>
        </div>

        {adminProductList.length > 0 ? (
          <div className="admin-product-list">
            {adminProductList.map((product) => (
              <article key={product.id} className="admin-product-item">
                <div className="admin-product-summary">
                  <img src={product.image} alt={product.name} className="admin-product-thumb" />
                  <div>
                    <strong>{product.name}</strong>
                    <p>
                      {product.category} • Rp {currencyFormatter.format(product.price)} /{' '}
                      {product.unit}
                    </p>
                    <span className="admin-product-description">{product.description}</span>
                  </div>
                </div>
                <div className="admin-product-meta">
                  <span>Stok {product.stock}</span>
                  <span>Rating {product.rating}</span>
                  <button
                    className="secondary-button danger-button"
                    onClick={() => handleAdminProductDelete(product)}
                    disabled={deletingProductId === product.id}
                  >
                    {deletingProductId === product.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state left compact-empty-state">
            <h3>Belum ada produk</h3>
            <p>Tambahkan produk pertama dari form di atas untuk mulai mengisi katalog.</p>
          </div>
        )}
      </section>
    </main>
  );

  const renderAdminOrders = () => (
    <main className="page-shell">
      <section className="profile-card profile-section-card admin-orders-card standalone-admin-orders">
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

        {adminOrdersError ? <div className="form-error">{adminOrdersError}</div> : null}

        {isAdminOrdersLoading && visibleAdminOrders.length === 0 ? (
          <div className="empty-state left compact-empty-state">
            <h3>Loading orders</h3>
            <p>Sedang mengambil pesanan terbaru dari Firestore.</p>
          </div>
        ) : null}

        {!isAdminOrdersLoading && visibleAdminOrders.length === 0 ? (
          <div className="empty-state left compact-empty-state">
            <h3>Belum ada pesanan</h3>
            <p>Order baru yang masuk akan tampil di panel admin ini.</p>
          </div>
        ) : null}

        {visibleAdminOrders.length > 0 ? (
          <div className="admin-order-list">
            {visibleAdminOrders.map((order) => {
              const normalizedOrderStatus = getOrderStatusValue(order);
              const statusMeta = getOrderStatusMeta(normalizedOrderStatus);
              const visibleOrderActions =
                normalizedOrderStatus === 'completed' ? ['completed'] : orderStatusOptions;

              return (
                <article key={order.id} className="admin-order-item">
                  <div className="order-history-top">
                    <div>
                      <strong className="order-history-id">{order.id}</strong>
                      <p className="order-history-date">{order.userEmail || order.userId}</p>
                    </div>
                    <span className={`order-status-pill ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="order-history-meta">
                    <span>{dateTimeFormatter.format(new Date(order.createdAt))}</span>
                    <span>{getOrderTotalItems(order)} item</span>
                    <strong>Rp {currencyFormatter.format(getOrderTotalPrice(order))}</strong>
                  </div>

                  <div className="admin-order-actions">
                    {visibleOrderActions.map((status) => (
                      <button
                        key={`${order.id}-${status}`}
                        className={`status-action-button ${
                          normalizedOrderStatus === status ? 'active' : ''
                        }`}
                        data-status={status}
                        onClick={() => handleAdminOrderStatusChange(order.id, status)}
                        disabled={
                          normalizedOrderStatus === status || orderStatusUpdatingId === order.id
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
              <strong>{visiblePurchaseHistory.length} order</strong>
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
            {isAdminUser ? (
              <>
                <button
                  className="secondary-button full-width"
                  onClick={() => navigateTo('admin-products')}
                >
                  Manage Products
                </button>
                <button
                  className="secondary-button full-width"
                  onClick={() => navigateTo('admin-orders')}
                >
                  Manage Orders
                </button>
              </>
            ) : null}
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

          {visiblePurchaseHistory.length > 0 ? (
            <div className="order-history-list">
              {visiblePurchaseHistory.map((order) => {
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
                      <span>{getOrderTotalItems(order)} item</span>
                      <strong>Rp {currencyFormatter.format(getOrderTotalPrice(order))}</strong>
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

                    {canUserCancelOrderStatus(getOrderStatusValue(order)) ? (
                      <div className="order-history-actions">
                        <button
                          className="status-action-button"
                          data-status="cancelled"
                          onClick={() => handleUserOrderCancel(order)}
                          disabled={userOrderCancellingId === order.id}
                        >
                          {userOrderCancellingId === order.id
                            ? 'Cancelling...'
                            : 'Cancel Order'}
                        </button>
                      </div>
                    ) : null}
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
      </section>
    </main>
  );

  const renderAuthenticatedView = () => {
    switch (currentView) {
      case 'wishlist':
        return renderWishlist();
      case 'products':
        return renderProducts();
      case 'payments':
        return renderPayments();
      case 'cart':
        return renderCart();
      case 'checkout':
        return renderCheckout();
      case 'admin-products':
        return isAdminUser ? renderAdminProducts() : renderHome();
      case 'admin-orders':
        return isAdminUser ? renderAdminOrders() : renderHome();
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
    if (
      useFirebase &&
      (showStartupSplash || !isRemoteAuthReady) &&
      !['login', 'register', 'forgot'].includes(currentView)
    ) {
      return (
        <main className="landing-page startup-splash">
          <section className="startup-splash-card">
            <span className="startup-splash-mark">
              <AppIcon type="cart" className="startup-splash-icon" />
            </span>
            <span className="mini-badge">FreshCart</span>
            <h1>Menyiapkan session kamu</h1>
            <p>Mohon tunggu sebentar, kami sedang memulihkan akun dan data belanja kamu.</p>
            <div className="startup-splash-loader" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </section>
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
          currentView={currentView === 'detail' ? (isAdminUser ? 'home' : 'products') : currentView}
          onNavigate={navigateTo}
          cartCount={totalItems}
          wishlistCount={wishlist.length}
          user={user}
          theme={theme}
          onToggleTheme={toggleTheme}
          navItems={isAdminUser ? adminNavItems : userNavItems}
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
