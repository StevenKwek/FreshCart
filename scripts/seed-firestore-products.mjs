import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '../src/lib/firebaseAdmin.js';
import { products } from '../src/data/products.js';

if (!isFirebaseAdminConfigured) {
  console.error(
    'Firebase Admin SDK is not configured. Set FIREBASE_ADMIN_* env vars first.',
  );
  process.exit(1);
}

const adminDb = getFirebaseAdminDb();

const run = async () => {
  const batch = adminDb.batch();

  products.forEach((product) => {
    const productRef = adminDb.collection('products').doc(String(product.id));

    batch.set(
      productRef,
      {
        ...product,
        baseStock: product.stock,
      },
      { merge: true },
    );
  });

  await batch.commit();
  console.log(`Seeded ${products.length} products to Firestore.`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
