class Player {
  constructor(stats, controlId = 'p1') {
    this.controlId = controlId;
    this.spriteId = controlId === 'p2'
      ? (save.customization.p2 || 'personaje-1')
      : (save.customization.p1 || save.customization.sprite || 'default');
    this.controls = controlId === 'p2'
      ? { up:'arrowup', down:'arrowdown', left:'arrowleft', right:'arrowright',
          basic:'j', melee:'k', long:'l', dash:'0', block:'i', interact:'9',
          consumables:['6','7','8','5'] }
      : { up:save.keybinds.up, down:save.keybinds.down, left:save.keybinds.left,
          right:save.keybinds.right, basic:save.keybinds.basic, melee:save.keybinds.melee,
          long:save.keybinds.long, dash:save.keybinds.dash, block:save.keybinds.block || 'f', interact:'e',
          consumables:['1','2','3','4'] };
    this.x = CFG.W / 2;
    this.y = CFG.H - 100;
    this.size = CFG.PLAYER.size;
    this.hp = stats.maxHp;
    this.maxHp = stats.maxHp;
    this.speed = stats.speed;
    this.atk = stats.atk;
    this.def = stats.def;
    this.atkSpeed = stats.atkSpeed;
    this.crit = stats.crit;
    this.range = stats.range;
    this.invulnUntil = 0;
    this.shieldUntil = 0;
    this.rageUntil = 0;
    this.hitFlash = 0;
    this.aimAngle = 0;
    this.autoAngle = 0;
    this.angle = 0;
    this._lastAimAngle = 0;
    this.lastBasic = 0;
    this.meleeCooldownUntil = 0;
    this.meleeActiveUntil = 0;
    this.meleeAngle = 0;
    this.longCooldownUntil = 0;
    this.dashCooldownUntil = 0;
    this.dashActiveUntil = 0;
    this.dashVx = 0;
    this.dashVy = 0;
    this.blockCooldownUntil = 0;
    this.blockActiveUntil = 0;
    this.autoTarget = null;
    this.downed = false;

    this.lifesteal        = stats._lifesteal        || 0;
    this.cooldownMul      = stats._cooldownMul      || 1;
    this.meleeArcBonus    = stats._meleeArcBonus    || 0;
    this.extraBasicProj   = stats._extraBasicProj   || 0;
    this.executeThreshold = stats._executeThreshold || 0;
    this.hasRevive        = stats._revive           || false;
    this.revivePct        = stats._revivePct        || 0.3;
    this.fanBasic         = stats._fanBasic         || 0;
    this.reviveUsed       = false;

    // Reto del piso: mutadores propios del jugador
    this.challengeState = Game.floorChallenge ? { ...Game.floorChallenge.apply } : {};

    // Aplicar modificadores del reto (una vez al crear el player)
    const cs = this.challengeState;
    if (cs.playerMaxHpMul) {
      this.maxHp = Math.round(this.maxHp * cs.playerMaxHpMul);
      this.hp = Math.min(this.hp, this.maxHp);
    }
    if (cs.playerSpeedMul) {
      this.speed *= cs.playerSpeedMul;
    }
    if (cs.playerCritBonus) {
      this.crit += cs.playerCritBonus;
    }
    if (cs.playerDmgMul) {
      this._challengeDmgMul = cs.playerDmgMul;
    } else {
      this._challengeDmgMul = 1;
    }
    this._challengeTakenMul = cs.playerDamageTakenMul || 1;
    this._challengeFireRateMul = cs.playerFireRateMul || 1;
    this._challengeCritDmgMul = cs.critDamageMul || 2;
  }
  isDashing(now) { return now < this.dashActiveUntil; }
  dashReady(now) { return now >= this.dashCooldownUntil; }
  meleeReady(now) { return now >= this.meleeCooldownUntil; }
  isMeleeActive(now) { return now < this.meleeActiveUntil; }
  longReady(now) { return now >= this.longCooldownUntil; }
  basicReady(now) { return now - this.lastBasic >= CFG.BASIC.cooldown * this._challengeFireRateMul; }
  blockReady(now) { return now >= this.blockCooldownUntil; }
  isBlocking(now) { return now < this.blockActiveUntil; }

  tryBlock(now) {
    if (!this.blockReady(now) || this.downed) return false;
    this.blockActiveUntil = now + CFG.BLOCK.activeTime;
    this.blockCooldownUntil = now + CFG.BLOCK.cooldown * this.cooldownMul;
    this.meleeAngle = this.aimAngle;
    this.invulnUntil = Math.max(this.invulnUntil, this.blockActiveUntil);
    Audio2.beep(740, 0.08, 0.12);
    Game.spawnParticles(this.x, this.y, '#7dffff', 12);
    UI.updateAbilityCooldowns();
    return true;
  }

  _fireBasic(ang) {
    const now = performance.now();
    const rageMul = (now < this.rageUntil) ? 1.6 : 1.0;
    const crit = Math.random() < this.crit;
    const critMul = crit ? this._challengeCritDmgMul : 1;
    const dmg = this.atk * CFG.BASIC.damageMul * rageMul * this._challengeDmgMul * critMul;
    const px = this.x + Math.cos(ang) * (this.size + 4);
    const py = this.y + Math.sin(ang) * (this.size + 4);

    let angles = [ang];
    if (this.fanBasic >= 3) {
      const spread = 0.25;
      angles = [ang - spread, ang, ang + spread];
    }
    for (let i = 0; i < this.extraBasicProj; i++) {
      angles.push(ang + (i % 2 === 0 ? 1 : -1) * 0.08 * (Math.floor(i / 2) + 1));
    }

    for (const a of angles) {
      Game.projectiles.push({
        x: px, y: py,
        vx: Math.cos(a) * CFG.BASIC.speed,
        vy: Math.sin(a) * CFG.BASIC.speed,
        dmg, crit, size: CFG.BASIC.size,
        life: CFG.BASIC.life, dead: false,
        color: crit ? '#ffd54f' : '#4dffff',
        fromBoss: false,
        kind: 'basic',
      });
    }
    Audio2.shoot();
  }

  tryBasic(now) {
    if (!this.basicReady(now)) return;
    this.lastBasic = now;
    const ang = this.autoTarget ? this.autoAngle : this.aimAngle;
    this._fireBasic(ang);
  }

  tryBasicManual(now) {
    if (!this.basicReady(now)) return;
    this.lastBasic = now;
    this._fireBasic(this.aimAngle);
  }

  tryMelee(now) {
    if (!this.meleeReady(now)) return;
    this.meleeActiveUntil = now + CFG.MELEE.activeTime;
    this.meleeAngle = this.aimAngle;
    this.meleeCooldownUntil = now + CFG.MELEE.cooldown * this.cooldownMul;
    Audio2.melee();

    const meleeRange = CFG.MELEE.range;
    const halfArc = (CFG.MELEE.arc * (1 + this.meleeArcBonus)) / 2;
    const rageMul = (now < this.rageUntil) ? 1.6 : 1.0;
    const meleeDmg = this.atk * CFG.MELEE.damageMul * rageMul * this._challengeDmgMul;
    let hitSomething = false;

    const targets = [...Game.enemies];
    if (Game.boss && !Game.boss.dead) targets.push(Game.boss);
    for (const e of targets) {
      const dx = e.x - this.x, dy = e.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > meleeRange + e.size) continue;
      const angTo = Math.atan2(dy, dx);
      const diff = Math.abs(((angTo - this.meleeAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff > halfArc) continue;
      const crit = Math.random() < this.crit;
      const critMul = crit ? this._challengeCritDmgMul : 1;
      const dmg = meleeDmg * critMul;
      e.takeDamage(dmg, crit);
      const kb = CFG.MELEE.knockback;
      e.x += Math.cos(angTo) * kb;
      e.y += Math.sin(angTo) * kb;
      hitSomething = true;
    }

    if (Game.currentRoom) {
      for (const o of Game.currentRoom.obstacles) {
        if (o.hp <= 0) continue;
        const cx = Util.clamp(this.x, o.x, o.x + o.w);
        const cy = Util.clamp(this.y, o.y, o.y + o.h);
        const dist = Math.hypot(this.x - cx, this.y - cy);
        if (dist > meleeRange) continue;
        const angTo = Math.atan2(cy - this.y, cx - this.x);
        const diff = Math.abs(((angTo - this.meleeAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (diff > halfArc + 0.3) continue;
        Game.damageObstacle(o, meleeDmg);
        hitSomething = true;
      }
    }

    for (let i = Game.projectiles.length - 1; i >= 0; i--) {
      const pr = Game.projectiles[i];
      if (!pr.fromBoss) continue;
      const dist = Math.hypot(pr.x - this.x, pr.y - this.y);
      if (dist > meleeRange) continue;
      const angTo = Math.atan2(pr.y - this.y, pr.x - this.x);
      const diff = Math.abs(((angTo - this.meleeAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff > halfArc + 0.2) continue;
      Game.spawnParticles(pr.x, pr.y, '#ffd54f', 10);
      const incomingAngle = Math.atan2(pr.vy, pr.vx);
      const ang = incomingAngle + Math.PI;
      Game.projectiles.push({
        x: pr.x, y: pr.y,
        vx: Math.cos(ang) * 9,
        vy: Math.sin(ang) * 9,
        dmg: this.atk * 1.25 * this._challengeDmgMul,
        crit: false, size: 6,
        life: 900, dead: false,
        color: '#ffd54f',
        fromBoss: false,
        kind: 'basic',
        reflected: true,
      });
      pr.dead = true;
      hitSomething = true;
    }

    if (hitSomething) Gamepad.rumble(0.55, 90);
    UI.updateAbilityCooldowns();
  }

  tryLong(now) {
    if (!this.longReady(now)) return;
    this.longCooldownUntil = now + CFG.LONG.cooldown;
    const ang = this.aimAngle;
    const spawnX = this.x + Math.cos(ang) * 24;
    const spawnY = this.y + Math.sin(ang) * 24;
    const rageMul = (now < this.rageUntil) ? 1.6 : 1.0;
    Game.projectiles.push({
      x: spawnX, y: spawnY,
      vx: Math.cos(ang) * CFG.LONG.speed,
      vy: Math.sin(ang) * CFG.LONG.speed,
      dmg: this.atk * CFG.LONG.damageMul * rageMul * this._challengeDmgMul,
      crit: false,
      size: CFG.LONG.size,
      life: CFG.LONG.life,
      dead: false,
      color: '#ff9b3d',
      fromBoss: false,
      kind: 'long',
      slowDuration: CFG.LONG.slowDuration,
      explodeRadius: CFG.LONG.explodeRadius,
      explodeDamage: this.atk * CFG.LONG.explodeDamageMul * rageMul * this._challengeDmgMul,
      hit: new Set(),
    });
    Audio2.long();
    Gamepad.rumble(0.4, 70);
    UI.updateAbilityCooldowns();
  }

  tryDash(now) {
    if (!this.dashReady(now)) return;
    let dx = 0, dy = 0;
    const kb = this.controls;
    if (Input.keys[kb.up])    dy -= 1;
    if (Input.keys[kb.down])  dy += 1;
    if (Input.keys[kb.left])  dx -= 1;
    if (Input.keys[kb.right]) dx += 1;

    if (dx === 0 && dy === 0 && Gamepad.connected) {
      const sticks = Gamepad.pollSticks();
      if (Math.abs(sticks.lx) > 0.2 || Math.abs(sticks.ly) > 0.2) {
        dx = sticks.lx;
        dy = sticks.ly;
      }
    }

    if (dx === 0 && dy === 0) {
      dx = Math.cos(this.aimAngle);
      dy = Math.sin(this.aimAngle);
    } else {
      const m = Math.hypot(dx, dy);
      dx /= m; dy /= m;
    }
    const dur = CFG.PLAYER.dashDuration / 1000;
    this.dashVx = (dx * CFG.PLAYER.dashDistance) / dur;
    this.dashVy = (dy * CFG.PLAYER.dashDistance) / dur;
    this.dashActiveUntil = now + CFG.PLAYER.dashDuration;
    this.dashCooldownUntil = now + CFG.PLAYER.dashCooldown * this.cooldownMul;
    this.invulnUntil = Math.max(this.invulnUntil, now + CFG.PLAYER.dashDuration);
    Audio2.dash();
    Gamepad.rumble(0.35, 80);
    UI.updateAbilityCooldowns();
  }

  update(dt, now) {
    if (this.downed) return;
    let dx = 0, dy = 0;
    const kb = this.controls;
    if (Input.keys[kb.up])    dy -= 1;
    if (Input.keys[kb.down])  dy += 1;
    if (Input.keys[kb.left])  dx -= 1;
    if (Input.keys[kb.right]) dx += 1;

    const sticks = this.controlId === 'p1' && Gamepad.connected ? Gamepad.pollSticks() : null;
    const gx = sticks ? sticks.lx : 0;
    const gy = sticks ? sticks.ly : 0;
    const tx = Input.touchMoveX || 0;
    const ty = Input.touchMoveY || 0;
    const hasTouchMove = this.controlId === 'p1' && (Math.abs(tx) > 0.08 || Math.abs(ty) > 0.08);
    const hasGamepadMove = Math.abs(gx) > 0.01 || Math.abs(gy) > 0.01;
    const rageMul = (now < this.rageUntil) ? 1.3 : 1.0;

    if (this.isDashing(now)) {
      const s = dt / 1000;
      this.x += this.dashVx * s;
      this.y += this.dashVy * s;
      Game.clampPlayer(this);
    } else if (hasTouchMove) {
      const mag = Math.min(1, Math.hypot(tx, ty));
      const len = Math.hypot(tx, ty) || 1;
      const step = this.speed * rageMul * mag * (dt / 16.6);
      this.x += (tx / len) * step;
      this.y += (ty / len) * step;
      Game.clampPlayer(this);
    } else if (hasGamepadMove) {
      const mag = Math.min(1, Math.hypot(gx, gy));
      const len = Math.hypot(gx, gy) || 1;
      const step = this.speed * rageMul * mag * (dt / 16.6);
      this.x += (gx / len) * step;
      this.y += (gy / len) * step;
      Game.clampPlayer(this);
    } else {
      if (dx && dy) { dx *= 0.707; dy *= 0.707; }
      const step = this.speed * rageMul * (dt / 16.6);
      this.x += dx * step;
      this.y += dy * step;
      Game.clampPlayer(this);
    }

    let usingGamepadAim = false;
    if (sticks && (Math.abs(sticks.rx) > 0.15 || Math.abs(sticks.ry) > 0.15)) {
      const targetAng = Math.atan2(sticks.ry, sticks.rx);
      let diff = targetAng - this._lastAimAngle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this._lastAimAngle += diff * Gamepad.aimSmoothing;
      this.aimAngle = this._lastAimAngle;
      usingGamepadAim = true;
    }

    if (!usingGamepadAim) {
      const canvas = document.getElementById('game');
      const rect = canvas.getBoundingClientRect();
      const hasMouse = Input._mx !== undefined && Input._my !== undefined;
      if (this.controlId === 'p1' && hasMouse) {
        const mouseX = Input._mx * (CFG.W / rect.width);
        const mouseY = Input._my * (CFG.H / rect.height);
        const dxm = mouseX - this.x, dym = mouseY - this.y;
        if (Math.hypot(dxm, dym) > 4) {
          this.aimAngle = Math.atan2(dym, dxm);
          this._lastAimAngle = this.aimAngle;
        }
      }
      if (!hasMouse && hasTouchMove) {
        this.aimAngle = Math.atan2(ty, tx);
        this._lastAimAngle = this.aimAngle;
      }
    }

    const autoTarget = this.findNearestTarget();
    this.autoTarget = autoTarget;
    if (autoTarget) {
      this.autoAngle = Math.atan2(autoTarget.y - this.y, autoTarget.x - this.x);
    } else {
      this.autoAngle = this.aimAngle;
    }
    if (this.controlId === 'p2' && autoTarget) this.aimAngle = this.autoAngle;
    this.angle = autoTarget ? this.autoAngle : this.aimAngle;

    if (autoTarget && this.basicReady(now)) {
      this.tryBasic(now);
    }

    if (Input.keys[kb.dash] || (this.controlId === 'p1' && Input.touchButtons.dash)) this.tryDash(now);
    if (Input.keys[kb.block] || (this.controlId === 'p1' && Input.touchButtons.block)) this.tryBlock(now);
    if (Input.keys[kb.melee] || (this.controlId === 'p1' && Input.touchButtons.melee)) this.tryMelee(now);
    if (Input.keys[kb.long] || (this.controlId === 'p1' && Input.touchButtons.long)) this.tryLong(now);
    if (Input.keys[kb.basic] || (this.controlId === 'p1' && (Input.mouseDown || Input.touchButtons.basic))) {
      this.tryBasicManual(now);
    }
    if (this.controlId === 'p1' && Input.touchButtons.interact && Game.battleActive && !Game.paused) {
      Input.touchButtons.interact = false;
      Game.tryInteract();
    }

    if (this.controlId === 'p1' && Gamepad.connected) {
      const M = Gamepad.MAPPING;
      if (Gamepad.justPressed(M.dash) || Gamepad.justPressed(M.dashAlt)) this.tryDash(now);
      if (Gamepad.justPressed(M.block)) this.tryBlock(now);
      if (Gamepad.justPressed(M.melee)) {
        const nearStall = Game._nearestStall(this);
        const nearChest = Game._nearestChest(this);
        const r = Game.currentRoom;
        const gachaNear = r && r.type === 'upgrade' && r.gachaMachine &&
          Math.hypot(this.x - r.gachaMachine.x, this.y - r.gachaMachine.y) < r.gachaMachine.radius + this.size;
        if (nearStall || nearChest || gachaNear) {
          Game.tryInteract();
        } else {
          this.tryMelee(now);
        }
      }
      if (Gamepad.justPressed(M.long))  this.tryLong(now);
      if (Gamepad.isDown(M.basic) || Gamepad.isDown(M.basicAlt)) this.tryBasicManual(now);

      if (Gamepad.justPressed(12)) { const s = UI.getConsumableSlots(); if (s[0]) Game.useConsumable(s[0].id, this); }
      if (Gamepad.justPressed(15)) { const s = UI.getConsumableSlots(); if (s[1]) Game.useConsumable(s[1].id, this); }
      if (Gamepad.justPressed(13)) { const s = UI.getConsumableSlots(); if (s[2]) Game.useConsumable(s[2].id, this); }
      if (Gamepad.justPressed(14)) { const s = UI.getConsumableSlots(); if (s[3]) Game.useConsumable(s[3].id, this); }
    }

    if (this.controlId === 'p2') {
      if (Input.keys[kb.interact]) Game.tryRevive(this);
      for (let i = 0; i < kb.consumables.length; i++) {
        if (Input.keys[kb.consumables[i]]) {
          const slots = UI.getConsumableSlots();
          if (slots[i]) Game.useConsumable(slots[i].id, this);
        }
      }
    }

    if (this.hitFlash > 0) this.hitFlash--;
  }

  findNearestTarget() {
    let nearest = null, bestD = this.range ** 2;
    for (const e of Game.enemies) {
      if (e.dead) continue;
      const d = (e.x-this.x)**2 + (e.y-this.y)**2;
      if (d < bestD) { bestD = d; nearest = e; }
    }
    if (Game.boss && !Game.boss.dead) {
      const d = (Game.boss.x-this.x)**2 + (Game.boss.y-this.y)**2;
      if (d < bestD) return Game.boss;
    }
    return nearest;
  }

  takeDamage(amount) {
    if (this.downed) return;
    const now = performance.now();
    if (now < this.invulnUntil) return;
    if (this.isBlocking(now)) {
      const reduced = Math.max(0, amount * (1 - CFG.BLOCK.damageReduction));
      if (reduced <= 0) {
        Game.spawnParticles(this.x, this.y, '#7dffff', 10);
        Audio2.beep(960, 0.06, 0.14);
        return;
      }
      amount = reduced;
    }
    if (now < this.shieldUntil && !(Game.floorChallenge?.apply?.blockShield)) {
      Audio2.beep(880, 0.08, 0.15);
      Gamepad.rumble(1.0, 260);
      return;
    }
    let finalAmount = amount * (this._challengeTakenMul || 1);
    const reduced = Math.max(1, finalAmount - this.def);
    this.hp -= reduced;
    this.invulnUntil = now + CFG.PLAYER.invulnTime;
    this.hitFlash = 12;
    Audio2.hurt();
    Gamepad.rumble(1.0, 320);
    UI.updateHud();
    if (this.hp <= 0) {
      if (this.hasRevive && !this.reviveUsed) {
        this.reviveUsed = true;
        this.hp = Math.floor(this.maxHp * this.revivePct);
        this.invulnUntil = now + 2000;
        Game.spawnParticles(this.x, this.y, '#ffd54f', 40);
        UI.toast('ðŸ’  Â¡REVIVES!', 'gold');
        Gamepad.rumble(1.0, 400);
        UI.updateHud();
        return;
      }
      this.hp = 0;
      this.downed = true;
      Game.onPlayerDown(this);
    }
  }

  draw(ctx, now) {
    if (this.downed) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('âš°', this.x, this.y);
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(this.controlId === 'p2' ? 'P2 CAÃDO Â· 9' : 'P1 CAÃDO Â· E', this.x, this.y - 25);
      ctx.restore();
      return;
    }
    const blink = now < this.invulnUntil && Math.floor(now / 60) % 2 === 0;
    const dashing = this.isDashing(now);
    const meleeActive = this.isMeleeActive(now);
    const shielded = now < this.shieldUntil;
    const raging = now < this.rageUntil;
    const blocking = this.isBlocking(now);

    if (blocking) {
      ctx.save();
      ctx.strokeStyle = '#7dffff';
      ctx.shadowColor = '#7dffff';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 12, this.meleeAngle - Math.PI * 0.48, this.meleeAngle + Math.PI * 0.48);
      ctx.stroke();
      ctx.restore();
    }

    if (meleeActive) {
      const pct = (this.meleeActiveUntil - now) / CFG.MELEE.activeTime;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.meleeAngle);
      const halfArc = (CFG.MELEE.arc * (1 + this.meleeArcBonus)) / 2;
      ctx.strokeStyle = `rgba(255, 213, 79, ${pct})`;
      ctx.lineWidth = 8 * pct;
      ctx.shadowColor = '#ffd54f';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(0, 0, CFG.MELEE.range * (1 - pct * 0.25), -halfArc, halfArc);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 213, 79, ${pct * 0.15})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, CFG.MELEE.range, -halfArc, halfArc);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    if (shielded && !(Game.floorChallenge?.apply?.blockShield)) {
      ctx.save();
      const t = now * 0.005;
      ctx.strokeStyle = `rgba(123, 255, 159, ${0.7 + Math.sin(t)*0.2})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#7bff9f';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 10, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    if (raging) {
      ctx.save();
      const t = now * 0.008;
      ctx.strokeStyle = `rgba(255, 61, 113, ${0.5 + Math.sin(t)*0.3})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -t * 20;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 6, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    const aura = ctx.createRadialGradient(this.x, this.y, 4, this.x, this.y, 36);
    aura.addColorStop(0, dashing ? 'rgba(255,213,79,0.6)' : 'rgba(0,229,255,0.35)');
    aura.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(this.x, this.y, 36, 0, Math.PI*2); ctx.fill();

    const aimLen = 45;
    const aimX = this.x + Math.cos(this.aimAngle) * (this.size + aimLen);
    const aimY = this.y + Math.sin(this.aimAngle) * (this.size + aimLen);
    const aimStartX = this.x + Math.cos(this.aimAngle) * (this.size + 4);
    const aimStartY = this.y + Math.sin(this.aimAngle) * (this.size + 4);

    ctx.save();
    ctx.strokeStyle = dashing ? '#ffd54f' : '#4dffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + Math.cos(this.angle) * (this.size + 6),
               this.y + Math.sin(this.angle) * (this.size + 6));
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(aimStartX, aimStartY);
    ctx.lineTo(aimX, aimY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.translate(aimX, aimY);
    ctx.rotate(this.aimAngle);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.7)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-11, -5);
    ctx.lineTo(-11, 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (PlayerCustomization.draw(ctx, this)) {
      ctx.strokeStyle = dashing ? '#ffd54f' : '#4dffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 2, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    ctx.fillStyle = blink ? '#fff'
      : (dashing ? '#ffd54f'
      : (this.hitFlash > 0 ? '#ff3d71'
      : (raging ? '#ff8ab0' : '#00e5ff')));
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI*2); ctx.fill();
  }
}

/* ================================================================
   ENEMY
   ================================================================ */


/* ===== enemy.js ===== */
class Enemy {
  constructor(x, y, typeKey, floor = 1, diffMul = 1) {
    const def = ENEMY_TYPES[typeKey];
    this.typeKey = typeKey;
    this.def = def;
    this.x = x; this.y = y;
    this.size = def.size;
    this.floor = floor;

    const floorHpMul    = Math.pow(1.30, floor - 1);
    const floorDmgMul   = Math.pow(1.22, floor - 1);
    const floorSpeedMul = Math.min(2.0, 1 + (floor - 1) * 0.06);

    const baseHp = def.baseHp * floorHpMul * diffMul;
    let baseSpeed = (def.speed + floor * 0.02) * floorSpeedMul;
    let baseDmg = (def.damage + floor * 0.6) * floorDmgMul;

    // Reto del piso: mutadores sobre enemigos
    const c = Game.floorChallenge ? Game.floorChallenge.apply : null;
    const chamber = Game.currentRoom && Game.currentRoom.challenge;
    if (c) {
      if (c.enemyHpMul)    this.maxHp = Math.round(baseHp * c.enemyHpMul);
      else                 this.maxHp = Math.round(baseHp);
      if (c.enemySpeedMul) baseSpeed *= c.enemySpeedMul;
      if (c.enemyDmgMul)   baseDmg   *= c.enemyDmgMul;
    } else {
      this.maxHp = Math.round(baseHp);
    }
    if (chamber && chamber.enemySpeedMul) baseSpeed *= chamber.enemySpeedMul;
    this.hp = this.maxHp;
    this.speed = baseSpeed;
    this.damage = baseDmg;

    this.dead = false;
    this.hitFlash = 0;
    this.isElite = !!def.elite;
    this.isMinion = false;
    this.slowUntil = 0;
    this.kbVx = 0;
    this.kbVy = 0;
    this.lastShot = 0;
    this.burstQueue = [];
    this.lastReposition = 0;
    this.shootAngle = 0;
    this.attackReadyAt = 0;
    this.attackWindupUntil = 0;

    if (this.isElite && floor >= 4) {
      this.maxHp = Math.round(this.maxHp * (1 + (floor - 3) * 0.10));
      this.hp = this.maxHp;
    }
  }
  update(dt, now) {
    if (this.dead) return;
    const p = Game.nearestPlayer(this.x, this.y);
    if (!p) return;

    if (Math.abs(this.kbVx) > 0.1 || Math.abs(this.kbVy) > 0.1) {
      this.x += this.kbVx;
      this.y += this.kbVy;
      this.kbVx *= 0.82; this.kbVy *= 0.82;
    }

    const dx = p.x - this.x, dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx);

    const slowed = this.slowUntil && now < this.slowUntil;
    const speedMul = slowed ? 0.4 : 1.0;
    const berserkMul = this.def.behavior === 'melee_berserk' && this.hp / this.maxHp < 0.5
      ? (this.def.berserkSpeed || 1.3) : 1;
    const step = this.speed * speedMul * berserkMul * (dt / 16.6);

    let nx = this.x;
    let ny = this.y;

    if (this.def.behavior === 'chase') {
      nx += Math.cos(ang) * step;
      ny += Math.sin(ang) * step;
    } else if (this.def.behavior.startsWith('melee_') || this.def.behavior === 'melee_spin') {
      if (dist > (this.def.attackRadius || 80) * 0.72) {
        nx += Math.cos(ang) * step;
        ny += Math.sin(ang) * step;
      }
      if (dist <= (this.def.attackRadius || 80) && now >= this.attackReadyAt) {
        this.attackReadyAt = now + (this.def.attackRate || 3000);
        this.attackWindupUntil = now + 280;
        this.fireMeleePulse(ang);
      }
    } else if (this.def.behavior.startsWith('ranged_') ||
               this.def.behavior === 'shoot_slow' || this.def.behavior === 'shoot_burst' ||
               this.def.behavior === 'shoot_volley' || this.def.behavior === 'shoot_homing' ||
               this.def.behavior === 'shoot_orbit') {
      const keep = this.def.keepDist || 200;
      if (dist > keep + 40) {
        nx += Math.cos(ang) * step;
        ny += Math.sin(ang) * step;
      } else if (dist < keep - 40) {
        nx -= Math.cos(ang) * step;
        ny -= Math.sin(ang) * step;
      } else if ((this.def.behavior === 'ranged_burst' || this.def.behavior === 'shoot_burst') &&
                 now - this.lastReposition > (this.def.repositionRate || 1500)) {
        this.lastReposition = now;
        const side = Math.random() < 0.5 ? 1 : -1;
        const perpAng = ang + Math.PI / 2 * side;
        nx += Math.cos(perpAng) * step * 3;
        ny += Math.sin(perpAng) * step * 3;
      }

      const rateMul = Math.max(0.5, 1 - (this.floor - 1) * 0.05);
      if (now - this.lastShot > this.def.shootRate * rateMul) {
        this.lastShot = now;
        if (this.def.behavior === 'ranged_single' || this.def.behavior === 'ranged_slow' || this.def.behavior === 'shoot_slow') {
          this.fireOne(ang);
        } else if (this.def.behavior === 'ranged_burst' || this.def.behavior === 'shoot_burst') {
          for (let i = 0; i < this.def.burstCount; i++) {
            this.burstQueue.push({ delay: i * this.def.burstDelay, ang });
          }
        } else {
          this.firePattern(ang);
        }
      }
      for (let i = this.burstQueue.length - 1; i >= 0; i--) {
        const b = this.burstQueue[i];
        b.delay -= dt;
        if (b.delay <= 0) {
          this.fireOne(b.ang);
          this.burstQueue.splice(i, 1);
        }
      }
    }

    if (!Game.enemyCollides(this, nx, ny)) {
      this.x = nx;
      this.y = ny;
    } else {
      if (!Game.enemyCollides(this, nx, this.y)) this.x = nx;
      else if (!Game.enemyCollides(this, this.x, ny)) this.y = ny;
    }

    this.x = Util.clamp(this.x, CFG.WALL + this.size, CFG.W - CFG.WALL - this.size);
    this.y = Util.clamp(this.y, CFG.WALL + this.size, CFG.H - CFG.WALL - this.size);

    if (!this.def.behavior.startsWith('melee_') && this.def.behavior !== 'melee_spin' &&
        Util.circleCollide(this, p, this.size, p.size)) {
      p.takeDamage(this.damage);
    }
    if (this.hitFlash > 0) this.hitFlash--;
  }
  fireMeleePulse(ang) {
    const radius = this.def.attackRadius || 80;
    const pulseCount = this.def.pulseCount || 1;
    if (this.def.behavior === 'melee_assassin' || this.def.behavior === 'melee_charge' || this.def.lunge) {
      const distance = this.def.chargeDistance || this.def.lungeDistance || 34;
      this.x += Math.cos(ang) * Math.min(distance, radius * 0.55);
      this.y += Math.sin(ang) * Math.min(distance, radius * 0.55);
    }
    Game.spawnParticles(this.x, this.y, this.def.color, this.isElite ? 16 : 9);
    for (const p of Game.activePlayers()) {
      if (!p.downed && Util.dist(this, p) <= radius + p.size) p.takeDamage(this.damage);
    }
    if (pulseCount > 1) {
      for (let i = 1; i < pulseCount; i++) {
        Game.projectiles.push({
          x: this.x, y: this.y,
          vx: Math.cos(i * Math.PI * 2 / pulseCount) * 2.8,
          vy: Math.sin(i * Math.PI * 2 / pulseCount) * 2.8,
          dmg: this.damage * 0.45, crit:false, size:5, life:500,
          dead:false, color:this.def.color, fromBoss:true, kind:'basic',
        });
      }
    }
  }
  firePattern(ang) {
    const count = this.def.volleyCount || this.def.orbCount || 1;
    if (this.def.behavior === 'ranged_homing' || this.def.behavior === 'shoot_homing') {
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * 0.13;
        this.fireOne(ang + offset, true);
      }
      return;
    }
    if (this.def.behavior === 'ranged_slow') {
      this.fireOne(ang);
      if (count > 1) {
        for (let i = 1; i < count; i++) this.fireOne(ang + (i % 2 ? 0.18 : -0.18), false, 0.75);
      }
      return;
    }
    if (this.def.behavior === 'shoot_orbit') {
      for (let i = 0; i < count; i++) {
        this.fireOne(ang + (i * Math.PI * 2 / count), false, 0.7);
      }
      return;
    }
    const spread = this.def.volleySpread || 0.14;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spread;
      this.fireOne(ang + offset);
    }
  }
  fireOne(ang, homing = false, speedMul = 1) {
    const spd = this.def.shootSpeed || 3.5;
    const dmg = (this.def.shootDamage || 5) * (Game.coop ? 1.6 : 1);
    const floorSpeedMul = Math.min(1.5, 1 + (this.floor - 1) * 0.04);
    const floorDmgMul = 1 + (this.floor - 1) * 0.10;
    Game.projectiles.push({
      x: this.x, y: this.y,
      vx: Math.cos(ang) * spd * floorSpeedMul * speedMul,
      vy: Math.sin(ang) * spd * floorSpeedMul * speedMul,
      dmg: dmg * floorDmgMul, crit: false, size: 6,
      life: 1400, dead: false,
      color: this.typeKey === 'ranged_elite' ? '#7dffff' : '#b48aff',
      fromBoss: true,
      slowDuration: this.def.slowDuration || 0,
      homing,
    });
  }
  takeDamage(amount, crit, options = {}) {
    const now = performance.now();
    const p = Game.nearestPlayer(this.x, this.y);

    let finalAmount = amount;
    if (p && p.executeThreshold > 0 && this.hp / this.maxHp < p.executeThreshold) {
      finalAmount *= 1.3;
    }

    this.hp -= finalAmount;
    this.hitFlash = 6;

    if (options.slowDuration) {
      const slowBonus = (Game.floorChallenge?.apply?.slowBonus) || 1;
      this.slowUntil = Math.max(this.slowUntil, now + options.slowDuration * slowBonus);
    }

    Game.damageNumbers.push({ x:this.x, y:this.y, value:Math.round(finalAmount), crit, life:700, maxLife:700 });

    if (p && p.lifesteal > 0 && finalAmount > 0) {
      const heal = finalAmount * p.lifesteal;
      p.hp = Math.min(p.maxHp, p.hp + heal);
    }

    if (this.hp <= 0) {
      this.dead = true;
      Game.spawnParticles(this.x, this.y, this.def.color, this.isElite ? 14 : 8);
      Game.run.kills++;
      const goldMul = (Game.floorChallenge?.apply?.goldMul) || 1;
      const gained = Math.round((this.isElite ? 6 : 2) * goldMul);
      Game.run.coins += gained;
      save.totalKills++;
      Audio2.hit();
      Gamepad.rumble(0.25, 50);
      UI.updateHud();
      UI.checkAchievements();
      Game.grantXp(this.isElite ? 5 : 2);
    }
  }
  draw(ctx, now) {
    const slowed = this.slowUntil && now < this.slowUntil;
    if (this.isElite) {
      const aura = ctx.createRadialGradient(this.x, this.y, this.size, this.x, this.y, this.size + 14);
      aura.addColorStop(0, this.def.color + 'aa');
      aura.addColorStop(1, this.def.color + '00');
      ctx.fillStyle = aura;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size + 14, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = this.hitFlash > 0 ? '#fff'
      : slowed ? '#7dffff'
      : this.def.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(this.x - 4, this.y - 2, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(this.x + 4, this.y - 2, 2, 0, Math.PI*2); ctx.fill();
    ctx.font = `${Math.floor(this.size * 1.1)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.def.icon, this.x, this.y + 1);
    if (this.hp < this.maxHp) {
      const w = this.size * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(this.x - w/2, this.y - this.size - 10, w, 3);
      ctx.fillStyle = this.isElite ? '#ffd54f' : this.def.color;
      ctx.fillRect(this.x - w/2, this.y - this.size - 10, w * (this.hp / this.maxHp), 3);
    }
  }
}

/* ================================================================
   BOSS
   ================================================================ */


/* ===== boss.js ===== */
const BOSS_PATTERN_WEIGHTS = {
  fan: 20, spiral: 15, charge: 15, ring: 12, wall: 10, homing: 10, slam: 10, circle: 8,
};

class Boss {
  constructor(floor) {
    const def = BOSS_TYPES[(floor - 1) % BOSS_TYPES.length];
    this.def = def;
    this.name = def.name;
    this.icon = def.icon;
    const hpScale = Math.pow(1.18, floor - 1);
    this.maxHp = Math.round(def.hp * hpScale * (Game.coop ? 1.6 : 1));
    this.hp = this.maxHp;
    this.x = CFG.W / 2; this.y = 150;
    this.size = 40;
    this.speed = def.speed;
    this.atkRate = def.atkRate / Math.min(2.5, Math.pow(1.10, floor - 1));
    this.lastAttack = 0;
    this.nextAttackDelay = Util.rand(600, 1200);
    this.lastMinion = 0;
    this.allPatterns = def.patterns;
    this.currentPattern = Util.pick(this.allPatterns);
    this.dead = false;
    this.hitFlash = 0;
    this.spiralAngle = 0;
    this.timeAlive = 0;
    this.spawnDelay = 800;
    this.chargeVx = 0; this.chargeVy = 0;
    this.charging = false;
    this.slowUntil = 0;
    this.floor = floor;
  }

  choosePattern() {
    const available = this.allPatterns;
    const weights = available.map(p => BOSS_PATTERN_WEIGHTS[p] || 10);
    let next = Util.weightedPick(available, weights);
    if (next === this.currentPattern && available.length > 1) {
      next = Util.weightedPick(available, weights);
    }
    this.currentPattern = next;
  }

  update(dt, now) {
    if (this.dead) return;
    this.timeAlive += dt;
    if (this.hitFlash > 0) this.hitFlash--;

    const slowed = this.slowUntil && now < this.slowUntil;
    const speedMul = slowed ? 0.4 : 1.0;

    if (this.charging) {
      const nx = this.x + this.chargeVx * (dt / 16.6) * speedMul;
      const ny = this.y + this.chargeVy * (dt / 16.6) * speedMul;
      if (!Game.enemyCollides(this, nx, ny)) {
        this.x = nx; this.y = ny;
      } else {
        this.charging = false;
        this.chargeVx = 0; this.chargeVy = 0;
        UI.toast('ðŸ’¥ Â¡El jefe choca contra el muro!', 'gold');
      }
      this.chargeVx *= 0.94; this.chargeVy *= 0.94;
      if (Math.abs(this.chargeVx) < 0.5 && Math.abs(this.chargeVy) < 0.5) {
        this.charging = false; this.chargeVx = 0; this.chargeVy = 0;
      }
      this.x = Util.clamp(this.x, CFG.WALL + this.size, CFG.W - CFG.WALL - this.size);
      this.y = Util.clamp(this.y, CFG.WALL + this.size, CFG.H - CFG.WALL - this.size);
    } else {
      const nx = CFG.W/2 + Math.cos(this.timeAlive * 0.001 * speedMul) * 240;
      const ny = 150 + Math.sin(this.timeAlive * 0.002 * speedMul) * 40;
      if (!Game.enemyCollides(this, nx, ny)) {
        this.x = nx; this.y = ny;
      }
    }

    if (this.timeAlive < this.spawnDelay) return;

    const rate = this.atkRate * (this.hp / this.maxHp < 0.4 ? 0.7 : 1);
    if (now - this.lastAttack > rate) {
      this.choosePattern();
      this.attack();
      this.lastAttack = now;
      this.nextAttackDelay = Util.rand(400, 1400);
      this.atkRate = rate + this.nextAttackDelay;
    }
    if (now - this.lastMinion > 6000) {
      this.summonMinions();
      this.lastMinion = now;
    }
  }

  summonMinions() {
    const count = this.def.minionCount;
    const pool = ['melee_basic', 'ranged_basic'];
    if (this.def.hp > 800) pool.push('melee_elite', 'ranged_elite');
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = Util.clamp(this.x + Math.cos(a) * 180, CFG.WALL+40, CFG.W-CFG.WALL-40);
      const y = Util.clamp(this.y + Math.sin(a) * 180, CFG.WALL+40, CFG.H-CFG.WALL-40);
      const typeKey = Util.pick(pool);
      const e = new Enemy(x, y, typeKey, Game.floor, Game.diffMul());
      e.isMinion = true;
      Game.enemies.push(e);
    }
    UI.toast('âš  El jefe invoca minions', 'danger');
  }

  attack() {
    const p = Game.nearestPlayer(this.x, this.y);
    if (!p) return;
    const aim = Math.atan2(p.y - this.y, p.x - this.x);
    const pat = this.currentPattern;
    const projDmg = 10 * (1 + (this.floor - 1) * 0.08) * (Game.coop ? 1.6 : 1);
    const spawn = (a, spd, color, homing=false) => {
      Game.projectiles.push({
        x:this.x, y:this.y,
        vx:Math.cos(a)*spd, vy:Math.sin(a)*spd,
        dmg:projDmg, crit:false, size:6,
        life:1400, dead:false, color, fromBoss:true, homing,
      });
    };
    switch (pat) {
      case 'fan': {
        const n = Util.randInt(3, 6);
        const spread = Util.rand(0.12, 0.28);
        for (let i = 0; i < n; i++) spawn(aim + (i - (n-1)/2) * spread, Util.rand(4, 5.5), '#4dffff');
        break;
      }
      if (Game.coop && (pat === 'fan' || pat === 'homing' || pat === 'charge')) {
        const secondary = Game.activePlayers().find(candidate => candidate !== p && !candidate.downed);
        if (secondary) {
          const secondaryAim = Math.atan2(secondary.y - this.y, secondary.x - this.x);
          spawn(secondaryAim, 4.6, '#ff3d71', pat === 'homing');
        }
      }
      case 'circle': {
        const n = Util.randInt(16, 24);
        for (let i = 0; i < n; i++) spawn((i/n)*Math.PI*2, Util.rand(3.3, 4.2), '#ffd54f');
        break;
      }
      case 'charge': {
        this.chargeVx = Math.cos(aim) * Util.rand(12, 16);
        this.chargeVy = Math.sin(aim) * Util.rand(12, 16);
        this.charging = true;
        UI.toast('âš  Â¡Embestida!', 'danger');
        break;
      }
      case 'spiral': {
        this.spiralAngle += Util.rand(0.25, 0.5);
        const arms = Util.randInt(3, 5);
        for (let i=0;i<arms;i++) spawn(this.spiralAngle + i*(Math.PI*2/arms), Util.rand(2.8, 3.8), '#7b61ff');
        break;
      }
      case 'wall': {
        const n = 14, gap = Util.randInt(0,n-1);
        for (let i=0;i<n;i++){ if(i===gap||i===(gap+1)%n) continue; spawn((i/n)*Math.PI*2, Util.rand(2.8, 3.6), '#b2ebf2'); }
        break;
      }
      case 'ring': {
        const n = Util.randInt(10, 16);
        for (let i=0;i<n;i++) spawn((i/n)*Math.PI*2, Util.rand(3.5, 4.5), '#00e5ff');
        break;
      }
      case 'homing': {
        const n = Util.randInt(2, 4);
        for (let i=0;i<n;i++) spawn(aim + (i - n/2) * 0.2, Util.rand(2.8, 3.4), '#ff3d71', true);
        break;
      }
      case 'slam': {
        const n = Util.randInt(6, 10);
        for (let i = 0; i < n; i++) spawn((i/n)*Math.PI*2, Util.rand(2.2, 2.8), '#ff3d71');
        UI.toast('âš  Â¡Golpe de Ã¡rea!', 'danger');
        break;
      }
    }
    Audio2.beep(180, 0.06, 0.12);
  }

  takeDamage(amount, crit, options = {}) {
    this.hp -= amount;
    this.hitFlash = 6;
    if (options.slowDuration) {
      const slowBonus = (Game.floorChallenge?.apply?.slowBonus) || 1;
      this.slowUntil = Math.max(this.slowUntil, performance.now() + options.slowDuration * slowBonus);
    }
    Game.damageNumbers.push({ x:this.x, y:this.y, value:Math.round(amount), crit, life:700, maxLife:700 });
    UI.updateHud();
    if (this.hp <= 0) { this.hp = 0; this.dead = true; Game.bossDefeated(); }
  }

  draw(ctx, now) {
    const slowed = this.slowUntil && now < this.slowUntil;
    const aura = ctx.createRadialGradient(this.x, this.y, 10, this.x, this.y, 100);
    aura.addColorStop(0, slowed ? 'rgba(125,255,255,0.5)' : 'rgba(255,61,113,0.4)');
    aura.addColorStop(1, 'rgba(255,61,113,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(this.x, this.y, 100, 0, Math.PI*2); ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.timeAlive * 0.001);
    ctx.strokeStyle = this.hitFlash > 0 ? '#fff'
      : slowed ? '#7dffff'
      : (this.charging ? '#ffd54f' : '#ff3d71');
    ctx.lineWidth = 3;
    ctx.shadowColor = slowed ? '#7dffff' : (this.charging ? '#ffd54f' : '#ff3d71');
    ctx.shadowBlur = 20;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * this.size;
      const py = Math.sin(a) * this.size;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = slowed ? 'rgba(125,255,255,0.2)'
      : (this.charging ? 'rgba(255,213,79,0.3)' : 'rgba(255,61,113,0.2)');
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.font = `${this.size}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.icon, this.x, this.y);
  }
}

/* ================================================================
   ROOM
   ================================================================ */


/* ===== room.js ===== */
class Room {
  constructor(type = 'combat') {
    this.type = type;
    this.cleared = false;
    this.visited = false;
    this.enemies = [];
    this.obstacles = [];
    this.neighbors = { up:null, down:null, left:null, right:null };
    this.boss = null;
    this.looted = false;
    this.shopped = false;
    this.upgraded = false;

    this.stalls = [];
    this.stallStock = {};
    this.purchased = {};

    this.chests = [];

    this.gachaUsed = false;
    this.gachaPity = 0;
    this.gachaMachine = null;
    this.challenge = null;
    this.challengeRewarded = false;
  }

  spawnEnemies(floorNum, diffMul) {
    this.enemies = [];
    if (this.type !== 'combat' && this.type !== 'challenge') return;
    const baseMin = 3;
    const baseMax = 6;
    const extraPerFloor = Math.floor((floorNum - 1) * 0.5);
    let count = Util.randInt(baseMin + extraPerFloor, baseMax + extraPerFloor);
    if (Game.coop) count = Math.round(count * 1.75);

    // Reto del piso: multiplicador de cantidad
    const c = Game.floorChallenge ? Game.floorChallenge.apply : null;
    const chamber = this.challenge;
    if (c && c.enemyCountMul) {
      count = Math.round(count * c.enemyCountMul);
    }
    if (chamber && chamber.enemyCountMul) count = Math.round(count * chamber.enemyCountMul);

    const newMelee = ['frostling','ice_hound','shard_knight','rime_brute','void_reaver'];
    const newRanged = ['frost_archer','crystal_sentinel','dusk_witch','storm_ranger','bone_sniper'];
    const types = ['melee_basic', 'melee_basic', 'ranged_basic', 'ranged_basic'];
    for (const key of newMelee) {
      types.push(key, key);
      if (floorNum >= 3) types.push(`${key}_elite`);
      if (floorNum >= 6) types.push(`${key}_elite`);
    }
    for (const key of newRanged) {
      types.push(key, key);
      if (floorNum >= 3) types.push(`${key}_elite`);
      if (floorNum >= 6) types.push(`${key}_elite`);
    }
    if (floorNum >= 3) types.push('melee_elite');
    if (floorNum >= 5) types.push('ranged_elite');
    if (chamber && chamber.meleeEliteBias) {
      types.length = 0;
      for (const key of newMelee) {
        types.push(floorNum >= 3 ? `${key}_elite` : key, key);
      }
    } else if (chamber && chamber.rangedEliteBias) {
      types.length = 0;
      for (const key of newRanged) {
        types.push(floorNum >= 3 ? `${key}_elite` : key, key);
      }
    }

    for (let i = 0; i < count; i++) {
      const ex = Util.rand(CFG.WALL + 60, CFG.W - CFG.WALL - 60);
      const ey = Util.rand(CFG.WALL + 60, CFG.H - CFG.WALL - 60);
      const typeKey = Util.pick(types);
      this.enemies.push(new Enemy(ex, ey, typeKey, floorNum, diffMul));
    }
  }

  spawnObstacles() {
    this.obstacles = [];
    if (this.type === 'start' || this.type === 'shop' || this.type === 'chest' || this.type === 'upgrade') return;
    const n = Util.randInt(Game.coop ? 4 : 2, Game.coop ? 6 : 4);
    for (let i = 0; i < n; i++) {
      const w = Util.randInt(50, 90);
      const h = Util.randInt(40, 70);
      let x = Util.rand(CFG.WALL + 40, CFG.W - CFG.WALL - 40 - w);
      let y = Util.rand(CFG.WALL + 40, CFG.H - CFG.WALL - 40 - h);
      if (Game.coop && i > 0 && i % 2 === 1) {
        const pair = this.obstacles[i - 1];
        x = CFG.W - pair.x - pair.w;
        y = pair.y;
      }
      const kinds = ['rock', 'ice_block', 'crystal'];
      const kind = Util.pick(kinds);
      const maxHp = kind === 'rock' ? 60 : kind === 'ice_block' ? 40 : 90;
      this.obstacles.push({
        x, y, w, h,
        hp: maxHp,
        maxHp: maxHp,
        kind: kind,
        hitFlash: 0,
      });
    }
  }

  spawnStalls(floorNum = Game.floor) {
    this.stalls = [];
    if (this.type !== 'shop' && this.type !== 'survival') return;
    const positions = [
      { x: 190, y: 170 }, { x: 480, y: 170 }, { x: 770, y: 170 },
      { x: 190, y: 460 }, { x: 480, y: 460 }, { x: 770, y: 460 },
    ];
    const picked = Util.shuffle([...SHOP_STALLS]).slice(0, 6);
    for (let i = 0; i < picked.length; i++) {
      const def = picked[i];
      const pos = positions[i];
      this.stalls.push({
        ...def,
        x: pos.x,
        y: pos.y,
        radius: 46,
        pulse: Math.random() * Math.PI * 2,
      });
    }
    this.stallStock = {};
    const maxRarityIndex = Math.min(3, Math.floor((floorNum - 1) / 2) + 1);
    const rarityIndex = { common: 0, rare: 1, epic: 2, legend: 3 };
    const allItems = [...ITEMS_DB, ...CONSUMABLES_DB];
    for (const stall of this.stalls) {
      const pool = allItems.filter(item => {
        if (!stall.stock.includes(item.id)) return false;
        return rarityIndex[item.rarity] <= maxRarityIndex;
      });
      const fallback = allItems.filter(item => stall.stock.includes(item.id));
      const source = pool.length >= 3 ? pool : fallback;
      const stockSize = Math.min(source.length, 2 + Math.min(3, Math.floor(floorNum / 2)));
      const ids = Util.shuffle([...source]).slice(0, stockSize);
      this.stallStock[stall.id] = ids.map(item => ({
        ...item,
        _kind: CONSUMABLES_DB.includes(item) ? 'consumable' : 'permanent',
      }));
    }
    this.shopRollFloor = floorNum;
    this.shopRollId = `${floorNum}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  spawnChests() {
    this.chests = [];
    if (this.type !== 'chest') return;
    const positions = [
      { x: CFG.W/2 - 220, y: CFG.H/2 },
      { x: CFG.W/2,       y: CFG.H/2 },
      { x: CFG.W/2 + 220, y: CFG.H/2 },
    ];
    const allItems = Util.shuffle([...ITEMS_DB]);
    const pools = Util.shuffle([
      allItems.filter(i => i.rarity === 'common' || i.rarity === 'rare'),
      allItems.filter(i => i.rarity === 'rare'   || i.rarity === 'epic'),
      allItems.filter(i => i.rarity === 'epic'   || i.rarity === 'legend'),
    ]);
    for (let i = 0; i < 3; i++) {
      const pool = pools[i].length > 0 ? pools[i] : allItems;
      const choices = Util.shuffle([...pool]).slice(0, 3);
      this.chests.push({
        x: positions[i].x,
        y: positions[i].y,
        radius: 44,
        opened: false,
        choices,
        label: 'Cofre Misterioso',
      });
    }
  }

  spawnGacha() {
    if (this.type !== 'upgrade') return;
    this.gachaMachine = {
      x: CFG.W / 2,
      y: CFG.H / 2 - 30,
      radius: 60,
    };
  }
}

/* ================================================================
   GAME
   ================================================================ */


/* ===== game.js ===== */
