// src/screens/SignupScreen.js
// Signup screen: creates a new account using email/password and adds a basic user doc.
// Also sets the user as "online" immediately after signup.

import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useTheme } from '../theme/ThemeContext';

import { register } from '../services/auth'; // helper from services/auth.js
import { db } from '../services/firebase';
import { doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';

export default function SignupScreen({ navigation }) {
  const { theme } = useTheme();

  // form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // disables the button + shows a spinner
  const [loading, setLoading] = useState(false);

  // quick client-side checks before calling Firebase
  const valid =
    email.trim().length > 0 &&
    password.length >= 6 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSignup = async () => {
    if (!valid) {
      Alert.alert('Invalid Input', 'Enter a valid email and a password (min 6 chars).');
      return;
    }
    try {
      setLoading(true);

      // register new user; will also set displayName if we pass one
      const user = await register(email.trim(), password);

      // create user doc for presence and profile
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        status: 'online',
        lastSeen: serverTimestamp(),
      });

      // go to channels after successful signup
      navigation.replace('Channels');
    } catch (e) {
      // map common signup errors to friendly text
      let message = e.message || 'Signup failed.';
      if (e.code === 'auth/email-already-in-use') message = 'That email is already registered.';
      else if (e.code === 'auth/invalid-email') message = 'Please enter a valid email address.';
      else if (e.code === 'auth/weak-password') message = 'Password should be at least 6 characters.';
      Alert.alert('Signup Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text variant="headlineLarge" style={[styles.title, { color: theme.text }]}>
        Create Account
      </Text>

      {/* email input */}
      <TextInput
        label="Email"
        mode="outlined"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="username"
        style={styles.input}
      />

      {/* password input */}
      <TextInput
        label="Password"
        mode="outlined"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        textContentType="newPassword"
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleSignup}
        loading={loading}
        disabled={loading || !valid}
        style={styles.button}
      >
        Sign Up
      </Button>

      {/* navigation link back to login */}
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={{ marginTop: 16, textAlign: 'center', color: theme.primary }}>
          Already have an account? Log In
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { textAlign: 'center', marginBottom: 32 },
  input: { marginBottom: 16 },
  button: { marginTop: 8, borderRadius: 24 },
});
