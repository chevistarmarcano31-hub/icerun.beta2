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
