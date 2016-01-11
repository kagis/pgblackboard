'use strict';

define(function (require, exports, module) {
  module.exports = tileCoordsToQuadKey;

  function tileCoordsToQuadKey(tileCoords) {
    let quadKey = '';
    for (let i = tileCoords.z; i > 0; i--) {
      const mask = 1 << (i - 1);
      const digit = (tileCoords.x & mask ? 1 : 0) +
                    (tileCoords.y & mask ? 2 : 0);
      quadKey += digit;
    }
    return quadKey;
  }

});
