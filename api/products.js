import { getFirebaseAdminAuth, getFirebaseAdminDb, isFirebaseAdminConfigured } from '../src/lib/firebaseAdmin.js';

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

const normalizeText = (value, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const normalizeNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
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
    throw new Error('Admin access is required for product management.');
  }
};

export default async function handler(request, response) {
  if (!isFirebaseAdminConfigured) {
    return sendJson(response, 500, {
      error: 'Firebase Admin SDK is not configured on the server.',
    });
  }

  if (!['POST', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'POST, DELETE');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  try {
    const adminDb = getFirebaseAdminDb();
    const decodedToken = await getAuthenticatedUser(request);

    await assertAdminUser(decodedToken, adminDb);

    if (request.method === 'POST') {
      const { product } = getRequestBody(request);

      if (!product || typeof product !== 'object') {
        return sendJson(response, 400, { error: 'Product data is required.' });
      }

      const name = normalizeText(product.name);
      const category = normalizeText(product.category);
      const unit = normalizeText(product.unit);
      const description = normalizeText(product.description);
      const image = normalizeText(product.image);
      const price = normalizeNumber(product.price);
      const stock = normalizeNumber(product.stock);
      const rating = normalizeNumber(product.rating, 4.5);

      if (!name || !category || !unit || !description || !image) {
        return sendJson(response, 400, {
          error: 'Please complete name, category, unit, image, and description.',
        });
      }

      if (price <= 0 || stock < 0) {
        return sendJson(response, 400, {
          error: 'Price must be greater than zero and stock cannot be negative.',
        });
      }

      const latestProductSnapshot = await adminDb
        .collection('products')
        .orderBy('id', 'desc')
        .limit(1)
        .get();

      const latestId = latestProductSnapshot.empty
        ? 0
        : Number(latestProductSnapshot.docs[0].data().id ?? latestProductSnapshot.docs[0].id);
      const nextId = latestId + 1;
      const nextProduct = {
        id: nextId,
        name,
        category,
        price,
        stock,
        baseStock: stock,
        unit,
        rating,
        description,
        image,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await adminDb.collection('products').doc(String(nextId)).set(nextProduct);

      return sendJson(response, 200, {
        ok: true,
        product: nextProduct,
      });
    }

    const { productId } = getRequestBody(request);
    const normalizedProductId = Number(productId);

    if (!Number.isFinite(normalizedProductId)) {
      return sendJson(response, 400, { error: 'A valid productId is required.' });
    }

    await adminDb.collection('products').doc(String(normalizedProductId)).delete();

    return sendJson(response, 200, {
      ok: true,
      productId: normalizedProductId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to process product request.';
    const statusCode = message.includes('Missing Firebase authentication token')
      ? 401
      : message.includes('Admin access') || message.includes('Firebase Admin SDK')
        ? 403
        : message.includes('required') ||
            message.includes('Price must') ||
            message.includes('valid productId')
          ? 400
          : 500;

    return sendJson(response, statusCode, {
      error: message,
    });
  }
}
