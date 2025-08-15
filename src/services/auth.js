// src/services/auth.js
// Auth helpers (React Native Firebase – modular)

import { auth } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as rnfbSignOut,
  onAuthStateChanged,
  updateProfile,
} from '@react-native-firebase/auth';

/**
 * Listen for login/logout changes.
 * Returns an unsubscribe function.
 */
export const watchAuth = (handler) => onAuthStateChanged(auth, handler);

/**
 * Sign up a new user.
 * Also sets the displayName so we can show a username in chat.
 */
export const register = async (email, password, username) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // set displayName on the auth profile
  if (username) {
    await updateProfile(cred.user, { displayName: username });
  }
  return cred.user;
};

/**
 * Email/password login.
 */
export const login = (email, password) =>
  signInWithEmailAndPassword(auth, email, password).then((cred) => cred.user);

/**
 * Log out.
 */
export const logout = () => rnfbSignOut(auth);

/**
 * Quick getter so screens don’t poke internals.
 */
export const currentUser = () => auth.currentUser;
