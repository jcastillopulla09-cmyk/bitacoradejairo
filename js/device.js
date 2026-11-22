/**
 * device.js — Detección adaptativa real del entorno (laptop vs. celular).
 *
 * Se carga de forma síncrona en <head> para que los atributos existan antes del
 * primer pintado. Escribe en <html>:
 *   data-device = "mobile" (≤ 768 px) | "tablet" (769–1024 px) | "desktop" (> 1024 px)
 *   data-input  = "touch" | "mouse"
 * y se reevalúa al redimensionar, rotar el teléfono o conectar/desconectar un ratón.
 * Emite el evento `devicechange` en window con { device, input } cuando algo cambia.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var mqMobile = window.matchMedia('(max-width: 768px)');
  var mqTablet = window.matchMedia('(min-width: 769px) and (max-width: 1024px)');
  var mqCoarse = window.matchMedia('(pointer: coarse)');
  var mqHover = window.matchMedia('(hover: hover)');

  var state = { device: null, input: null };

  function computeDevice() {
    if (mqMobile.matches) return 'mobile';
    if (mqTablet.matches) return 'tablet';
    return 'desktop';
  }

  function computeInput() {
    var touchPoints = navigator.maxTouchPoints || 0;
    // Puntero primario grueso (dedo) o un dispositivo táctil sin capacidad de hover → táctil.
    if (mqCoarse.matches) return 'touch';
    if (touchPoints > 0 && !mqHover.matches) return 'touch';
    return 'mouse';
  }

  function update() {
    var device = computeDevice();
    var input = computeInput();
    if (device === state.device && input === state.input) return;
    var previous = { device: state.device, input: state.input };
    state.device = device;
    state.input = input;
    root.setAttribute('data-device', device);
    root.setAttribute('data-input', input);
    try {
      window.dispatchEvent(new CustomEvent('devicechange', { detail: { device: device, input: input, previous: previous } }));
    } catch (e) { /* navegadores muy antiguos */ }
  }

  function listen(mq) {
    if (mq.addEventListener) mq.addEventListener('change', update);
    else if (mq.addListener) mq.addListener(update); // Safari < 14
  }

  [mqMobile, mqTablet, mqCoarse, mqHover].forEach(listen);
  window.addEventListener('resize', update, { passive: true });
  window.addEventListener('orientationchange', update);
  // Un toque real en un equipo híbrido (laptop con pantalla táctil) cambia a modo táctil al vuelo.
  window.addEventListener('pointerdown', function (e) {
    var next = e.pointerType === 'touch' ? 'touch' : (e.pointerType === 'mouse' ? 'mouse' : null);
    if (next && next !== state.input) {
      state.input = next;
      root.setAttribute('data-input', next);
      try { window.dispatchEvent(new CustomEvent('devicechange', { detail: { device: state.device, input: next } })); } catch (err) {}
    }
  }, { passive: true, capture: true });

  update();

  window.BJDevice = {
    get device() { return state.device; },
    get input() { return state.input; },
    isMobile: function () { return state.device === 'mobile'; },
    isTouch: function () { return state.input === 'touch'; },
    refresh: update
  };
})();
