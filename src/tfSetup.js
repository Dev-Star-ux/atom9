// Force TensorFlow.js WASM to load from the local /dist folder (never CDN).
// Call once at boot before any module starts AI training.
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';

let done = false;

export function setupOfflineTf() {
  if (done) return;
  done = true;
  try {
    setWasmPaths('/dist/');
  } catch (e) {
    // Safe to ignore — modules also call setWasmPaths before setBackend.
  }
}
