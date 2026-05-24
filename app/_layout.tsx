import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const scheme = useColorScheme();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="quincena/[id]"
          options={{
            headerShown: true,
            title: 'Detalle de quincena',
            headerStyle: { backgroundColor: scheme === 'dark' ? '#1a1a2e' : '#1565C0' },
            headerTintColor: '#fff',
          }}
        />
      </Stack>
    </>
  );
}
