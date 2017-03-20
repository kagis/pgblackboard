'use strict';

function csslink(path) {
  const linkEl = document.createElement('link');
  linkEl.rel = 'stylesheet';
  linkEl.href = new URL(path, document.currentScript.src);
  document.head.appendChild(linkEl);
}
