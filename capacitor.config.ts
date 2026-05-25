import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.twosubscribe.app',
  appName: '2Subscribe',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  }
};

export default config;
