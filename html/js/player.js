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
        UI.toast('💠 ¡REVIVES!', 'gold');
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
      ctx.fillText('⚰', this.x, this.y);
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(this.controlId === 'p2' ? 'P2 CAÍDO · 9' : 'P1 CAÍDO · E', this.x, this.y - 25);
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
