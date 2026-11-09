import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') {
      router.replace('/(web)/landing' as any);
    } else {
      router.replace('/(auth)/welcome');
    }
  }, []);

  return null;
}
