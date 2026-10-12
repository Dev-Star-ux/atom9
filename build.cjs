// Bundles the renderer (src/renderer.js + three + tfjs) into dist/bundle.js
// with esbuild, and copies the TensorFlow.js WASM binaries next to it so the
// AI runs offline on CPU. Run: node build.js   (add --watch for dev).
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');
const outdir = path.join(__dirname, 'dist');
fs.mkdirSync(outdir, { recursive: true });

// --- copy the tfjs-backend-wasm .wasm files into dist/ (offline, CPU AI) ---
const wasmPkg = path.dirname(require.resolve('@tensorflow/tfjs-backend-wasm/package.json'));
const wasmDist = path.join(wasmPkg, 'dist');
for (const f of fs.readdirSync(wasmDist)) {
  if (f.endsWith('.wasm')) {
    fs.copyFileSync(path.join(wasmDist, f), path.join(outdir, f));
  }
}

const outfile = path.join(outdir, 'bundle.js');

// TF.js embeds its WASM worker source as a string literal, so esbuild cannot
// rewrite operators inside it. Patch the one remaining nullish coalescing.
function patchEmbeddedWorker() {
  let code = fs.readFileSync(outfile, 'utf8');
  const next = code.split('e.reason??e').join('e.reason!=null?e.reason:e');
  if (next !== code) fs.writeFileSync(outfile, next);
}

const options = {
  entryPoints: [path.join(__dirname, 'src', 'renderer.js')],
  bundle: true,
  outfile,
  platform: 'browser',
  format: 'iife',
  // Lowered to chrome70 so the app runs on older offline machines; esbuild
  // downlevels modern syntax (private class fields, optional chaining,
  // nullish coalescing, etc.) to WeakMap-based / explicit-check equivalents
  // automatically for this target — verified no raw `#field`/`?.`/`??`
  // survives in the bundle for this esbuild version.
  target: ['chrome70'],
  sourcemap: false,
  minify: true,          // shrink bundle.js (the file that travels with the app)
  logLevel: 'info',
  plugins: [{
    name: 'patch-embedded-worker',
    setup(build) {
      build.onEnd((result) => {
        if (!result.errors.length && fs.existsSync(outfile)) patchEmbeddedWorker();
      });
    },
  }],
};

async function run() {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('esbuild watching for changes...');
  } else {
    await esbuild.build(options);
    console.log('Build complete -> dist/bundle.js');
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
