import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

function copyTrashCanCSV() {
  return {
    name: 'copy-trashcan-csv',
    buildStart() {
      const src = path.resolve(__dirname, 'src/data/trashCanData.csv'); // 원본 위치
      const dest = path.resolve(__dirname, 'public/trashCanData.csv'); // 복사 대상

      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('📁 trashCanData.csv copied to public/');
      } else {
        console.warn('⚠️ trashCanData.csv not found at src/data/');
      }
    }
  };
}

export default defineConfig({
  base: '/',
  publicDir: 'public',
  plugins: [copyTrashCanCSV()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        assetFileNames: 'assets/[name][extname]',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js'
      }
    },
    assetsInlineLimit: 0,
  }
});