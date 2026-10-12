/* ================================================================
   ICE RUN — gamepad.js v5
   Detección de marca + snapshots separados + polling de seguridad.
   ================================================================ */
'use strict';

const Gamepad = {
  connected: false,
  index: -1,
  id: '',

  deadzone: 0.22,
  aimSmoothing: 0.35,
  menuNavInterval: 220,

  _prevButtons: {},
  _prevButtonsUI: {},
  _axisSnapshot: { lx:0, ly:0, rx:0, ry:0 },
  _pollIntervalId: null,

  MAPPING: {
    basic:      7,
    basicAlt:   5,
    melee:      2,
    long:       3,
    dash:       1,
    dashAlt:    4,
    block:      0,
    pause:      9,
    inventory:  8,
    confirm:    0,
    cancel:     1,
  },

  init() {
    if (!navigator.getGamepads) {
      console.warn('⚠ Gamepad API no soportada en este navegador');
      return;
    }
    window.addEventListener('gamepadconnected', e => this._onConnect(e.gamepad));
    window.addEventListener('gamepaddisconnected', e => this._onDisconnect(e.gamepad));

    const pads = navigator.getGamepads();
    for (let i = 0; i < pads.length; i++) {
      if (pads[i]) { this._onConnect(pads[i]); break; }
    }

    this._pollIntervalId = setInterval(() => {
      const pads = navigator.getGamepads();
      let found = null;
      for (let i = 0; i < pads.length; i++) {
        if (pads[i] && pads[i].connected) { found = pads[i]; break; }
      }
      if (found && !this.connected) {
        this._onConnect(found);
      } else if (!found && this.connected) {
        this._onDisconnect({ index: this.index });
      }
    }, 800);
  },

  _onConnect(gp) {
    if (this.connected && this.index === gp.index && this.id === gp.id) return;

    this.connected = true;
    this.index = gp.index;
    this.id = gp.id || 'Mando';
    console.log('🎮 Mando conectado:', this.id);

    if (window.UI && UI.toast) {
      UI.toast(`🎮 ${this._shortName(this.id)} conectado`, 'gold');
    }
    this.rumble(0.3, 80);

    if (window.UI && UI.updateKeyLabels) {
      setTimeout(() => UI.updateKeyLabels(), 50);
    }
  },

  _onDisconnect(gp) {
    if (gp.index === this.index || this.index < 0) {
      this.connected = false;
      this.index = -1;
      this.id = '';
      console.log('🎮 Mando desconectado');
      if (window.UI && UI.toast) {
        UI.toast('🎮 Mando desconectado', 'danger');
      }
      if (window.UI && UI.updateKeyLabels) UI.updateKeyLabels();
    }
  },

  _shortName(id) {
    return (id.split('(')[0].trim() || 'Mando').slice(0, 28);
  },

  get() {
    if (!this.connected || this.index < 0) return null;
    const pads = navigator.getGamepads();
    return pads[this.index] || null;
  },

  _applyCurve(v) {
    const dz = this.deadzone;
    if (Math.abs(v) < dz) return 0;
    const sign = v < 0 ? -1 : 1;
    const norm = (Math.abs(v) - dz) / (1 - dz);
    return sign * (norm * norm * 0.55 + norm * 0.45);
  },

  pollSticks() {
    const gp = this.get();
    if (!gp) {
      this._axisSnapshot.lx = 0;
      this._axisSnapshot.ly = 0;
      this._axisSnapshot.rx = 0;
      this._axisSnapshot.ry = 0;
      return this._axisSnapshot;
    }
    const axes = gp.axes;
    this._axisSnapshot.lx = this._applyCurve(axes[0] || 0);
    this._axisSnapshot.ly = this._applyCurve(axes[1] || 0);
    this._axisSnapshot.rx = this._applyCurve(axes[2] || 0);
    this._axisSnapshot.ry = this._applyCurve(axes[3] || 0);
    return this._axisSnapshot;
  },

  isDown(btn) {
    const gp = this.get();
    if (!gp || !gp.buttons[btn]) return false;
    return gp.buttons[btn].pressed || gp.buttons[btn].value > 0.5;
  },

  justPressed(btn) {
    const gp = this.get();
    if (!gp || !gp.buttons[btn]) return false;
    const cur = gp.buttons[btn].pressed || gp.buttons[btn].value > 0.5;
    const prev = this._prevButtons[btn] || false;
    return cur && !prev;
  },

  updateButtons() {
    const gp = this.get();
    if (!gp) { this._prevButtons = {}; return; }
    const snap = {};
    for (let i = 0; i < gp.buttons.length; i++) {
      snap[i] = !!(gp.buttons[i].pressed || gp.buttons[i].value > 0.5);
    }
    this._prevButtons = snap;
  },

  justPressedUI(btn) {
    const gp = this.get();
    if (!gp || !gp.buttons[btn]) return false;
    const cur = gp.buttons[btn].pressed || gp.buttons[btn].value > 0.5;
    const prev = this._prevButtonsUI[btn] || false;
    return cur && !prev;
  },

  updateButtonsUI() {
    const gp = this.get();
    if (!gp) { this._prevButtonsUI = {}; return; }
    const snap = {};
    for (let i = 0; i < gp.buttons.length; i++) {
      snap[i] = !!(gp.buttons[i].pressed || gp.buttons[i].value > 0.5);
    }
    this._prevButtonsUI = snap;
  },

  dpad() {
    const gp = this.get();
    if (!gp) return { up:false, down:false, left:false, right:false };
    const b = gp.buttons;
    return {
      up:    b[12] && b[12].pressed,
      down:  b[13] && b[13].pressed,
      left:  b[14] && b[14].pressed,
      right: b[15] && b[15].pressed,
    };
  },

  rumble(intensity = 0.6, duration = 120) {
    const gp = this.get();
    if (!gp) return;
    const act = gp.vibrationActuator || (gp.hapticActuators && gp.hapticActuators[0]);
    if (!act) return;
    try {
      if (act.playEffect) {
        act.playEffect('dual-rumble', {
          startDelay: 0,
          duration,
          weakMagnitude: Math.min(1, intensity * 0.5),
          strongMagnitude: Math.min(1, intensity),
        });
      } else if (act.pulse) {
        act.pulse(intensity, duration);
      }
    } catch (e) {}
  },

  _getBrand() {
    const id = (this.id || '').toLowerCase();
    if (id.includes('xbox') || id.includes('xinput') || id.includes('045e')) return 'xbox';
    if (id.includes('dualsense') || id.includes('dualshock') ||
        id.includes('playstation') || id.includes('ps4') || id.includes('ps5') ||
        id.includes('054c')) return 'ps';
    if (id.includes('switch') || id.includes('nintendo') ||
        id.includes('joy-con') || id.includes('pro controller') ||
        id.includes('057e')) return 'switch';
    if (id.includes('8bitdo')) return '8bitdo';
    return 'xbox';
  },

  getButtonLabel(action) {
    const brand = this._getBrand();
    const map = {
      xbox: { basic:'RT', basicAlt:'RB', melee:'X', long:'Y', dash:'B', dashAlt:'LB', block:'A', pause:'☰', inventory:'⧉', confirm:'A', cancel:'B' },
      ps:   { basic:'R2', basicAlt:'R1', melee:'□', long:'△', dash:'○', dashAlt:'L1', block:'✕', pause:'OPTIONS', inventory:'SHARE', confirm:'✕', cancel:'○' },
      switch:{ basic:'ZR', basicAlt:'R', melee:'Y', long:'X', dash:'A', dashAlt:'L', block:'B', pause:'+', inventory:'−', confirm:'B', cancel:'A' },
      '8bitdo': { basic:'RT', basicAlt:'RB', melee:'X', long:'Y', dash:'B', dashAlt:'LB', block:'A', pause:'+', inventory:'−', confirm:'A', cancel:'B' },
    };
    return (map[brand] || map.xbox)[action] || '?';
  },

  getButtonIcon(action) {
    const brand = this._getBrand();
    const map = {
      xbox: { basic:'🎮', melee:'❎', long:'🟡', dash:'🅱️', block:'🅰️', pause:'☰', inventory:'⧉', confirm:'🅰️', cancel:'🅱️' },
      ps:   { basic:'🎮', melee:'🟦', long:'🔺', dash:'🔴', block:'✖️', pause:'⏸', inventory:'📋', confirm:'✖️', cancel:'⭕' },
      switch:{ basic:'🎮', melee:'🟨', long:'🟦', dash:'🅰️', block:'🅱️', pause:'➕', inventory:'➖', confirm:'🅱️', cancel:'🅰️' },
      '8bitdo': { basic:'🎮', melee:'❎', long:'🟡', dash:'🅱️', block:'🅰️', pause:'➕', inventory:'➖', confirm:'🅰️', cancel:'🅱️' },
    };
    return (map[brand] || map.xbox)[action] || '🎮';
  },

  getBrandName() {
    const brand = this._getBrand();
    const names = {
      xbox:   '🎮 Xbox',
      ps:     '🎮 PlayStation',
      switch: '🎮 Switch',
      '8bitdo': '🎮 8BitDo',
    };
    return names[brand] || '🎮 Mando';
  },
};