import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  ensureFirebaseAuthPersistence,
  isFirebaseConfigured,
} from '../lib/firebase';
import {
  createSessionUser,
  normalizeEmail,
  normalizeUsernameInput,
  syncCartWithInventory,
  syncWishlistWithInventory,
} from '../utils/appState';

const PRODUCTS_COLLECTION = 'products';
const USERS_COLLECTION = 'users';
const USERNAMES_COLLECTION = 'usernames';

const sanitizeCart = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.productId) &&
        item.productId > 0 &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0,
    );
};

const sanitizeWishlist = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((productId) => Number(productId))
    .filter((productId) => Number.isFinite(productId));
};

const normalizeInventoryProduct = (docSnapshot) => {
  const data = docSnapshot.data();
  const numericId = Number(data.id);

  return {
    ...data,
    id: Number.isFinite(numericId) ? numericId : Number(docSnapshot.id),
    stock: Number(data.stock ?? 0),
    baseStock: Number(data.baseStock ?? data.stock ?? 0),
    price: Number(data.price ?? 0),
    rating: Number(data.rating ?? 0),
  };
};

const normalizeUserProfile = (data = {}) => ({
  name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'guest',
  username: normalizeUsernameInput(data.username || data.email || data.name || 'guest'),
  email: normalizeEmail(data.email),
  wishlist: sanitizeWishlist(data.wishlist),
  cart: sanitizeCart(data.cart),
  selectedPaymentMethod:
    typeof data.selectedPaymentMethod === 'string' ? data.selectedPaymentMethod : '',
  spendingTotal: Number(data.spendingTotal ?? 0),
  purchaseHistory: Array.isArray(data.purchaseHistory) ? data.purchaseHistory : [],
});

const createProfilePayload = ({ name, username, email }) => ({
  name: typeof name === 'string' && name.trim() ? name.trim() : username,
  username: normalizeUsernameInput(username),
  email: normalizeEmail(email),
  wishlist: [],
  cart: [],
  selectedPaymentMethod: '',
  spendingTotal: 0,
  purchaseHistory: [],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

const getUserDocRef = (uid) => doc(db, USERS_COLLECTION, uid);
const getUsernameDocRef = (username) =>
  doc(db, USERNAMES_COLLECTION, normalizeUsernameInput(username));

const createUsernamePayload = ({ uid, username, email }) => ({
  uid,
  username: normalizeUsernameInput(username),
  email: normalizeEmail(email),
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

export const firebaseEnabled = isFirebaseConfigured;

export const subscribeToFirebaseAuth = (callback) => {
  if (!auth) {
    return () => {};
  }

  let unsubscribe = () => {};
  let isDisposed = false;

  ensureFirebaseAuthPersistence()
    .catch(() => {})
    .finally(() => {
      if (isDisposed) {
        return;
      }

      unsubscribe = onAuthStateChanged(auth, callback);
    });

  return () => {
    isDisposed = true;
    unsubscribe();
  };
};

export const ensureRemoteUserProfile = async (firebaseUser, overrides = {}) => {
  if (!db || !firebaseUser) {
    return null;
  }

  const userRef = getUserDocRef(firebaseUser.uid);
  const userSnapshot = await getDoc(userRef);

  if (userSnapshot.exists()) {
    const existingProfile = normalizeUserProfile(userSnapshot.data());

    if (
      existingProfile.email !== normalizeEmail(firebaseUser.email) ||
      (overrides.username &&
        existingProfile.username !== normalizeUsernameInput(overrides.username))
    ) {
      await updateDoc(userRef, {
        email: normalizeEmail(firebaseUser.email),
        username: normalizeUsernameInput(overrides.username || existingProfile.username),
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await setDoc(
        getUsernameDocRef(overrides.username || existingProfile.username),
        {
          uid: firebaseUser.uid,
          username: normalizeUsernameInput(overrides.username || existingProfile.username),
          email: normalizeEmail(firebaseUser.email || existingProfile.email),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      // Username lookup is a helper index for login-by-username. Avoid blocking session restore.
    }

    return existingProfile;
  }

  const profilePayload = createProfilePayload({
    name: overrides.name || firebaseUser.displayName || firebaseUser.email,
    username:
      overrides.username ||
      firebaseUser.email?.split('@')[0] ||
      firebaseUser.uid,
    email: firebaseUser.email || overrides.email || '',
  });

  await setDoc(userRef, profilePayload);
  return normalizeUserProfile(profilePayload);
};

export const subscribeToUserProfile = (uid, callback) => {
  if (!db || !uid) {
    return () => {};
  }

  return onSnapshot(getUserDocRef(uid), (snapshot) => {
    callback(snapshot.exists() ? normalizeUserProfile(snapshot.data()) : null);
  });
};

export const subscribeToInventory = (callback) => {
  if (!db) {
    return () => {};
  }

  const inventoryQuery = query(
    collection(db, PRODUCTS_COLLECTION),
    orderBy('id'),
  );

  return onSnapshot(inventoryQuery, (snapshot) => {
    callback(snapshot.docs.map(normalizeInventoryProduct));
  });
};

export const updateRemoteUserProfile = async (uid, payload) => {
  if (!db || !uid || !payload) {
    return;
  }

  await setDoc(
    getUserDocRef(uid),
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const registerWithFirebase = async ({ name, username, email, password }) => {
  if (!auth || !db) {
    throw new Error('Firebase is not configured yet.');
  }

  await ensureFirebaseAuthPersistence();

  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsernameInput(username);
  const usernameRef = getUsernameDocRef(normalizedUsername);
  const usernameSnapshot = await getDoc(usernameRef);

  if (usernameSnapshot.exists()) {
    throw new Error('Username is already in use. Please choose another one.');
  }

  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

  try {
    await runTransaction(db, async (transaction) => {
      const reservedUsernameSnapshot = await transaction.get(usernameRef);

      if (
        reservedUsernameSnapshot.exists() &&
        reservedUsernameSnapshot.data()?.uid !== credential.user.uid
      ) {
        throw new Error('Username is already in use. Please choose another one.');
      }

      transaction.set(
        usernameRef,
        createUsernamePayload({
          uid: credential.user.uid,
          username: normalizedUsername,
          email: normalizedEmail,
        }),
      );
      transaction.set(
        getUserDocRef(credential.user.uid),
        createProfilePayload({
          name,
          username: normalizedUsername,
          email: normalizedEmail,
        }),
      );
    });
  } catch (error) {
    await deleteUser(credential.user).catch(() => {});
    throw error;
  }

  return {
    firebaseUser: credential.user,
    profile: createSessionUser({
      name,
      username: normalizedUsername,
      email: normalizedEmail,
    }),
  };
};

export const loginWithFirebase = async ({ identifier, password }) => {
  if (!auth || !db) {
    throw new Error('Firebase is not configured yet.');
  }

  await ensureFirebaseAuthPersistence();

  const rawIdentifier = typeof identifier === 'string' ? identifier.trim() : '';
  let email = normalizeEmail(rawIdentifier);

  if (!rawIdentifier.includes('@')) {
    const usernameSnapshot = await getDoc(getUsernameDocRef(rawIdentifier));

    if (!usernameSnapshot.exists()) {
      throw new Error(
        'Account not found. Check your username or email, or create a new account.',
      );
    }

    email = normalizeEmail(usernameSnapshot.data().email);
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await ensureRemoteUserProfile(credential.user);

  return {
    firebaseUser: credential.user,
    profile: createSessionUser({
      name: profile?.name || email,
      username: profile?.username || rawIdentifier,
      email,
    }),
  };
};

export const sendFirebasePasswordReset = async (email) => {
  if (!auth) {
    throw new Error('Firebase is not configured yet.');
  }

  await ensureFirebaseAuthPersistence();
  await sendPasswordResetEmail(auth, normalizeEmail(email));
};

export const logoutFirebaseUser = async () => {
  if (!auth) {
    return;
  }

  await signOut(auth);
};

export const syncRemoteProfileToInventory = (profile, inventory) => ({
  cart: syncCartWithInventory(profile?.cart || [], inventory),
  wishlist: syncWishlistWithInventory(profile?.wishlist || [], inventory),
});

const buildOrderRecord = ({ cartItems, selectedPaymentMethod }) => ({
  id: `order-${Date.now()}`,
  createdAt: new Date().toISOString(),
  paymentMethod: selectedPaymentMethod,
  totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
  totalPrice: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
  items: cartItems.map((item) => ({
    productId: item.id,
    name: item.name,
    category: item.category,
    image: item.image,
    price: item.price,
    quantity: item.quantity,
    unit: item.unit,
  })),
});

export const checkoutWithFirebaseTransaction = async ({
  uid,
  cart,
  selectedPaymentMethod,
}) => {
  if (!db || !uid) {
    throw new Error('Firebase checkout is not available.');
  }

  const sanitizedCart = sanitizeCart(cart);

  if (sanitizedCart.length === 0) {
    throw new Error('Your cart is still empty.');
  }

  if (!selectedPaymentMethod) {
    throw new Error('Please choose a payment method first.');
  }

  return runTransaction(db, async (transaction) => {
    const userRef = getUserDocRef(uid);
    const productRefs = sanitizedCart.map((item) =>
      doc(db, PRODUCTS_COLLECTION, String(item.productId)),
    );
    const userSnapshotPromise = transaction.get(userRef);
    const productSnapshots = await Promise.all(
      productRefs.map((productRef) => transaction.get(productRef)),
    );
    const userSnapshot = await userSnapshotPromise;
    const productMap = new Map();

    productSnapshots.forEach((productSnapshot) => {
      if (productSnapshot.exists()) {
        productMap.set(Number(productSnapshot.id), normalizeInventoryProduct(productSnapshot));
      }
    });

    const cartItems = sanitizedCart.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error('One of the selected products is no longer available.');
      }

      if (product.stock < item.quantity) {
        throw new Error(`Stock for ${product.name} is no longer sufficient.`);
      }

      return {
        ...product,
        quantity: item.quantity,
      };
    });

    const userProfile = normalizeUserProfile(userSnapshot.exists() ? userSnapshot.data() : {});
    const orderRecord = buildOrderRecord({
      cartItems,
      selectedPaymentMethod,
    });

    cartItems.forEach((item) => {
      transaction.update(doc(db, PRODUCTS_COLLECTION, String(item.id)), {
        stock: item.stock - item.quantity,
      });
    });

    transaction.set(
      userRef,
      {
        spendingTotal: userProfile.spendingTotal + orderRecord.totalPrice,
        purchaseHistory: [orderRecord, ...userProfile.purchaseHistory].slice(0, 25),
        cart: [],
        selectedPaymentMethod: '',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return orderRecord;
  });
};

export const checkoutWithFirebaseApi = async ({
  firebaseUser,
  cart,
  selectedPaymentMethod,
}) => {
  if (!firebaseUser) {
    throw new Error('Please login first before placing an order.');
  }

  const endpoint = import.meta.env.VITE_CHECKOUT_API_URL || '/api/checkout';

  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost' &&
    window.location.port === '5173' &&
    endpoint === '/api/checkout'
  ) {
    throw new Error('Checkout API is not active in plain Vite dev mode.');
  }

  const idToken = await firebaseUser.getIdToken();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      cart,
      selectedPaymentMethod,
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Checkout request failed.');
  }

  return payload;
};

export const fetchAdminOrders = async (firebaseUser) => {
  if (!firebaseUser) {
    throw new Error('Please login first.');
  }

  const idToken = await firebaseUser.getIdToken();
  const response = await fetch('/api/orders', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load admin orders.');
  }

  return Array.isArray(payload.orders) ? payload.orders : [];
};

export const updateAdminOrderStatus = async ({
  firebaseUser,
  orderId,
  status,
}) => {
  if (!firebaseUser) {
    throw new Error('Please login first.');
  }

  const idToken = await firebaseUser.getIdToken();
  const response = await fetch('/api/orders', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      orderId,
      status,
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to update order status.');
  }

  return payload.order;
};

export const createAdminProduct = async ({ firebaseUser, product }) => {
  if (!firebaseUser) {
    throw new Error('Please login first.');
  }

  const idToken = await firebaseUser.getIdToken();
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ product }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to create product.');
  }

  return payload.product;
};

export const deleteAdminProduct = async ({ firebaseUser, productId }) => {
  if (!firebaseUser) {
    throw new Error('Please login first.');
  }

  const idToken = await firebaseUser.getIdToken();
  const response = await fetch('/api/products', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ productId }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to delete product.');
  }

  return payload.productId;
};

export const fetchPaymentMethods = async () => {
  const response = await fetch('/api/payment-methods', {
    method: 'GET',
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load payment methods.');
  }

  return Array.isArray(payload.groups) ? payload.groups : [];
};

export const createAdminPaymentMethod = async ({
  firebaseUser,
  group,
  label,
  note,
}) => {
  if (!firebaseUser) {
    throw new Error('Please login first.');
  }

  const idToken = await firebaseUser.getIdToken();
  const response = await fetch('/api/payment-methods', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ group, label, note }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to create payment method.');
  }

  return Array.isArray(payload.groups) ? payload.groups : [];
};

export const deleteAdminPaymentMethod = async ({ firebaseUser, methodId }) => {
  if (!firebaseUser) {
    throw new Error('Please login first.');
  }

  const idToken = await firebaseUser.getIdToken();
  const response = await fetch('/api/payment-methods', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ methodId }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to delete payment method.');
  }

  return Array.isArray(payload.groups) ? payload.groups : [];
};
