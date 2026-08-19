'use strict';
// uiohook-napi keycode -> human label. Covers the common set; unknowns fall
// back to "Key N". Used only for the stats view (aggregate counts).
window.KEYCODE_LABELS = {
  1: 'Esc', 14: 'Backspace', 15: 'Tab', 28: 'Enter', 57: 'Space', 58: 'Caps',
  29: 'Ctrl', 56: 'Alt', 42: 'Shift', 54: 'Shift', 3639: 'PrtSc',
  12: '-', 13: '=', 26: '[', 27: ']', 43: '\\', 39: ';', 40: "'", 41: '`',
  51: ',', 52: '.', 53: '/',
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '0',
  16: 'Q', 17: 'W', 18: 'E', 19: 'R', 20: 'T', 21: 'Y', 22: 'U', 23: 'I', 24: 'O', 25: 'P',
  30: 'A', 31: 'S', 32: 'D', 33: 'F', 34: 'G', 35: 'H', 36: 'J', 37: 'K', 38: 'L',
  44: 'Z', 45: 'X', 46: 'C', 47: 'V', 48: 'B', 49: 'N', 50: 'M',
  57419: '←', 57416: '↑', 57421: '→', 57424: '↓',
  3675: 'Win', 3676: 'Win', 3613: 'Ctrl', 3640: 'Alt',
};
window.keyLabel = function (code) {
  return window.KEYCODE_LABELS[code] || ('Key ' + code);
};
