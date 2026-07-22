import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.twosubscribe.app',
  appName: '2Subscribe',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Allow custom URL scheme for deep linking
    allowNavigation: ['twosubscribe://*']
  }
};

export default config;
