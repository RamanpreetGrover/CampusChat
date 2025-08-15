// App.js
// Root of the app. Wraps everything in ThemeProvider and shows AppNavigator.

import React from 'react';
import { ThemeProvider } from './src/theme/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
