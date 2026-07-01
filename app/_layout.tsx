import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Pressable, Text as RNText } from 'react-native';
import { Stack, router } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { initializeDatabase } from '../src/data/database';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1976D2',
    secondary: '#424242',
  },
};

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error('[App] Failed to initialize database:', err);
        setDbReady(true); // Allow app to render anyway
      });
  }, []);

  if (!dbReady) {
    return (
      <PaperProvider
        theme={theme}
        settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </PaperProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider
        theme={theme}
        settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}
      >
        <StatusBar style="auto" />
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.primary },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          >
            <Stack.Screen 
              name="index" 
              options={{ 
                title: 'Rapporti Assistenza',
                headerRight: () => (
                  <View style={{ flexDirection: 'row', marginRight: 8 }}>
                    <Pressable onPress={() => router.push('/map')} style={{ padding: 4, marginRight: 8 }}>
                      <RNText style={{ fontSize: 22 }}>🗺️</RNText>
                    </Pressable>
                    <Pressable onPress={() => router.push('/settings')} style={{ padding: 4 }}>
                      <RNText style={{ fontSize: 22 }}>⚙️</RNText>
                    </Pressable>
                  </View>
                ),
              }} 
            />
            <Stack.Screen name="report/new" options={{ title: 'Nuovo Rapporto' }} />
            <Stack.Screen name="report/[id]" options={{ title: 'Dettaglio Rapporto' }} />
            <Stack.Screen name="report/edit/[id]" options={{ title: 'Modifica Rapporto' }} />
            <Stack.Screen name="settings" options={{ title: 'Impostazioni' }} />
            <Stack.Screen name="map" options={{ title: 'Mappa Interventi' }} />
          </Stack>
        </SafeAreaView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
