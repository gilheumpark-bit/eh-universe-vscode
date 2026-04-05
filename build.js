const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');

// 1. Build Extension Host
const extensionCtx = esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  minify,
});

// 2. Build Webview React App
const webviewCtx = esbuild.context({
  entryPoints: ['src/webview/index.tsx'],
  bundle: true,
  outfile: 'dist/webview.js',
  format: 'iife',
  minify,
  alias: {
    'next/dynamic': './src/webview/polyfills/next-dynamic.tsx',
    'next/link': './src/webview/polyfills/next-link.tsx',
    'next/image': './src/webview/polyfills/next-image.tsx',
    'next/script': './src/webview/polyfills/next-link.tsx',
  }
});

async function main() {
  const ext = await extensionCtx;
  const web = await webviewCtx;
  
  if (watch) {
    await ext.watch();
    await web.watch();
    console.log('Watching for changes...');
  } else {
    await ext.rebuild();
    await web.rebuild();
    ext.dispose();
    web.dispose();
    console.log('Build complete');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
