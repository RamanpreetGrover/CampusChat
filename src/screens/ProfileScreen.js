// src/screens/ProfileScreen.js
// Profile screen: shows basic account info, theme toggle, and a safe logout flow.
// On logout I also update my presence in Firestore to "offline".

import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Avatar, Text, List, Switch, Button, Divider } from 'react-native-paper';
import { useTheme } from '../theme/ThemeContext';

import { auth, db } from '../services/firebase';
import { logout } from '../services/auth';
import { doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';

export default function ProfileScreen({ navigation }) {
  const { theme, toggleTheme } = useTheme();

  // pull minimal identity to show on the page
  const user = auth.currentUser;
  const email = user?.email ?? 'Unknown';
  const uid = user?.uid ?? '';

  const isDark = theme.mode === 'dark';

  // When logging out, I first mark the user offline in Firestore
  // so presence shows correctly in channels, then sign out and reset nav.
  const handleLogout = async () => {
    try {
      if (uid) {
        await setDoc(
          doc(db, 'users', uid),
          { status: 'offline', lastSeen: serverTimestamp() },
          { merge: true }
        );
      }
      await logout();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e) {
      Alert.alert('Logout failed', e.message || 'Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* simple header with an avatar initial and account details */}
      <View style={styles.header}>
        <Avatar.Text size={56} label={(email[0] || 'U').toUpperCase()} />
        <View style={{ marginLeft: 12 }}>
          <Text variant="titleMedium" style={{ color: theme.text }}>{email}</Text>
          {uid ? <Text variant="bodySmall" style={{ color: theme.subText }}>UID: {uid}</Text> : null}
        </View>
      </View>

      <Divider style={{ marginVertical: 16 }} />

      {/* theme toggle uses my context; quick flip between light/dark */}
      <List.Item
        title="Dark Mode"
        description={isDark ? 'On' : 'Off'}
        titleStyle={{ color: theme.text }}
        descriptionStyle={{ color: theme.subText }}
        left={() => <List.Icon icon="theme-light-dark" color={theme.text} />}
        right={() => <Switch value={isDark} onValueChange={toggleTheme} />}
        style={{ backgroundColor: theme.card, borderRadius: 12 }}
      />

      <Button mode="contained" style={{ marginTop: 24, borderRadius: 24 }} onPress={handleLogout}>
        Log Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center' },
});
