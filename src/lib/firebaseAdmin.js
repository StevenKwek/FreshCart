import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');

  fileContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();

    if (!key || process.env[key]) {
      return;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  });
};

parseEnvFile(path.join(projectRoot, '.env.local'));
parseEnvFile(path.join(projectRoot, '.env'));

const normalizePrivateKey = (value) =>
  typeof value === 'string' ? value.replace(/\\n/g, '\n') : '';

const getServiceAccount = () => {
  if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
  }

  if (
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
    };
  }

  return null;
};

export const isFirebaseAdminConfigured = Boolean(getServiceAccount());

export const getFirebaseAdminApp = () => {
  if (!isFirebaseAdminConfigured) {
    throw new Error('Firebase Admin SDK is not configured.');
  }

  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert(getServiceAccount()),
  });
};

export const getFirebaseAdminAuth = () => getAuth(getFirebaseAdminApp());
export const getFirebaseAdminDb = () => getFirestore(getFirebaseAdminApp());
