csslink('./spinnerShield.css');

define(function (require, exports, module) {
  var el = require('core/el');

  module.exports = renderSpinnerShield;

  function renderSpinnerShield(params) {
    return el('div.spinnerShield'
      ,params.isVisible && el.class('spinnerShield--visible')
    );
  }

  // var styles = {
  //   spinnerShield: css.class({
  //     visibility: 'hidden',
  //     overflow: 'hidden',
  //     zIndex: 1000,
  //     position: 'absolute',
  //     top: 0,
  //     bottom: 0,
  //     left: 0,
  //     right: 0,
  //
  //     backgroundColor: 'rgba(0,0,0,.1)',
  //     opacity: '0',
  //     transition: 'opacity .5s ease',
  //
  //
  //   })
  // };
});
