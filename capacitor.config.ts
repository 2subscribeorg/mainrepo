import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.twosubscribe.app',
  appName: '2Subscribe',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true  // allows HTTP API calls during local development
  }
};

export default config;
