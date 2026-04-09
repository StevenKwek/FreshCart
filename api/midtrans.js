import midtransClient from 'midtrans-client';
import { getFirebaseAdminAuth, isFirebaseAdminConfigured } from '../src/lib/firebaseAdmin.js';

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
    } catch {
      return {};
    }
  }

  return {};
};

const getSnapClient = () => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY is not configured.');
  }

  return new midtransClient.Snap({
    isProduction: false,
    serverKey,
  });
};

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    return sendJson(response, 200, {});
  }

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
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const { orderId, grossAmount, customerDetails, itemDetails } = getRequestBody(request);

    if (!orderId || !grossAmount) {
      return sendJson(response, 400, { error: 'orderId and grossAmount are required.' });
    }

    const snap = getSnapClient();

    const parameter = {
      transaction_details: {
        order_id: String(orderId),
        gross_amount: Number(grossAmount),
      },
      customer_details: {
        first_name: customerDetails?.first_name || decodedToken.name || 'Customer',
        email: customerDetails?.email || decodedToken.email || '',
        phone: customerDetails?.phone || '',
      },
      item_details: Array.isArray(itemDetails) ? itemDetails : [],
    };

    const transaction = await snap.createTransaction(parameter);

    return sendJson(response, 200, {
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    });
  } catch (error) {
    return sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Failed to create Midtrans transaction.',
    });
  }
}
