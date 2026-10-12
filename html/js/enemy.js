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
