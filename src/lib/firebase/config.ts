// ============================================================
// Firebase configuration + demo mode detection
// ============================================================

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  type Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Demo mode: activated when Firebase config keys are missing.
 * In demo mode, data is stored in localStorage, not Firestore.
 */
export const IS_DEMO_MODE =
  !firebaseConfig.apiKey ||
  !firebaseConfig.projectId ||
  firebaseConfig.apiKey === 'YOUR_API_KEY';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function initFirebase() {
  if (IS_DEMO_MODE) {
    console.warn('[Hisab] Running in Demo mode — data not saved to cloud');
    return;
  }

  if (typeof window === 'undefined') return;

  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });

  // Emulator connections (dev only)
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://localhost:9099', {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, 'localhost', 8080);
  }
}

// Initialize on module load (client-side only)
if (typeof window !== 'undefined') {
  initFirebase();
}

export function getFirebaseAuth(): Auth | null {
  return auth;
}

export function getFirebaseDb(): Firestore | null {
  return db;
}

export function getFirebaseApp(): FirebaseApp | null {
  return app;
}
