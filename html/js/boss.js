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
        UI.toast('💥 ¡El jefe choca contra el muro!', 'gold');
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
    UI.toast('⚠ El jefe invoca minions', 'danger');
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
        UI.toast('⚠ ¡Embestida!', 'danger');
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
        UI.toast('⚠ ¡Golpe de área!', 'danger');
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
