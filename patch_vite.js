const fs = require('fs');

let content = fs.readFileSync('vite.config.ts', 'utf8');

const replacement = `export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand'],
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});`;

content = content.replace(/export default defineConfig\(\{[\s\S]*\}\);/, replacement);

fs.writeFileSync('vite.config.ts', content);
