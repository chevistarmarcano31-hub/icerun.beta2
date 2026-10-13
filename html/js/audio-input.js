const Audio2 = {
  ctx: null,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext||window.webkitAudioContext)(); } catch {}
  },
  beep(freq=600, dur=0.05, vol=0.15, type='square') {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    const v = (save.options.sfx/100) * vol * (save.options.volume/100);
    g.gain.setValueAtTime(v, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  },
  click(){ this.beep(600,0.04,0.1); },
  shoot(){ this.beep(880,0.03,0.06); },
  hit()  { this.beep(220,0.05,0.1); },
  hurt() { this.beep(140,0.1,0.15); },
  dash() { this.beep(660,0.08,0.12); setTimeout(()=>this.beep(990,0.06,0.1),30); },
  melee(){ this.beep(520,0.08,0.14,'sawtooth'); },
  long() { this.beep(180,0.25,0.18,'sawtooth'); setTimeout(()=>this.beep(120,0.35,0.15,'sawtooth'),120); },
  explosion(){ this.beep(90,0.4,0.25,'sawtooth'); },
  buy()  { this.beep(880,0.06); setTimeout(()=>this.beep(1200,0.08),50); },
  consume(){ this.beep(720,0.06,0.14); setTimeout(()=>this.beep(1080,0.09,0.12),60); },
  levelUp(){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>this.beep(f,0.12,0.18),i*80)); },
  achievement(){ [880,1108,1320,1760].forEach((f,i)=>setTimeout(()=>this.beep(f,0.14,0.2),i*90)); },
  challenge(){ [330,392,494,392,330].forEach((f,i)=>setTimeout(()=>this.beep(f,0.14,0.2,'sawtooth'),i*90)); },
  victory(){ [660,880,1320].forEach((f,i)=>setTimeout(()=>this.beep(f,0.15),i*100)); },
  defeat(){ this.beep(220,0.3,0.3,'sawtooth'); setTimeout(()=>this.beep(110,0.5,0.3,'sawtooth'),150); },
};



/* ===== input.js ===== */
const Input = {
  keys: {},
  mouseDown: false,
  _mx: undefined,
  _my: undefined,
  touchMoveX: 0,
  touchMoveY: 0,
  touchButtons: {},
  touchInitialized: false,
  init() {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
      if (k === save.keybinds.pause && Game.running) Game.togglePause();
      if (k === save.keybinds.inventory || k === 'tab') {
        e.preventDefault();
        if (Game.battleActive && !Game.paused) UI.toggleInventoryModal();
      }
      if (k === 'e' && Game.battleActive && !Game.paused) {
        Game.tryInteract();
      }
      if (['1','2','3','4'].includes(k) && Game.battleActive && !Game.paused) {
        const slots = UI.getConsumableSlots();
        const idx = parseInt(k, 10) - 1;
        if (slots[idx]) Game.useConsumable(slots[idx].id);
      }
    });
    window.addEventListener('keyup', e => {
      this.keys[e.key.toLowerCase()] = false;
    });
    window.addEventListener('mousedown', e => {
      if (e.button === 0) { this.mouseDown = true; Audio2.init(); }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouseDown = false;
    });
    window.addEventListener('blur', () => { this.mouseDown = false; });
    this.initTouchControls();
  },

  initTouchControls() {
    const joystick = document.getElementById('touchJoystick');
    const knob = document.getElementById('touchJoystickKnob');
    if (!joystick || !knob || this.touchInitialized) return;
    this.touchInitialized = true;

    let pointerId = null;
    const updateJoystick = event => {
      const rect = joystick.getBoundingClientRect();
      const radius = Math.max(1, (rect.width - knob.offsetWidth) / 2);
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let x = event.clientX - centerX;
      let y = event.clientY - centerY;
      const distance = Math.hypot(x, y);
      if (distance > radius) {
        x = (x / distance) * radius;
        y = (y / distance) * radius;
      }
      this.touchMoveX = x / radius;
      this.touchMoveY = y / radius;
      knob.style.transform = `translate(${x}px, ${y}px)`;
    };
    const resetJoystick = event => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      this.touchMoveX = 0;
      this.touchMoveY = 0;
      knob.style.transform = 'translate(0, 0)';
      joystick.releasePointerCapture?.(event.pointerId);
    };

    joystick.addEventListener('pointerdown', event => {
      event.preventDefault();
      pointerId = event.pointerId;
      joystick.setPointerCapture?.(pointerId);
      updateJoystick(event);
    });
    joystick.addEventListener('pointermove', event => {
      if (event.pointerId === pointerId) {
        event.preventDefault();
        updateJoystick(event);
      }
    });
    joystick.addEventListener('pointerup', resetJoystick);
    joystick.addEventListener('pointercancel', resetJoystick);

    for (const button of document.querySelectorAll('[data-touch-action]')) {
      const action = button.dataset.touchAction;
      const setAction = event => {
        event.preventDefault();
        this.touchButtons[action] = true;
        button.setPointerCapture?.(event.pointerId);
        Audio2.init();
      };
      const clearAction = event => {
        event.preventDefault();
        this.touchButtons[action] = false;
      };
      button.addEventListener('pointerdown', setAction);
      button.addEventListener('pointerup', clearAction);
      button.addEventListener('pointercancel', clearAction);
      button.addEventListener('pointerleave', clearAction);
    }
  },
};

/* ================================================================
   PLAYER
   ================================================================ */


/* ===== gamepad.js ===== */
/* ================================================================
   ICE RUN â€” gamepad.js v5
   DetecciÃ³n de marca + snapshots separados + polling de seguridad.
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
      console.warn('âš  Gamepad API no soportada en este navegador');
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
    console.log('ðŸŽ® Mando conectado:', this.id);

    if (window.UI && UI.toast) {
      UI.toast(`ðŸŽ® ${this._shortName(this.id)} conectado`, 'gold');
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
      console.log('ðŸŽ® Mando desconectado');
      if (window.UI && UI.toast) {
        UI.toast('ðŸŽ® Mando desconectado', 'danger');
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
      xbox: { basic:'RT', basicAlt:'RB', melee:'X', long:'Y', dash:'B', dashAlt:'LB', block:'A', pause:'â˜°', inventory:'â§‰', confirm:'A', cancel:'B' },
      ps:   { basic:'R2', basicAlt:'R1', melee:'â–¡', long:'â–³', dash:'â—‹', dashAlt:'L1', block:'âœ•', pause:'OPTIONS', inventory:'SHARE', confirm:'âœ•', cancel:'â—‹' },
      switch:{ basic:'ZR', basicAlt:'R', melee:'Y', long:'X', dash:'A', dashAlt:'L', block:'B', pause:'+', inventory:'âˆ’', confirm:'B', cancel:'A' },
      '8bitdo': { basic:'RT', basicAlt:'RB', melee:'X', long:'Y', dash:'B', dashAlt:'LB', block:'A', pause:'+', inventory:'âˆ’', confirm:'A', cancel:'B' },
    };
    return (map[brand] || map.xbox)[action] || '?';
  },

  getButtonIcon(action) {
    const brand = this._getBrand();
    const map = {
      xbox: { basic:'ðŸŽ®', melee:'âŽ', long:'ðŸŸ¡', dash:'ðŸ…±ï¸', block:'ðŸ…°ï¸', pause:'â˜°', inventory:'â§‰', confirm:'ðŸ…°ï¸', cancel:'ðŸ…±ï¸' },
      ps:   { basic:'ðŸŽ®', melee:'ðŸŸ¦', long:'ðŸ”º', dash:'ðŸ”´', block:'âœ–ï¸', pause:'â¸', inventory:'ðŸ“‹', confirm:'âœ–ï¸', cancel:'â­•' },
      switch:{ basic:'ðŸŽ®', melee:'ðŸŸ¨', long:'ðŸŸ¦', dash:'ðŸ…°ï¸', block:'ðŸ…±ï¸', pause:'âž•', inventory:'âž–', confirm:'ðŸ…±ï¸', cancel:'ðŸ…°ï¸' },
      '8bitdo': { basic:'ðŸŽ®', melee:'âŽ', long:'ðŸŸ¡', dash:'ðŸ…±ï¸', block:'ðŸ…°ï¸', pause:'âž•', inventory:'âž–', confirm:'ðŸ…°ï¸', cancel:'ðŸ…±ï¸' },
    };
    return (map[brand] || map.xbox)[action] || 'ðŸŽ®';
  },

  getBrandName() {
    const brand = this._getBrand();
    const names = {
      xbox:   'ðŸŽ® Xbox',
      ps:     'ðŸŽ® PlayStation',
      switch: 'ðŸŽ® Switch',
      '8bitdo': 'ðŸŽ® 8BitDo',
    };
    return names[brand] || 'ðŸŽ® Mando';
  },
};

/* ===== player.js ===== */
