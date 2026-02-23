import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.regionalportal.app',
  appName: 'RegionalPortal',
  webDir: 'out',
  ios: {
    limitsNavigationsToAppBoundDomains: false
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'localhost',
    allowNavigation: ['*']
  },
  plugins: {}
};

export default config;
