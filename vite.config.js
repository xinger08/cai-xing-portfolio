import { defineConfig } from 'vite';

export default defineConfig({
  base: '/cai-xing-portfolio/',
  server: {
    watch: {
      ignored: ['**/work/**', '**/qa/**', '**/dist/**'],
    },
  },
});
