// ============================================================
// Firebase Auth helpers
// ============================================================

import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type ConfirmationResult,
} from 'firebase/auth';
import { getFirebaseAuth } from './config';

// ------ Phone Auth ------

let recaptchaVerifier: RecaptchaVerifier | null = null;

export function setupRecaptcha(containerId: string): RecaptchaVerifier | null {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
  });

  return recaptchaVerifier;
}

export async function sendOTP(
  phoneNumber: string
): Promise<ConfirmationResult | null> {
  const auth = getFirebaseAuth();
  if (!auth || !recaptchaVerifier) return null;

  const fullNumber = `+91${phoneNumber.replace(/\D/g, '')}`;
  return signInWithPhoneNumber(auth, fullNumber, recaptchaVerifier);
}

export async function verifyOTP(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<User> {
  const result = await confirmationResult.confirm(code);
  return result.user;
}

// ------ Email Auth ------

export async function signInEmail(
  email: string,
  password: string
): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Auth not initialized');
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function createAccountEmail(
  email: string,
  password: string
): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Auth not initialized');
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function resetPassword(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Auth not initialized');
  await sendPasswordResetEmail(auth, email);
}

// ------ Google Auth ------

export async function signInGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Auth not initialized');
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

// ------ Sign Out ------

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}

// ------ Auth State ------

export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth?.currentUser ?? null;
}
