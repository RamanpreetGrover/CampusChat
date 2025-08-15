// src/screens/LoginScreen.js
// Login screen: email/password sign-in + a small presence update on success.
// Uses our auth helper (services/auth.js) and Firestore to mark the user online.

import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useTheme } from '../theme/ThemeContext';

import { login } from '../services/auth'; // wraps RNFirebase sign-in
import { db } from '../services/firebase';
import { doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();

  // form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // prevents double taps + shows spinner on the button
  const [loading, setLoading] = useState(false);

  // basic front-end validation so we don't hit Firebase with empty fields
  const valid = email.trim().length > 0 && password.length >= 6;

  const handleLogin = async () => {
    if (!valid) {
      Alert.alert('Missing/Invalid', 'Enter a valid email and 6+ char password.');
      return;
    }

    try {
      setLoading(true);

      // sign in using our helper; it returns the user object
      const user = await login(email.trim(), password);

      // on successful login, bump a simple presence field
      await setDoc(
        doc(db, 'users', user.uid),
        {
          email: user.email,
          status: 'online',
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );

      // go to channel list (replace so back button doesn’t return to login)
      navigation.replace('Channels');
    } catch (error) {
      // map common auth error codes to friendly messages
      let message = 'Something went wrong. Please try again.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      else if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email format.';
      else if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Try again later.';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text variant="headlineLarge" style={[styles.title, { color: theme.text }]}>
        CampusChat
      </Text>

      {/* Email field: disable auto-caps and corrections so the address isn’t mangled */}
      <TextInput
        label="Email"
        mode="outlined"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="username"
        style={styles.input}
      />

      {/* Password field: hide characters and submit on enter */}
      <TextInput
        label="Password"
        mode="outlined"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        textContentType="password"
        style={styles.input}
        onSubmitEditing={handleLogin}
      />

      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        disabled={loading || !valid}
        style={styles.button}
      >
        Login
      </Button>

      <Button onPress={() => navigation.navigate('Signup')} style={{ marginTop: 8 }}>
        Don’t have an account? Sign Up
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { textAlign: 'center', marginBottom: 24 },
  input: { marginBottom: 12 },
  button: { marginTop: 8, borderRadius: 24 },
});
