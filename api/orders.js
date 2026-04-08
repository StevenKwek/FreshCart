import { getFirebaseAdminAuth, getFirebaseAdminDb, isFirebaseAdminConfigured } from '../src/lib/firebaseAdmin.js';

const ALLOWED_ORDER_STATUSES = new Set([
  'pending',
  'accepted',
  'processing',
  'completed',
  'cancelled',
]);

const sortOrdersByCreatedAt = (orders) =>
  [...orders].sort((left, right) => {
    const leftValue = typeof left.createdAt === 'string' ? left.createdAt : '';
    const rightValue = typeof right.createdAt === 'string' ? right.createdAt : '';

    return rightValue.localeCompare(leftValue);
  });

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

const getAuthenticatedUser = async (request) => {
  const authorizationHeader = request.headers.authorization || '';
  const idToken = authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice(7)
    : '';

  if (!idToken) {
    throw new Error('Missing Firebase authentication token.');
  }

  const adminAuth = getFirebaseAdminAuth();
  return adminAuth.verifyIdToken(idToken);
};

const getUserProfileSnapshot = (decodedToken, adminDb) =>
  adminDb.collection('users').doc(decodedToken.uid).get();

const isAdminUser = async (decodedToken, adminDb) => {
  const userSnapshot = await getUserProfileSnapshot(decodedToken, adminDb);
  const username =
    typeof userSnapshot.data()?.username === 'string'
      ? userSnapshot.data().username
      : '';

  return username === 'admin';
};

const normalizeOrderStatus = (status) =>
  typeof status === 'string' && ALLOWED_ORDER_STATUSES.has(status)
    ? status
    : 'pending';

const canUserCancelStatus = (status) =>
  status === 'pending' || status === 'accepted';

const collectUserPurchaseOrders = async (adminDb) => {
  const usersSnapshot = await adminDb.collection('users').get();
  const orders = [];

  usersSnapshot.forEach((userSnapshot) => {
    const userData = userSnapshot.data() || {};
    const purchaseHistory = Array.isArray(userData.purchaseHistory)
      ? userData.purchaseHistory
      : [];

    purchaseHistory.forEach((order) => {
      if (!order || typeof order.id !== 'string' || !order.id.trim()) {
        return;
      }

      orders.push({
        ...order,
        id: order.id,
        userId: userSnapshot.id,
        userEmail:
          typeof order.userEmail === 'string' && order.userEmail
            ? order.userEmail
            : typeof userData.email === 'string'
              ? userData.email
              : '',
        status: normalizeOrderStatus(order.status),
      });
    });
  });

  return sortOrdersByCreatedAt(orders);
};

export default async function handler(request, response) {
  if (!isFirebaseAdminConfigured) {
    return sendJson(response, 500, {
      error: 'Firebase Admin SDK is not configured on the server.',
    });
  }

  if (!['GET', 'PATCH'].includes(request.method)) {
    response.setHeader('Allow', 'GET, PATCH');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  try {
    const adminDb = getFirebaseAdminDb();
    const decodedToken = await getAuthenticatedUser(request);
    const isAdmin = await isAdminUser(decodedToken, adminDb);

    if (request.method === 'GET') {
      if (!isAdmin) {
        return sendJson(response, 403, {
          error: 'Admin access is required for order management.',
        });
      }

      const ordersSnapshot = await adminDb
        .collection('orders')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      const ordersMap = new Map(
        ordersSnapshot.docs.map((orderSnapshot) => [
          orderSnapshot.id,
          {
            ...orderSnapshot.data(),
            id: orderSnapshot.id,
          },
        ]),
      );
      const purchaseOrders = await collectUserPurchaseOrders(adminDb);
      const missingOrders = purchaseOrders.filter((order) => !ordersMap.has(order.id));

      if (missingOrders.length > 0) {
        const batch = adminDb.batch();

        missingOrders.forEach((order) => {
          batch.set(adminDb.collection('orders').doc(order.id), order, { merge: true });
          ordersMap.set(order.id, order);
        });

        await batch.commit();
      }

      const orders = sortOrdersByCreatedAt([...ordersMap.values()]).slice(0, 50);

      return sendJson(response, 200, {
        ok: true,
        orders,
      });
    }

    const { orderId, status } = getRequestBody(request);

    if (!orderId || !ALLOWED_ORDER_STATUSES.has(status)) {
      return sendJson(response, 400, {
        error: 'A valid orderId and status are required.',
      });
    }

    const orderRef = adminDb.collection('orders').doc(String(orderId));
    const orderSnapshot = await orderRef.get();

    if (!orderSnapshot.exists) {
      return sendJson(response, 404, { error: 'Order not found.' });
    }

    const orderData = orderSnapshot.data();
    const orderOwnerId =
      typeof orderData.userId === 'string' && orderData.userId
        ? orderData.userId
        : '';

    if (!orderOwnerId) {
      return sendJson(response, 400, {
        error: 'Order owner is missing for this record.',
      });
    }
    const currentStatus = normalizeOrderStatus(orderData.status);

    if (!isAdmin) {
      if (orderOwnerId !== decodedToken.uid) {
        return sendJson(response, 403, {
          error: 'You can only manage your own orders.',
        });
      }

      if (status !== 'cancelled') {
        return sendJson(response, 403, {
          error: 'You are only allowed to cancel your order.',
        });
      }

      if (!canUserCancelStatus(currentStatus)) {
        return sendJson(response, 400, {
          error: 'This order can no longer be cancelled.',
        });
      }
    }

    const nextOrder = {
      ...orderData,
      status,
      updatedAt: new Date().toISOString(),
    };

    const userRef = adminDb.collection('users').doc(orderOwnerId);
    const userSnapshot = await userRef.get();
    const purchaseHistory = Array.isArray(userSnapshot.data()?.purchaseHistory)
      ? userSnapshot.data().purchaseHistory
      : [];
    const currentSpendingTotal = Number(userSnapshot.data()?.spendingTotal || 0);
    const orderTotal = Number(nextOrder.totalPrice || 0);
    const shouldRemoveOrder = currentStatus !== 'cancelled' && status === 'cancelled';
    const spendingDelta =
      shouldRemoveOrder
        ? -orderTotal
        : currentStatus === 'cancelled' && status !== 'cancelled'
          ? orderTotal
          : 0;
    const nextPurchaseHistory = shouldRemoveOrder
      ? purchaseHistory.filter((order) => order.id !== orderRef.id)
      : purchaseHistory.map((order) =>
          order.id === orderRef.id
            ? {
                ...order,
                status,
                updatedAt: nextOrder.updatedAt,
              }
            : order,
        );
    const shouldRestock = shouldRemoveOrder;

    await adminDb.runTransaction(async (transaction) => {
      const restockPlan = [];

      if (shouldRestock) {
        const items = Array.isArray(nextOrder.items) ? nextOrder.items : [];

        items.forEach((item) => {
          const productId = Number(item.productId);
          const quantity = Number(item.quantity);

          if (
            !Number.isFinite(productId) ||
            productId <= 0 ||
            !Number.isFinite(quantity) ||
            quantity <= 0
          ) {
            return;
          }

          restockPlan.push({
            productRef: adminDb.collection('products').doc(String(productId)),
            quantity,
          });
        });
      }

      // Firestore transactions require all reads to happen before any write.
      const productSnapshots = await Promise.all(
        restockPlan.map((entry) => transaction.get(entry.productRef)),
      );

      if (shouldRemoveOrder) {
        transaction.delete(orderRef);
      } else {
        transaction.set(orderRef, nextOrder, { merge: true });
      }

      productSnapshots.forEach((productSnapshot, index) => {
        if (!productSnapshot.exists) {
          return;
        }

        const { productRef, quantity } = restockPlan[index];
        const currentStock = Number(productSnapshot.data()?.stock || 0);

        transaction.update(productRef, {
          stock: currentStock + quantity,
        });
      });

      transaction.set(
        userRef,
        {
          purchaseHistory: nextPurchaseHistory,
          spendingTotal: Math.max(currentSpendingTotal + spendingDelta, 0),
          updatedAt: nextOrder.updatedAt,
        },
        { merge: true },
      );
    });

    return sendJson(response, 200, {
      ok: true,
      order: shouldRemoveOrder
        ? {
            id: orderRef.id,
            status: 'cancelled',
            removed: true,
            updatedAt: nextOrder.updatedAt,
          }
        : nextOrder,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to process order request.';
    const statusCode =
      message.includes('Admin access') ||
      message.includes('Missing Firebase') ||
      message.includes('only manage your own') ||
      message.includes('only allowed to cancel')
      ? 403
      : 500;

    return sendJson(response, statusCode, {
      error: message,
    });
  }
}
