import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.twosubscribe.app',
  appName: '2Subscribe',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
