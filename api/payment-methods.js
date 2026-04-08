import {
  defaultPaymentMethods,
  normalizePaymentMethodsData,
} from '../src/constants/paymentMethods.js';
import {
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
  isFirebaseAdminConfigured,
} from '../src/lib/firebaseAdmin.js';

const SETTINGS_COLLECTION = 'appSettings';
const PAYMENT_METHODS_DOC = 'paymentMethods';

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
    throw new Error('Admin access is required for payment management.');
  }
};

const normalizeKey = (value) =>
  typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : '';

const getPaymentMethodsRef = (adminDb) =>
  adminDb.collection(SETTINGS_COLLECTION).doc(PAYMENT_METHODS_DOC);

const loadPaymentMethods = async (adminDb) => {
  const snapshot = await getPaymentMethodsRef(adminDb).get();

  if (!snapshot.exists) {
    const seeded = normalizePaymentMethodsData(defaultPaymentMethods);
    await getPaymentMethodsRef(adminDb).set({
      groups: seeded,
      updatedAt: new Date().toISOString(),
    });
    return seeded;
  }

  return normalizePaymentMethodsData(snapshot.data()?.groups);
};

export default async function handler(request, response) {
  if (!isFirebaseAdminConfigured) {
    return sendJson(response, 500, {
      error: 'Firebase Admin SDK is not configured on the server.',
    });
  }

  if (!['GET', 'POST', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST, DELETE');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  try {
    const adminDb = getFirebaseAdminDb();

    if (request.method === 'GET') {
      const groups = await loadPaymentMethods(adminDb);
      return sendJson(response, 200, {
        ok: true,
        groups,
      });
    }

    const decodedToken = await getAuthenticatedUser(request);
    await assertAdminUser(decodedToken, adminDb);

    if (request.method === 'POST') {
      const { group, label, note } = getRequestBody(request);
      const nextGroup = typeof group === 'string' ? group.trim() : '';
      const nextLabel = typeof label === 'string' ? label.trim() : '';
      const nextNote = typeof note === 'string' ? note.trim() : '';

      if (!nextGroup || !nextLabel || !nextNote) {
        return sendJson(response, 400, {
          error: 'Group, label, and note are required.',
        });
      }

      const groups = await loadPaymentMethods(adminDb);
      const nextId = normalizeKey(nextLabel);

      if (!nextId) {
        return sendJson(response, 400, {
          error: 'Payment method label is invalid.',
        });
      }

      const alreadyExists = groups.some((entry) =>
        entry.options.some((option) => option.id === nextId),
      );

      if (alreadyExists) {
        return sendJson(response, 400, {
          error: 'Payment method already exists.',
        });
      }

      const nextGroups = [...groups];
      const existingGroup = nextGroups.find((entry) => entry.group === nextGroup);
      const nextOption = {
        id: nextId,
        label: nextLabel,
        note: nextNote,
      };

      if (existingGroup) {
        existingGroup.options = [...existingGroup.options, nextOption];
      } else {
        nextGroups.push({
          group: nextGroup,
          options: [nextOption],
        });
      }

      await getPaymentMethodsRef(adminDb).set(
        {
          groups: nextGroups,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      return sendJson(response, 200, {
        ok: true,
        groups: nextGroups,
      });
    }

    const { methodId } = getRequestBody(request);
    const targetMethodId = typeof methodId === 'string' ? methodId.trim() : '';

    if (!targetMethodId) {
      return sendJson(response, 400, {
        error: 'A valid methodId is required.',
      });
    }

    const groups = await loadPaymentMethods(adminDb);
    const nextGroups = groups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => option.id !== targetMethodId),
      }))
      .filter((group) => group.options.length > 0);

    if (nextGroups.length === groups.length) {
      return sendJson(response, 404, {
        error: 'Payment method not found.',
      });
    }

    await getPaymentMethodsRef(adminDb).set(
      {
        groups: nextGroups,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return sendJson(response, 200, {
      ok: true,
      groups: nextGroups,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to process payment methods.';
    const statusCode = message.includes('Missing Firebase authentication token')
      ? 401
      : message.includes('Admin access') || message.includes('Firebase Admin SDK')
        ? 403
        : message.includes('required') || message.includes('exists') || message.includes('invalid')
          ? 400
          : message.includes('not found')
            ? 404
            : 500;

    return sendJson(response, statusCode, {
      error: message,
    });
  }
}
