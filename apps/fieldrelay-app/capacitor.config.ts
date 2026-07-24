export interface CapacitorConfig {
  appId?: string;
  appName?: string;
  webDir?: string;
  server?: {
    androidScheme?: string;
    url?: string;
  };
  plugins?: Record<string, Record<string, unknown>>;
}

const config: CapacitorConfig = {
  appId: 'com.fieldrelay.ops',
  appName: 'FieldRelay Ops',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Keyboard: {
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'DARK'
    }
  }
};

export default config;
