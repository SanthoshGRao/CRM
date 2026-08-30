import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.envisiontechsol.crm',
  appName: 'CRM Platform',
  // The app is a thin native shell around the live web app — same React
  // components, same theme, same deploy — rather than a bundled copy that
  // would drift from it. Swap this for a real HTTPS domain once one exists;
  // cleartext is only here because the web app is still served over plain
  // HTTP on a bare IP.
  server: {
    url: 'http://147.93.108.218:3002',
    cleartext: true,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#4f46e5',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      // Light (white) icons read correctly against the dark indigo brand bar.
      style: 'LIGHT',
      backgroundColor: '#4f46e5',
      // Reserve space for the status bar instead of drawing the WebView
      // under it — the default (true) overlaps the app header with the
      // phone's clock/battery icons.
      overlaysWebView: false,
    },
  },
};

export default config;
