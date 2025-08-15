// src/navigation/AppNavigator.js
import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme as NavLight, DarkTheme as NavDark } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, MD3LightTheme as PaperLight, MD3DarkTheme as PaperDark } from 'react-native-paper';
import { useTheme } from '../theme/ThemeContext';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ChannelListScreen from '../screens/ChannelListScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { theme } = useTheme(); // palette from ThemeContext (light or dark)

  // build Navigation + Paper themes from our palette (one source of truth)
  const { navTheme, paperTheme } = useMemo(() => {
    const isDark = theme.mode === 'dark';

    const navBase = isDark ? NavDark : NavLight;
    const navTheme = {
      ...navBase,
      colors: {
        ...navBase.colors,
        background: theme.bg,
        card: theme.card,
        text: theme.text,
        border: theme.border,
        primary: theme.primary,
        notification: theme.primary,
      },
    };

    const paperBase = isDark ? PaperDark : PaperLight;
    const paperTheme = {
      ...paperBase,
      colors: {
        ...paperBase.colors,
        background: theme.bg,
        surface: theme.card,
        primary: theme.primary,
        outline: theme.border,
        onSurface: theme.text,
      },
    };

    return { navTheme, paperTheme };
  }, [theme]);

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Channels" component={ChannelListScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default AppNavigator;
