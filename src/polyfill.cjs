if (typeof globalThis.DOMMatrix === 'undefined') {
  const { DOMMatrix } = require('canvas');
  globalThis.DOMMatrix = DOMMatrix;
}
