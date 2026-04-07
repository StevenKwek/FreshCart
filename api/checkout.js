import { getFirebaseAdminAuth, getFirebaseAdminDb, isFirebaseAdminConfigured } from '../src/lib/firebaseAdmin.js';

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

const sendJson = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
};

const getRequestBody = (request) => {
  if (request.body && typeof request.body === 'object') {
    return request.body;
  }

  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body);
    } catch (error) {
      return {};
    }
  }

  return {};
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  if (!isFirebaseAdminConfigured) {
    return sendJson(response, 500, {
      error: 'Firebase Admin SDK is not configured on the server.',
    });
  }

  const authorizationHeader = request.headers.authorization || '';
  const idToken = authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice(7)
    : '';

  if (!idToken) {
    return sendJson(response, 401, { error: 'Missing Firebase authentication token.' });
  }

  try {
    const adminAuth = getFirebaseAdminAuth();
    const adminDb = getFirebaseAdminDb();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const { cart, selectedPaymentMethod } = getRequestBody(request);
    const sanitizedCart = sanitizeCart(cart);

    if (sanitizedCart.length === 0) {
      return sendJson(response, 400, { error: 'Your cart is still empty.' });
    }

    if (!selectedPaymentMethod) {
      return sendJson(response, 400, { error: 'Please choose a payment method first.' });
    }

    const checkoutResult = await adminDb.runTransaction(async (transaction) => {
      const userRef = adminDb.collection('users').doc(uid);
      const userSnapshot = await transaction.get(userRef);
      const userData = userSnapshot.exists ? userSnapshot.data() : {};
      const purchaseHistory = Array.isArray(userData.purchaseHistory)
        ? userData.purchaseHistory
        : [];
      const currentSpending = Number(userData.spendingTotal ?? 0);
      const productRefs = sanitizedCart.map((item) =>
        adminDb.collection('products').doc(String(item.productId)),
      );
      const productSnapshots = await Promise.all(
        productRefs.map((productRef) => transaction.get(productRef)),
      );
      const productMap = new Map();

      productSnapshots.forEach((productSnapshot) => {
        if (productSnapshot.exists) {
          const data = productSnapshot.data();

          productMap.set(Number(productSnapshot.id), {
            ...data,
            id: Number(data.id ?? productSnapshot.id),
            stock: Number(data.stock ?? 0),
            price: Number(data.price ?? 0),
          });
        }
      });

      const orderItems = sanitizedCart.map((item) => {
        const product = productMap.get(item.productId);

        if (!product) {
          throw new Error('One of the selected products is no longer available.');
        }

        if (product.stock < item.quantity) {
          throw new Error(`Stock for ${product.name} is no longer sufficient.`);
        }

        return {
          productId: item.productId,
          name: product.name,
          category: product.category,
          image: product.image,
          price: product.price,
          quantity: item.quantity,
          unit: product.unit,
        };
      });

      const orderRecord = {
        id: `order-${Date.now()}`,
        createdAt: new Date().toISOString(),
        paymentMethod: selectedPaymentMethod,
        status: 'pending',
        userId: uid,
        userEmail: decodedToken.email || '',
        totalItems: orderItems.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        items: orderItems,
      };
      const orderRef = adminDb.collection('orders').doc(orderRecord.id);

      orderItems.forEach((item) => {
        const productRef = adminDb.collection('products').doc(String(item.productId));
        const product = productMap.get(item.productId);

        transaction.update(productRef, {
          stock: product.stock - item.quantity,
        });
      });

      transaction.set(orderRef, orderRecord);

      transaction.set(
        userRef,
        {
          cart: [],
          selectedPaymentMethod: '',
          spendingTotal: currentSpending + orderRecord.totalPrice,
          purchaseHistory: [orderRecord, ...purchaseHistory].slice(0, 25),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      return orderRecord;
    });

    return sendJson(response, 200, {
      ok: true,
      order: checkoutResult,
    });
  } catch (error) {
    return sendJson(response, 500, {
      error:
        error instanceof Error
          ? error.message
          : 'Checkout failed. Please try again.',
    });
  }
}
