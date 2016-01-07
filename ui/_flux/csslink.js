function csslink(path) {
  var linkEl = document.createElement('link');
  linkEl.rel = 'stylesheet';
  linkEl.href = new URL(path, document.currentScript.src);
  document.head.appendChild(linkEl);
}
