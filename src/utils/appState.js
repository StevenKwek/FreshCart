export const getStoredValue = (key, fallback) => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
};

export const getInitialTheme = () => {
  const storedTheme = getStoredValue('freshcart-theme', null);
  return storedTheme === 'dark' ? 'dark' : 'light';
};

export const normalizeEmail = (value) =>
  (typeof value === 'string' ? value.trim().toLowerCase() : '');

export const normalizeUser = (storedUser) => {
  if (!storedUser) {
    return null;
  }

  const rawUsernameValue =
    storedUser.username ||
    (typeof storedUser.email === 'string' ? storedUser.email.split('@')[0] : '') ||
    storedUser.name ||
    'guest';

  const rawUsername =
    typeof rawUsernameValue === 'string'
      ? rawUsernameValue.split('@')[0]
      : 'guest';

  const username = rawUsername.toLowerCase().replace(/\s+/g, '');

  return {
    ...storedUser,
    username,
    name:
      storedUser.name && !storedUser.name.includes('@')
        ? storedUser.name
        : username,
  };
};

export const normalizeUsernameInput = (value) =>
  normalizeUser({ username: value })?.username || '';

export const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

export const hashLocalPassword = (value) => {
  const input = typeof value === 'string' ? value : '';
  let hash = 5381;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }

  return `fc_${(hash >>> 0).toString(36)}`;
};

export const normalizeAccount = (storedAccount) => {
  if (!storedAccount || typeof storedAccount !== 'object') {
    return null;
  }

  const username = normalizeUsernameInput(storedAccount.username);
  const email = normalizeEmail(storedAccount.email);
  const name =
    typeof storedAccount.name === 'string' && storedAccount.name.trim()
      ? storedAccount.name.trim()
      : username;
  const passwordHash =
    typeof storedAccount.passwordHash === 'string' && storedAccount.passwordHash.trim()
      ? storedAccount.passwordHash
      : null;

  if (!username || !email || !passwordHash) {
    return null;
  }

  return {
    id: storedAccount.id || `account-${username}`,
    name,
    username,
    email,
    passwordHash,
    createdAt: storedAccount.createdAt || new Date().toISOString(),
  };
};

export const getStoredAccounts = () => {
  const storedAccounts = getStoredValue('freshcart-auth-accounts', []);

  if (!Array.isArray(storedAccounts)) {
    return [];
  }

  return storedAccounts.map(normalizeAccount).filter(Boolean);
};

export const createLocalAccount = ({ name, username, email, password }) => {
  const normalizedUsername = normalizeUsernameInput(username);
  const normalizedEmail = normalizeEmail(email);

  return {
    id: `account-${normalizedUsername}`,
    name: typeof name === 'string' ? name.trim() : normalizedUsername,
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash: hashLocalPassword(password),
    createdAt: new Date().toISOString(),
  };
};

export const findAccountByIdentifier = (accounts, identifier) => {
  if (!Array.isArray(accounts)) {
    return null;
  }

  const normalizedIdentifier = normalizeEmail(identifier);
  const normalizedUsername = normalizeUsernameInput(identifier);

  return (
    accounts.find(
      (account) =>
        account.email === normalizedIdentifier || account.username === normalizedUsername,
    ) || null
  );
};

export const verifyLocalPassword = (account, password) =>
  Boolean(account && account.passwordHash === hashLocalPassword(password));

export const createSessionUser = (account) =>
  normalizeUser({
    name: account.name,
    username: account.username,
    email: account.email,
  });

export const getUserStorageKey = (userValue) => {
  if (!userValue) {
    return '';
  }

  if (typeof userValue === 'string') {
    return normalizeUser({ username: userValue })?.username || '';
  }

  return normalizeUser(userValue)?.username || '';
};

export const getScopedStoredValue = (storedMap, userValue, fallback) => {
  const userKey = getUserStorageKey(userValue);

  if (!userKey) {
    return fallback;
  }

  return storedMap[userKey] ?? fallback;
};

export const mergeLegacyScopedValue = (storedMap, userValue, legacyValue) => {
  const userKey = getUserStorageKey(userValue);

  if (!userKey || storedMap[userKey] !== undefined) {
    return storedMap;
  }

  if (Array.isArray(legacyValue) && legacyValue.length === 0) {
    return storedMap;
  }

  if (!Array.isArray(legacyValue) && !legacyValue) {
    return storedMap;
  }

  return {
    ...storedMap,
    [userKey]: legacyValue,
  };
};

export const createInventorySeedVersion = (products) =>
  products
    .map(
      (product) =>
        `${product.id}-${product.name}-${product.category}-${product.price}-${product.stock}`,
    )
    .join('|');

export const syncInventoryWithSeed = (storedInventory, seedProducts) => {
  if (!Array.isArray(storedInventory) || storedInventory.length === 0) {
    return seedProducts.map((product) => ({
      ...product,
      baseStock: product.stock,
    }));
  }

  const storedMap = new Map(storedInventory.map((product) => [product.id, product]));

  return seedProducts.map((product) => {
    const savedProduct = storedMap.get(product.id);

    if (!savedProduct) {
      return product;
    }

    const canReuseSavedStock =
      typeof savedProduct.stock === 'number' && savedProduct.baseStock === product.stock;

    return {
      ...product,
      stock: canReuseSavedStock ? savedProduct.stock : product.stock,
      baseStock: product.stock,
    };
  });
};

export const syncCartWithInventory = (storedCart, nextInventory) => {
  if (!Array.isArray(storedCart) || storedCart.length === 0) {
    return [];
  }

  return storedCart
    .map((item) => {
      const product = nextInventory.find((entry) => entry.id === item.productId);

      if (!product) {
        return null;
      }

      const nextQuantity = Math.min(item.quantity, product.stock);

      if (nextQuantity <= 0) {
        return null;
      }

      return {
        ...item,
        quantity: nextQuantity,
      };
    })
    .filter(Boolean);
};

export const syncWishlistWithInventory = (storedWishlist, nextInventory) => {
  if (!Array.isArray(storedWishlist) || storedWishlist.length === 0) {
    return [];
  }

  const validProductIds = new Set(nextInventory.map((product) => product.id));
  return storedWishlist.filter((productId) => validProductIds.has(productId));
};
