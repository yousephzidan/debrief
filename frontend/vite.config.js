import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// Custom plugin to copy content script to dist
const copyContentScript = () => ({
  name: 'copy-content-script',
  closeBundle() {
    // Copy content.js from src to dist/src
    const srcDir = resolve(__dirname, 'src')
    const destDir = resolve(__dirname, 'dist', 'src')
    
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }
    
    // Copy content.js
    fs.copyFileSync(
      resolve(srcDir, 'content.js'),
      resolve(destDir, 'content.js')
    )
    
    // Copy background.js
    fs.copyFileSync(
      resolve(srcDir, 'background.js'),
      resolve(destDir, 'background.js')
    )
    
    // Copy utils/api.js and ensure directory exists
    const utilsDestDir = resolve(destDir, 'utils')
    if (!fs.existsSync(utilsDestDir)) {
      fs.mkdirSync(utilsDestDir, { recursive: true })
    }
    
    // Create a simplified API module for content script
    const apiContent = fs.readFileSync(resolve(srcDir, 'utils', 'api.js'), 'utf8')
    fs.writeFileSync(resolve(utilsDestDir, 'api.js'), apiContent)
    
    console.log('✓ Copied content script and background script to dist/')
  }
})

export default defineConfig({
  plugins: [react(), copyContentScript()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.css$/i.test(assetInfo.name)) {
            return 'assets/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
