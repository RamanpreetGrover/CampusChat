// App.tsx
// Root with Theme + Navigation. Also updates my presence ("online"/"offline")
// based on app foreground/background using the modular Firestore API.

import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/theme/ThemeContext';

import { auth, db } from './src/services/firebase';
import { watchAuth } from './src/services/auth';

import {
  doc,
  setDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';

export default function App() {
  // I track current app state so I can detect transitions (active <-> background)
  const appState = useRef(AppState.currentState);
  // cache the uid I care about for presence updates
  const uidRef = useRef<string | null>(auth.currentUser?.uid ?? null);

  // helper to update my presence; I merge so I don't overwrite other fields
  const setPresence = async (status: 'online' | 'offline') => {
    const uid = uidRef.current;
    if (!uid) return; // not logged in yet
    await setDoc(
      doc(db, 'users', uid),
      { status, lastSeen: serverTimestamp() },
      { merge: true }
    );
  };

  useEffect(() => {
    // 1) Track auth changes so uidRef stays correct even if login happens after app start
    const unwatch = watchAuth((user) => {
      uidRef.current = user ? user.uid : null;
      // when user logs in while app is active, mark them online right away
      if (user && appState.current === 'active') {
        setPresence('online');
      }
    });

    // 2) React to app foreground/background transitions
    const handleAppStateChange = async (next: AppStateStatus) => {
      const prev = appState.current;

      // going to background/inactive → mark offline
      if (prev.match(/active/) && next.match(/inactive|background/)) {
        await setPresence('offline');
      }
      // coming to foreground → mark online
      if (prev.match(/inactive|background/) && next === 'active') {
        await setPresence('online');
      }

      appState.current = next;
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    // 3) On first mount, if signed in and app is active, mark online
    if (uidRef.current && appState.current === 'active') {
      setPresence('online');
    }

    return () => {
      // best effort: mark offline on unmount (e.g., app quit)
      setPresence('offline');
      sub.remove();
      unwatch();
    };
  }, []);

  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
