/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [
    angular({
      tsconfig: 'tsconfig.json'
    })
  ],
  server: {
    port: 4200,
    host: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    server: {
      deps: {
        inline: ['@angular', '@ionic/angular', 'rxjs']
      }
    }
  }
});
