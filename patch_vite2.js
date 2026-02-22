const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');

const target = `  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },`;

const replacement = `  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand'],
        }
      }
    }
  },`;

content = content.replace(target, replacement);
fs.writeFileSync('vite.config.ts', content);
