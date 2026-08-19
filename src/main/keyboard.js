'use strict';
const { uIOhook, UiohookKey } = require('uiohook-napi');

/**
 * Thin wrapper around the global (system-wide) keyboard hook.
 * Emits normalized key-down / key-up to a listener, and handles:
 *   - OS auto-repeat suppression when hold-to-repeat is disabled
 *   - flagging modifier keys so the caller can optionally ignore them
 */

const MODIFIER_KEYCODES = new Set([
  UiohookKey.Shift, UiohookKey.ShiftRight,
  UiohookKey.Ctrl, UiohookKey.CtrlRight,
  UiohookKey.Alt, UiohookKey.AltRight,
  UiohookKey.Meta, UiohookKey.MetaRight,
  UiohookKey.CapsLock,
].filter((v) => v !== undefined));

let started = false;
const pressed = new Set();

/**
 * @param {(evt: {type:'down'|'up', keycode:number, isModifier:boolean}) => void} onEvent
 * @param {() => {enabled:boolean, holdToRepeat:boolean, modifierKeys:boolean}} getState
 */
function start(onEvent, getState) {
  if (started) return;

  uIOhook.on('keydown', (e) => {
    const state = getState();
    const isModifier = MODIFIER_KEYCODES.has(e.keycode);
    const isRepeat = pressed.has(e.keycode);
    pressed.add(e.keycode);

    if (!state.enabled) return;
    if (isModifier && !state.modifierKeys) return;
    if (isRepeat && !state.holdToRepeat) return; // suppress OS auto-repeat

    onEvent({ type: 'down', keycode: e.keycode, isModifier });
  });

  uIOhook.on('keyup', (e) => {
    pressed.delete(e.keycode);
    const state = getState();
    const isModifier = MODIFIER_KEYCODES.has(e.keycode);
    if (!state.enabled) return;
    if (isModifier && !state.modifierKeys) return;
    onEvent({ type: 'up', keycode: e.keycode, isModifier });
  });

  try {
    uIOhook.start();
    started = true;
  } catch (err) {
    console.error('[keyboard] failed to start global hook:', err);
  }
}

function stop() {
  if (!started) return;
  try {
    uIOhook.stop();
  } catch (err) {
    console.error('[keyboard] failed to stop hook:', err);
  }
  started = false;
  pressed.clear();
}

module.exports = { start, stop };
