const SNAP_SANDBOX_URL = 'https://app.sandbox.midtrans.com/snap/snap.js';
const CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || '';

let snapLoadPromise = null;

/**
 * Dynamically load the Midtrans Snap.js script.
 * Returns a promise that resolves once window.snap is ready.
 */
export const loadMidtransSnap = () => {
  if (snapLoadPromise) return snapLoadPromise;

  snapLoadPromise = new Promise((resolve, reject) => {
    if (window.snap) {
      resolve(window.snap);
      return;
    }

    const script = document.createElement('script');
    script.src = SNAP_SANDBOX_URL;
    script.setAttribute('data-client-key', CLIENT_KEY);
    script.onload = () => resolve(window.snap);
    script.onerror = () => {
      snapLoadPromise = null;
      reject(new Error('Gagal memuat Midtrans Snap. Periksa koneksi internet Anda.'));
    };
    document.head.appendChild(script);
  });

  return snapLoadPromise;
};

/**
 * Request a Snap transaction token from the backend.
 */
export const createMidtransToken = async ({
  firebaseUser,
  orderId,
  grossAmount,
  customerDetails,
  itemDetails,
}) => {
  const idToken = await firebaseUser.getIdToken();

  const response = await fetch('/api/midtrans', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      orderId,
      grossAmount,
      customerDetails,
      itemDetails,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Gagal membuat transaksi Midtrans.');
  }

  return payload.token;
};

/**
 * Open the Midtrans Snap popup with a given token.
 * Returns a promise resolving to { status: 'success' | 'pending' | 'closed', result? }.
 * Rejects on payment error.
 */
export const openMidtransSnap = async (token) => {
  await loadMidtransSnap();

  return new Promise((resolve, reject) => {
    window.snap.pay(token, {
      onSuccess(result) {
        resolve({ status: 'success', result });
      },
      onPending(result) {
        resolve({ status: 'pending', result });
      },
      onError(result) {
        reject(new Error(result?.status_message || 'Pembayaran gagal.'));
      },
      onClose() {
        resolve({ status: 'closed' });
      },
    });
  });
};

/**
 * Full Midtrans checkout flow:
 * 1. Get Snap token from backend
 * 2. Open Snap popup
 * Returns { status, result }
 */
export const checkoutWithMidtrans = async ({
  firebaseUser,
  orderId,
  grossAmount,
  customerDetails,
  itemDetails,
}) => {
  const token = await createMidtransToken({
    firebaseUser,
    orderId,
    grossAmount,
    customerDetails,
    itemDetails,
  });

  return openMidtransSnap(token);
};
