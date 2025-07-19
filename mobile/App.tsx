/**
 * YieldRails Mobile Application
 * Main App Component with Navigation and State Management
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { store, persistor } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { WalletProvider } from './src/contexts/WalletContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { LoadingScreen } from './src/components/common/LoadingScreen';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { lightTheme, darkTheme } from './src/styles/theme';
import { initializeAnalytics } from './src/services/analytics';
import { configurePushNotifications } from './src/services/notifications';

const App: React.FC = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    // Initialize app services
    initializeAnalytics();
    configurePushNotifications();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Provider store={store}>
            <PersistGate loading={<LoadingScreen />} persistor={persistor}>
              <PaperProvider theme={theme}>
                <NavigationContainer theme={theme}>
                  <AuthProvider>
                    <WalletProvider>
                      <NotificationProvider>
                        <StatusBar
                          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                          backgroundColor={theme.colors.surface}
                        />
                        <AppNavigator />
                      </NotificationProvider>
                    </WalletProvider>
                  </AuthProvider>
                </NavigationContainer>
              </PaperProvider>
            </PersistGate>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;