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

const assertAdminUser = async (decodedToken, adminDb) => {
  const userSnapshot = await adminDb.collection('users').doc(decodedToken.uid).get();
  const username =
    typeof userSnapshot.data()?.username === 'string'
      ? userSnapshot.data().username
      : '';

  if (username !== 'admin') {
    throw new Error('Admin access is required for order management.');
  }
};

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
        status:
          typeof order.status === 'string' && ALLOWED_ORDER_STATUSES.has(order.status)
            ? order.status
            : 'pending',
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

    await assertAdminUser(decodedToken, adminDb);

    if (request.method === 'GET') {
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
    const nextOrder = {
      ...orderData,
      status,
      updatedAt: new Date().toISOString(),
    };

    const userRef = adminDb.collection('users').doc(orderData.userId);
    const userSnapshot = await userRef.get();
    const purchaseHistory = Array.isArray(userSnapshot.data()?.purchaseHistory)
      ? userSnapshot.data().purchaseHistory
      : [];
    const nextPurchaseHistory = purchaseHistory.map((order) =>
      order.id === orderRef.id
        ? {
            ...order,
            status,
            updatedAt: nextOrder.updatedAt,
          }
        : order,
    );

    await adminDb.runTransaction(async (transaction) => {
      transaction.set(orderRef, nextOrder, { merge: true });
      transaction.set(
        userRef,
        {
          purchaseHistory: nextPurchaseHistory,
          updatedAt: nextOrder.updatedAt,
        },
        { merge: true },
      );
    });

    return sendJson(response, 200, {
      ok: true,
      order: nextOrder,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to process order request.';
    const statusCode = message.includes('Admin access') || message.includes('Missing Firebase')
      ? 403
      : 500;

    return sendJson(response, statusCode, {
      error: message,
    });
  }
}
