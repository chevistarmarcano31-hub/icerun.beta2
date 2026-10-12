const Game = {
  canvas: null, ctx: null, minimap: null, minimapCtx: null,
  player: null,
  players: [],
  coop: false,
  enemies: [], projectiles: [], particles: [], damageNumbers: [],
  rooms: null, currentRoom: null, roomPos: { x:0, y:0 },
  floor: 1,
  running: false, battleActive: false, paused: false,
  lastTime: 0,
  boss: null,
  endless: false,
  survivalMode: false,
  survivalHorde: 0,
  survivalBreak: false,
  survivalBreakUntil: 0,
  survivalNextHordeAt: 0,
  bossUnlocked: false,
  run: null,
  floorChallenge: null, // 🗺️ Reto activo del piso

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.minimap = document.getElementById('minimap');
    this.minimapCtx = this.minimap.getContext('2d');
    Input.init();
    this._installMouseTracking();
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  },

  _installMouseTracking() {
    const canvas = this.canvas;
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      Input._mx = e.clientX - rect.left;
      Input._my = e.clientY - rect.top;
    });
    canvas.addEventListener('mouseleave', () => {
      Input._mx = undefined;
      Input._my = undefined;
    });
  },

  diffMul() {
    const d = save.options.difficulty;
    const base = d === 'hard' ? 1.25 : d === 'insane' ? 1.5 : 1.0;
    return base * (this.coop ? 1.6 : 1);
  },

  activePlayers() {
    return this.players.length ? this.players : (this.player ? [this.player] : []);
  },

  nearestPlayer(x, y, includeDowned = false) {
    let target = null;
    let best = Infinity;
    for (const p of this.activePlayers()) {
      if (!includeDowned && p.downed) continue;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < best) { best = d; target = p; }
    }
    return target;
  },

  rebuildPlayers(keepHp = true) {
    this.players = this.activePlayers().map((old, index) => {
      const hpRatio = keepHp && old.maxHp ? old.hp / old.maxHp : 1;
      const next = new Player(this.buildStats(), old.controlId || (index ? 'p2' : 'p1'));
      next.x = old.x; next.y = old.y;
      next.hp = Math.round(next.maxHp * hpRatio);
      next.downed = old.downed;
      return next;
    });
    this.player = this.players[0] || null;
  },

  _freshRun() {
    return {
      coins:0, kills:0, roomsCleared:0, items:[], upgrades:{}, consumables:{},
      level: 1,
      xp: 0,
      xpToNext: this.coop ? 28 : 20,
      levelPerks: {
        atk: 0, def: 0, maxHp: 0, speed: 0, crit: 0, atkSpeed: 0, range: 0,
        lifesteal: 0, cooldownMul: 1, meleeArcBonus: 0, extraBasicProj: 0,
        executeThreshold: 0, revive: false, revivePct: 0.3, fanBasic: 0,
      },
      revivesUsed: 0,
    };
  },

  startRun(endless = false, coop = this.coop, survival = false) {
    Audio2.init();
    this.endless = endless;
    this.coop = !!coop;
    this.survivalMode = !!survival;
    this.floor = 1;
    this.run = this._freshRun();
    this.boss = null;
    this.bossUnlocked = false;

    if (!this.survivalMode) this._rollFloorChallenge();
    else this.floorChallenge = null;

    this.players = [new Player(this.buildStats(), 'p1')];
    if (this.coop) this.players.push(new Player(this.buildStats(), 'p2'));
    this.player = this.players[0];
    if (this.survivalMode) this.generateSurvivalArena();
    else this.generateFloor();
    this.running = true;
    this.battleActive = true;
    this.paused = false;
    save.totalRuns++;
    Save.write();
    UI.show('battle');
    UI.updateHud();
    UI.updateConsumableBar();
    UI.updateXpBar();
    UI.updateChallengeBadge();
    UI.checkAchievements();
    UI.toast(this.survivalMode ? '⚔ Modo Supervivencia iniciado' : endless ? '∞ Endless iniciado' : '❄ Piso 1 iniciado', 'gold');
    Gamepad.rumble(0.4, 120);

    // Toast del reto
    if (this.floorChallenge) {
      setTimeout(() => {
        UI.toast(`${this.floorChallenge.icon} RETO: ${this.floorChallenge.name}`, 'challenge');
        Audio2.challenge();
      }, 500);
    }
  },

  generateSurvivalArena() {
    this.floor = 1;
    this.rooms = [[new Room('survival')]];
    this.roomPos = { x: 0, y: 0 };
    this.currentRoom = this.rooms[0][0];
    this.currentRoom.visited = true;
    this.currentRoom.cleared = false;
    this.currentRoom.spawnObstacles();
    this.currentRoom.spawnStalls(this.floor);
    this.survivalHorde = 0;
    this.survivalBreak = false;
    this.survivalBreakUntil = 0;
    this.spawnSurvivalHorde();
    this.enterRoom(0, 0);
  },

  spawnSurvivalHorde() {
    const r = this.currentRoom;
    if (!r || !this.survivalMode) return;
    this.survivalHorde++;
    r.cleared = false;
    const count = Math.min(42, 4 + Math.floor(this.survivalHorde * 1.4));
    const pool = ['melee_basic', 'ranged_basic'];
    if (this.survivalHorde >= 3) pool.push('frostling', 'ice_hound', 'frost_archer');
    if (this.survivalHorde >= 6) pool.push('melee_elite', 'ranged_elite', 'shard_knight', 'crystal_sentinel');
    if (this.survivalHorde >= 10) pool.push('rime_brute', 'void_reaver', 'dusk_witch', 'storm_ranger');
    const diff = this.diffMul() * (1 + this.survivalHorde * 0.12);
    r.enemies = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Util.rand(210, 280);
      const x = Util.clamp(CFG.W / 2 + Math.cos(angle) * radius, CFG.WALL + 40, CFG.W - CFG.WALL - 40);
      const y = Util.clamp(CFG.H / 2 + Math.sin(angle) * radius, CFG.WALL + 40, CFG.H - CFG.WALL - 40);
      r.enemies.push(new Enemy(x, y, Util.pick(pool), this.survivalHorde, diff));
    }
    this.enemies = r.enemies.slice();
    this.projectiles = [];
    UI.toast(`⚔ Horda ${this.survivalHorde} · ${count} enemigos`, 'danger');
  },

  /* 🗺️ Elige un reto aleatorio para el piso actual */
  _rollFloorChallenge() {
    // No repetir el mismo reto que el piso anterior
    const previousId = this.floorChallenge ? this.floorChallenge.id : null;
    let pool = FLOOR_CHALLENGES.filter(c => c.id !== previousId);
    if (pool.length === 0) pool = FLOOR_CHALLENGES;
    this.floorChallenge = Util.pick(pool);
    console.log(`🗺️ Reto del piso ${this.floor}:`, this.floorChallenge.name);
  },

  buildStats() {
    const stats = {
      maxHp: CFG.PLAYER.hp,
      speed: CFG.PLAYER.speed,
      atk: CFG.PLAYER.atk,
      def: CFG.PLAYER.def,
      atkSpeed: CFG.PLAYER.atkSpeed,
      crit: CFG.PLAYER.crit,
      range: CFG.PLAYER.range,
    };
    stats.atk   += (save.upgrades.atk   || 0) * 2;
    stats.def   += (save.upgrades.def   || 0) * 2;
    stats.maxHp += (save.upgrades.maxHp || 0) * 5;
    stats.speed += (save.upgrades.speed || 0) * 0.15;
    stats.crit  += (save.upgrades.crit  || 0) * 0.02;

    for (const id of this.run.items) {
      const item = ITEMS_DB.find(i => i.id === id);
      if (!item) continue;
      const mult = RARITY[item.rarity].statMul;
      for (const [k, v] of Object.entries(item.stats)) {
        if (k === 'speed' || k === 'atkSpeed') stats[k] *= (1 + v);
        else stats[k] += v * mult;
      }
    }
    for (const syn of SYNERGIES) {
      if (syn.ids.every(id => this.run.items.includes(id))) {
        for (const [k, v] of Object.entries(syn.bonus)) {
          if (k === 'speed' || k === 'atkSpeed') stats[k] *= (1 + v);
          else stats[k] += v;
        }
      }
    }
    for (const [k, lvl] of Object.entries(this.run.upgrades)) {
      if (k === 'atk')    stats.atk   += lvl * 3;
      if (k === 'def')    stats.def   += lvl * 2;
      if (k === 'maxHp')  stats.maxHp += lvl * 10;
      if (k === 'speed')  stats.speed += lvl * 0.2;
      if (k === 'crit')   stats.crit  += lvl * 0.03;
      if (k === '_raw_speed')    stats.speed    += lvl;
      if (k === '_raw_atkSpeed') stats.atkSpeed += lvl;
      if (k === '_raw_crit')     stats.crit     += lvl;
      if (k === '_raw_atk')      stats.atk      += lvl;
      if (k === '_raw_def')      stats.def      += lvl;
      if (k === '_raw_maxHp')    stats.maxHp    += lvl;
    }

    const lp = this.run.levelPerks || {};
    stats.atk       += lp.atk || 0;
    stats.def       += lp.def || 0;
    stats.maxHp     += lp.maxHp || 0;
    stats.speed     += lp.speed || 0;
    stats.crit      += lp.crit || 0;
    if (lp.atkSpeed) stats.atkSpeed *= (1 + lp.atkSpeed);
    stats.range     += lp.range || 0;

    stats.atkSpeed = Math.max(120, stats.atkSpeed);

    stats._lifesteal        = lp.lifesteal || 0;
    stats._cooldownMul      = lp.cooldownMul || 1;
    stats._meleeArcBonus    = lp.meleeArcBonus || 0;
    stats._extraBasicProj   = lp.extraBasicProj || 0;
    stats._executeThreshold = lp.executeThreshold || 0;
    stats._revive           = lp.revive || false;
    stats._revivePct        = lp.revivePct || 0.3;
    stats._fanBasic         = lp.fanBasic || 0;
    return stats;
  },

  generateFloor() {
    const size = 5;
    this.rooms = [];
    for (let y = 0; y < size; y++) this.rooms[y] = new Array(size).fill(null);
    const startX = Math.floor(size/2), startY = Math.floor(size/2);
    this.rooms[startY][startX] = new Room('start');
    let cx = startX, cy = startY;
    const targetRooms = Util.randInt(this.coop ? 23 : 20, 25);
    let created = 1;
    const dirs = [
      { dx:0, dy:-1, key:'up',    opposite:'down'  },
      { dx:0, dy:1,  key:'down',  opposite:'up'    },
      { dx:-1, dy:0, key:'left',  opposite:'right' },
      { dx:1, dy:0,  key:'right', opposite:'left'  },
    ];
    let safety = 8000;
    while (created < targetRooms && safety-- > 0) {
      const d = Util.pick(dirs);
      const nx = cx + d.dx, ny = cy + d.dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      if (this.rooms[ny][nx]) {
        if (!this.rooms[cy][cx].neighbors[d.key]) {
          this.rooms[cy][cx].neighbors[d.key] = { x:nx, y:ny };
          this.rooms[ny][nx].neighbors[d.opposite] = { x:cx, y:cy };
        }
        cx = nx; cy = ny; continue;
      }
      this.rooms[ny][nx] = new Room('combat');
      this.rooms[cy][cx].neighbors[d.key] = { x:nx, y:ny };
      this.rooms[ny][nx].neighbors[d.opposite] = { x:cx, y:cy };
      cx = nx; cy = ny; created++;
    }
    const allRooms = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
      if (this.rooms[y][x] && !(x === startX && y === startY))
        allRooms.push({ x, y, room: this.rooms[y][x] });
    Util.shuffle(allRooms);
    if (allRooms[0]) allRooms[0].room.type = 'chest';
    if (allRooms[1]) allRooms[1].room.type = 'shop';
    if (allRooms[2]) allRooms[2].room.type = 'upgrade';
    const challengeRoom = allRooms.find(r => r.room.type === 'combat');
    if (challengeRoom) {
      challengeRoom.room.type = 'challenge';
      challengeRoom.room.challenge = Util.pick(CHALLENGE_ROOMS);
    }
    let bossPos = null, bossDist = -1;
    for (const r of allRooms) {
      if (r.room.type !== 'combat') continue;
      const dist = Math.abs(r.x - startX) + Math.abs(r.y - startY);
      if (dist > bossDist) { bossDist = dist; bossPos = r; }
    }
    if (bossPos) bossPos.room.type = 'boss';
    const dMul = this.diffMul();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const r = this.rooms[y][x];
      if (!r) continue;
      this.currentRoom = r;
      r.spawnObstacles();
      r.spawnEnemies(this.floor, dMul);
      r.spawnStalls();
      r.spawnChests();
      r.spawnGacha();
      if (r.type === 'start') r.cleared = true;
    }
    this.bossUnlocked = false;
    this.enterRoom(startX, startY);
  },

  enterRoom(x, y) {
    const r = this.rooms[y][x];
    if (!r) return;

    if (r.type === 'boss' && !this.bossUnlocked) {
      UI.showBossLockMessage();
      return;
    }

    const firstVisit = !r.visited;
    this.currentRoom = r;
    this.roomPos = { x, y };
    if (r.type === 'shop' && r.shopRollFloor !== this.floor) {
      r.spawnStalls(this.floor);
    }
    this.enemies = r.enemies.slice();
    this.projectiles = [];
    this.particles = [];
    this.damageNumbers = [];
    r.visited = true;
    this.activePlayers().forEach((p, index) => {
      p.x = CFG.W / 2 + (index ? 42 : -42);
      p.y = CFG.H - 100;
      p.downed = false;
    });
    if (r.type === 'boss' && !r.boss) {
      r.boss = new Boss(this.floor);
      this.boss = r.boss;
      UI.toast('⚔ ¡JEFE!', 'danger');
      Gamepad.rumble(0.8, 250);
    } else if (r.type === 'boss') {
      this.boss = r.boss;
    } else {
      this.boss = null;
    }
    if (r.type === 'shop' || r.type === 'chest' || r.type === 'upgrade') {
      if (r.enemies.length === 0 && !r.cleared) {
        r.cleared = true;
        this.run.roomsCleared++;
        this.checkBossUnlock();
      }
    }
    if (r.type === 'challenge' && r.enemies.length === 0 && !r.cleared) {
      r.cleared = true;
      this.run.roomsCleared++;
      if (!r.challengeRewarded) {
        r.challengeRewarded = true;
        this.run.coins += r.challenge.rewardCoins || 0;
        UI.toast(`${r.challenge.icon} Cámara superada: +${r.challenge.rewardCoins || 0} monedas`, 'gold');
      }
      this.checkBossUnlock();
    }
    if (r.type === 'challenge' && r.challenge && firstVisit) {
      UI.toast(`${r.challenge.icon} ${r.challenge.name}: ${r.challenge.desc}`, 'challenge');
    }
    UI.updateHud();
  },

  checkBossUnlock() {
    if (!this.rooms) return;
    let allCleared = true;
    for (let y = 0; y < this.rooms.length; y++) {
      for (let x = 0; x < this.rooms.length; x++) {
        const r = this.rooms[y][x];
        if (!r) continue;
        if (r.type === 'boss') continue;
        if (!r.cleared) { allCleared = false; break; }
      }
      if (!allCleared) break;
    }
    if (allCleared && !this.bossUnlocked) {
      this.bossUnlocked = true;
      UI.toast('🔓 ¡La cámara del JEFE se ha desbloqueado!', 'gold');
      Gamepad.rumble(0.6, 200);
    }
  },

  grantXp(amount) {
    const r = this.run;
    // 🔥 XP reducida en pisos altos para hacer el farmeo más duro
    const floorDecay = Math.max(0.4, 1 - (this.floor - 1) * 0.06);
    const finalAmount = Math.max(1, Math.round(amount * floorDecay));
    r.xp += finalAmount;
    while (r.xp >= r.xpToNext) {
      r.xp -= r.xpToNext;
      this._levelUp();
    }
    UI.updateXpBar();
    if (r.level > (save.bestLevelReached || 1)) {
      save.bestLevelReached = r.level;
      Save.write();
    }
    UI.checkAchievements();
  },

  _levelUp() {
    const r = this.run;
    r.level++;
    // 🔥 Curva más agresiva: 20 × 1.45^(nivel-1)
    r.xpToNext = Math.round((this.coop ? 28 : 20) * Math.pow(1.45, r.level - 1));
    UI.toast(`⭐ ¡NIVEL ${r.level}!`, 'gold');
    Audio2.levelUp();
    Gamepad.rumble(0.6, 180);
    this.paused = true;
    UI.showLevelUp(this._pickLevelUpChoices(3));
  },

  _pickLevelUpChoices(count = 3) {
    const level = this.run.level;
    const available = LEVELUP_POOL.filter(u => !u.minLevel || level >= u.minLevel);
    const weightFor = (r) => {
      switch (r) {
        case 'common': return 70;
        case 'rare':   return 22;
        case 'epic':   return 6;
        case 'legend': return 1;
        default: return 10;
      }
    };
    const chosen = [];
    const poolCopy = [...available];
    for (let i = 0; i < count && poolCopy.length > 0; i++) {
      const totalW = poolCopy.reduce((s, u) => s + weightFor(u.rarity), 0);
      let roll = Math.random() * totalW;
      let pickedIdx = 0;
      for (let j = 0; j < poolCopy.length; j++) {
        roll -= weightFor(poolCopy[j].rarity);
        if (roll <= 0) { pickedIdx = j; break; }
      }
      chosen.push(poolCopy[pickedIdx]);
      poolCopy.splice(pickedIdx, 1);
    }
    return chosen;
  },

  applyLevelUpPerk(perk) {
    const lp = this.run.levelPerks;
    if (perk.apply) {
      for (const [k, v] of Object.entries(perk.apply)) {
        if (k === 'atkSpeed') lp.atkSpeed = (lp.atkSpeed || 0) + v;
        else lp[k] = (lp[k] || 0) + v;
      }
    }
    if (perk.lifesteal)        lp.lifesteal = (lp.lifesteal || 0) + perk.lifesteal;
    if (perk.cooldownMul)      lp.cooldownMul = (lp.cooldownMul || 1) * perk.cooldownMul;
    if (perk.meleeArcBonus)    lp.meleeArcBonus = (lp.meleeArcBonus || 0) + perk.meleeArcBonus;
    if (perk.extraBasicProj)   lp.extraBasicProj = (lp.extraBasicProj || 0) + perk.extraBasicProj;
    if (perk.executeThreshold) lp.executeThreshold = Math.max(lp.executeThreshold || 0, perk.executeThreshold);
    if (perk.revive) {
      lp.revive = true;
      if (perk.revivePct) lp.revivePct = perk.revivePct;
    }
    if (perk.fanBasic)         lp.fanBasic = Math.max(lp.fanBasic || 0, perk.fanBasic);

    this.rebuildPlayers(true);

    if (perk.healPct) {
      const blockHeal = Game.floorChallenge?.apply?.blockHeal;
      if (!blockHeal) {
        const heal = Math.round(this.player.maxHp * perk.healPct);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
        this.damageNumbers.push({ x:this.player.x, y:this.player.y - 20, value:'+'+heal, crit:false, life:1000, maxLife:1000, color:'#7bff9f' });
      }
    }

    this.paused = false;
    UI.updateHud();
    UI.updateXpBar();
    UI.toast(`⭐ ${perk.name}`, 'gold');
  },

  projHitsObstacle(proj) {
    const r = this.currentRoom;
    if (!r) return false;
    for (const o of r.obstacles) {
      if (o.hp <= 0) continue;
      if (Util.pointInRect(proj.x, proj.y, o)) return true;
    }
    return false;
  },

  enemyCollides(entity, nx, ny) {
    const r = this.currentRoom;
    if (!r) return false;
    const size = entity.size;
    if (nx - size < CFG.WALL || nx + size > CFG.W - CFG.WALL) return true;
    if (ny - size < CFG.WALL || ny + size > CFG.H - CFG.WALL) return true;
    for (const o of r.obstacles) {
      if (o.hp <= 0) continue;
      const closest = {
        x: Util.clamp(nx, o.x, o.x + o.w),
        y: Util.clamp(ny, o.y, o.y + o.h),
      };
      const dx = nx - closest.x, dy = ny - closest.y;
      if (dx * dx + dy * dy < size * size) return true;
    }
    for (const e of this.enemies) {
      if (e === entity) continue;
      if (e.dead) continue;
      const dx = nx - e.x, dy = ny - e.y;
      const minDist = size + e.size - 4;
      if (dx * dx + dy * dy < minDist * minDist) return true;
    }
    return false;
  },

  damageObstacle(obstacle, amount) {
    if (obstacle.hp <= 0) return;
    obstacle.hp -= amount;
    obstacle.hitFlash = 8;
    const cx = obstacle.x + obstacle.w / 2;
    const cy = obstacle.y + obstacle.h / 2;
    const color = obstacle.kind === 'rock' ? '#8a9ab0'
                : obstacle.kind === 'ice_block' ? '#7dffff'
                : '#ff9b3d';
    this.spawnParticles(cx, cy, color, 4);

    if (obstacle.hp <= 0) {
      let coins = 0;
      if (obstacle.kind === 'rock')           coins = Util.randInt(3, 6);
      else if (obstacle.kind === 'ice_block') coins = Util.randInt(2, 5);
      else if (obstacle.kind === 'crystal')   coins = Util.randInt(8, 14);
      const goldMul = (Game.floorChallenge?.apply?.goldMul) || 1;
      coins = Math.round(coins * goldMul);
      this.run.coins += coins;
      save.totalObstaclesDestroyed = (save.totalObstaclesDestroyed || 0) + 1;
      Save.write();
      this.spawnParticles(cx, cy, color, 20);
      this.spawnParticles(cx, cy, '#ffd54f', 12);
      this.damageNumbers.push({
        x: cx, y: cy - 10,
        value: `◆ +${coins}`,
        crit: true,
        life: 1100, maxLife: 1100,
        color: '#ffd54f',
      });
      Audio2.explosion();
      Audio2.beep(1200, 0.08, 0.1);
      Gamepad.rumble(0.5, 130);
      UI.toast(`◆ +${coins} monedas`, 'gold');
      UI.updateHud();
      UI.checkAchievements();
    }
  },

  clampPlayer(p) {
    const r = this.currentRoom;
    if (!r) return;
    for (const o of r.obstacles) {
      if (o.hp <= 0) continue;
      const closest = {
        x: Util.clamp(p.x, o.x, o.x + o.w),
        y: Util.clamp(p.y, o.y, o.y + o.h),
      };
      if (Util.circleCollide(p, closest, p.size, 0)) {
        const ang = Math.atan2(p.y - closest.y, p.x - closest.x);
        p.x = closest.x + Math.cos(ang) * p.size;
        p.y = closest.y + Math.sin(ang) * p.size;
      }
    }

    if (r.type === 'shop' && r.stalls) {
      for (const s of r.stalls) {
        const d = Math.hypot(p.x - s.x, p.y - s.y);
        const minD = s.radius + p.size * 0.4;
        if (d < minD && d > 0.001) {
          const ang = Math.atan2(p.y - s.y, p.x - s.x);
          p.x = s.x + Math.cos(ang) * minD;
          p.y = s.y + Math.sin(ang) * minD;
        }
      }
    }

    if (r.type === 'chest' && r.chests) {
      for (const c of r.chests) {
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        const minD = c.radius + p.size * 0.4;
        if (d < minD && d > 0.001) {
          const ang = Math.atan2(p.y - c.y, p.x - c.x);
          p.x = c.x + Math.cos(ang) * minD;
          p.y = c.y + Math.sin(ang) * minD;
        }
      }
    }

    if (r.type === 'upgrade' && r.gachaMachine) {
      const m = r.gachaMachine;
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      const minD = m.radius + p.size * 0.4;
      if (d < minD && d > 0.001) {
        const ang = Math.atan2(p.y - m.y, p.x - m.x);
        p.x = m.x + Math.cos(ang) * minD;
        p.y = m.y + Math.sin(ang) * minD;
      }
    }

    const inDoorX = Math.abs(p.x - CFG.W/2) < CFG.DOOR_W/2;
    const inDoorY = Math.abs(p.y - CFG.H/2) < CFG.DOOR_W/2;
    const canPass = r.cleared;

    const canGoTo = (target) => {
      if (!target) return false;
      const tr = this.rooms[target.y][target.x];
      if (!tr) return false;
      if (tr.type === 'boss' && !this.bossUnlocked) {
        UI.showBossLockMessage();
        return false;
      }
      return true;
    };

    if (p.y < CFG.WALL) {
      if (inDoorX && canPass && canGoTo(r.neighbors.up)) {
        this.enterRoom(r.neighbors.up.x, r.neighbors.up.y); return;
      }
      p.y = CFG.WALL;
    }
    if (p.y > CFG.H - CFG.WALL) {
      if (inDoorX && canPass && canGoTo(r.neighbors.down)) {
        this.enterRoom(r.neighbors.down.x, r.neighbors.down.y); return;
      }
      p.y = CFG.H - CFG.WALL;
    }
    if (p.x < CFG.WALL) {
      if (inDoorY && canPass && canGoTo(r.neighbors.left)) {
        this.enterRoom(r.neighbors.left.x, r.neighbors.left.y); return;
      }
      p.x = CFG.WALL;
    }
    if (p.x > CFG.W - CFG.WALL) {
      if (inDoorY && canPass && canGoTo(r.neighbors.right)) {
        this.enterRoom(r.neighbors.right.x, r.neighbors.right.y); return;
      }
      p.x = CFG.W - CFG.WALL;
    }
    p.x = Util.clamp(p.x, p.size, CFG.W - p.size);
    p.y = Util.clamp(p.y, p.size, CFG.H - p.size);
  },

  tryInteract() {
    const r = this.currentRoom;
    const p = this.player;
    if (!r || !p) return;
    if (this.tryRevive(p)) return;

    if (r.type === 'shop' || (this.survivalMode && this.survivalBreak)) {
      const near = this._nearestStall(p);
      if (near) { this.openStall(near); return; }
    }
    if (r.type === 'chest') {
      const near = this._nearestChest(p);
      if (near && !near.opened) { this.openChestChoice(near); return; }
    }
    if (r.type === 'upgrade' && r.gachaMachine) {
      const d = Math.hypot(p.x - r.gachaMachine.x, p.y - r.gachaMachine.y);
      if (d < r.gachaMachine.radius + p.size) { this.openGacha(); return; }
    }
  },

  onPlayerDown(player) {
    UI.toast(`${player.controlId === 'p2' ? 'P2' : 'P1'} ha caído — acércate y pulsa E/9 para revivir`, 'danger');
    if (this.activePlayers().every(p => p.downed)) this.gameOver();
    UI.updateHud();
  },

  tryRevive(reviver) {
    if (!this.coop || reviver.downed) return false;
    const target = this.activePlayers().find(p => p !== reviver && p.downed &&
      Math.hypot(p.x - reviver.x, p.y - reviver.y) < 58);
    if (!target) return false;
    target.downed = false;
    target.hp = Math.max(1, Math.round(target.maxHp * 0.35));
    target.invulnUntil = performance.now() + 1500;
    this.spawnParticles(target.x, target.y, '#7bff9f', 30);
    UI.toast(`${target.controlId === 'p2' ? 'P2' : 'P1'} revivido`, 'gold');
    UI.updateHud();
    return true;
  },

  _nearestStall(p) {
    const r = this.currentRoom;
    if (!r || !r.stalls) return null;
    let best = null, bestD = Infinity;
    for (const s of r.stalls) {
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d < s.radius + p.size && d < bestD) { bestD = d; best = s; }
    }
    return best;
  },

  _nearestChest(p) {
    const r = this.currentRoom;
    if (!r || !r.chests) return null;
    let best = null, bestD = Infinity;
    for (const c of r.chests) {
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < c.radius + p.size && d < bestD) { bestD = d; best = c; }
    }
    return best;
  },

  openStall(stall) {
    this.paused = true;
    const r = this.currentRoom;
    const stock = r.stallStock[stall.id] || [];
    const purchasable = stock.filter(item => {
      if (item._kind === 'consumable') return true;
      return !this.run.items.includes(item.id);
    });
    UI.showStall(stall, this.run.coins, purchasable, (item) => {
      const rar = RARITY[item.rarity];
      const cost = Math.round(item.baseCost * rar.priceMul);
      if (this.run.coins < cost) return false;
      if (item._kind === 'consumable') {
        const inv = this.run.consumables || (this.run.consumables = {});
        const cur = inv[item.id] || 0;
        if (cur >= item.maxStack) return false;
        this.run.coins -= cost;
        this.addConsumable(item.id);
      } else {
        if (this.run.items.includes(item.id)) return false;
        this.run.coins -= cost;
        this.run.items.push(item.id);
        if (this.run.items.length > (save.bestItemsInRun || 0)) {
          save.bestItemsInRun = this.run.items.length;
          Save.write();
        }
      }
      UI.updateHud();
      UI.checkAchievements();
      Audio2.buy();
      return true;
    }, () => {
      this.paused = false;
    });
  },

  openChestChoice(chest) {
    this.paused = true;
    UI.showChestChoice(chest, chest.choices, (item) => {
      const r = this.currentRoom;
      for (const c of r.chests) {
        if (c === chest) c.opened = true;
        else c.opened = 'locked';
      }
      r.looted = true;
      r.cleared = true;
      this.run.items.push(item.id);
      if (this.run.items.length > (save.bestItemsInRun || 0)) {
        save.bestItemsInRun = this.run.items.length;
        Save.write();
      }
      this.rebuildPlayers(true);
      this.paused = false;
      UI.updateHud();
      UI.toast(`📦 ${item.name}`, 'gold');
      Gamepad.rumble(0.5, 150);
      UI.checkAchievements();
      this.checkBossUnlock();
    }, () => {
      this.paused = false;
    });
  },

  openGacha() {
    const r = this.currentRoom;
    if (!r) return;
    this.paused = true;
    const baseCost = 50 + this.floor * 12;
    UI.showGacha(baseCost, this.run.coins, (tier) => {
      const rolls = tier === 'multi' ? 3 : 1;
      const cost = tier === 'multi' ? Math.round(baseCost * 3 * 0.9) : baseCost;
      if (this.run.coins < cost) return false;
      this.run.coins -= cost;
      const results = [];
      for (let i = 0; i < rolls; i++) results.push(this._rollGacha());
      for (const roll of results) this._applyGacha(roll);
      save.totalGachaRolls = (save.totalGachaRolls || 0) + rolls;
      Save.write();
      UI.updateHud();
      UI.checkAchievements();
      UI.showGachaResults(results);
      return true;
    }, () => {
      this.paused = false;
    });
  },

  _rollGacha() {
    const r = this.currentRoom;
    r.gachaPity = (r.gachaPity || 0) + 1;
    let pool = GACHA_POOL;
    if (r.gachaPity >= 10) {
      pool = GACHA_POOL.filter(g => g.rarity === 'epic' || g.rarity === 'legend');
    }
    const totalWeight = pool.reduce((sum, g) => sum + g.weight, 0);
    let roll = Math.random() * totalWeight;
    let picked = pool[0];
    for (const g of pool) {
      roll -= g.weight;
      if (roll <= 0) { picked = g; break; }
    }
    if (picked.rarity === 'epic' || picked.rarity === 'legend') {
      r.gachaPity = 0;
    }
    return picked;
  },

  _applyGacha(roll) {
    const up = this.run.upgrades;
    for (const [k, v] of Object.entries(roll.apply)) {
      if (k === 'speed' || k === 'atkSpeed' || k === 'crit') {
        up['_raw_' + k] = (up['_raw_' + k] || 0) + v;
      } else {
        up[k] = (up[k] || 0) + v;
      }
    }
    this.rebuildPlayers(true);
  },

  useConsumable(id, owner = this.player) {
    const inv = this.run.consumables || {};
    if (!inv[id] || inv[id] <= 0) return false;
    const def = CONSUMABLES_DB.find(c => c.id === id);
    if (!def) return false;
    const p = owner;
    if (!p) return false;

    // Reto del piso: bloqueo de curación
    const blockHeal = Game.floorChallenge?.apply?.blockHeal;
    if (def.effect === 'heal' && blockHeal) {
      UI.toast('🚫 Curación bloqueada por el reto del piso', 'danger');
      return false;
    }

    const now = performance.now();
    switch (def.effect) {
      case 'heal': {
        const healed = Math.min(def.value, p.maxHp - p.hp);
        if (healed <= 0) { UI.toast('❤ Vida ya al máximo', 'danger'); return false; }
        p.hp = Math.min(p.maxHp, p.hp + def.value);
        this.damageNumbers.push({ x:p.x, y:p.y - 20, value:'+'+Math.round(healed), crit:false, life:900, maxLife:900, color:'#7bff9f' });
        UI.toast(`🧪 +${Math.round(healed)} HP`, 'gold');
        Audio2.consume();
        break;
      }
      case 'bomb': {
        const cx = p.x, cy = p.y;
        this.spawnParticles(cx, cy, '#7dffff', 30);
        Audio2.explosion();
        Gamepad.rumble(0.7, 150);
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = Math.hypot(e.x - cx, e.y - cy);
          if (d < def.radius + e.size) e.takeDamage(def.value, false, { slowDuration: def.slowDuration });
        }
        if (this.boss && !this.boss.dead) {
          const d = Math.hypot(this.boss.x - cx, this.boss.y - cy);
          if (d < def.radius + this.boss.size) this.boss.takeDamage(def.value, false, { slowDuration: def.slowDuration });
        }
        if (this.currentRoom) {
          for (const o of this.currentRoom.obstacles) {
            if (o.hp <= 0) continue;
            const oc = { x:o.x + o.w/2, y:o.y + o.h/2 };
            const d = Math.hypot(oc.x - cx, oc.y - cy);
            if (d < def.radius + Math.max(o.w,o.h)/2) this.damageObstacle(o, def.value);
          }
        }
        UI.toast('💣 ¡Explosión!', 'gold');
        break;
      }
      case 'shield': {
        if (Game.floorChallenge?.apply?.blockShield) {
          UI.toast('🚫 Escudos bloqueados por el reto del piso', 'danger');
          return false;
        }
        p.shieldUntil = now + def.value;
        UI.toast('🛡 Escudo activo', 'gold');
        Audio2.consume();
        break;
      }
      case 'rage': {
        p.rageUntil = now + def.value;
        UI.toast('🔥 Furia desatada', 'epic');
        Audio2.consume();
        break;
      }
      case 'timeslow': {
        for (const e of this.enemies) e.slowUntil = Math.max(e.slowUntil, now + def.value);
        if (this.boss) this.boss.slowUntil = Math.max(this.boss.slowUntil, now + def.value);
        UI.toast('⏳ Tiempo ralentizado', 'epic');
        Audio2.consume();
        break;
      }
      case 'blink': {
        const ang = p.aimAngle;
        const tx = Util.clamp(p.x + Math.cos(ang) * def.value, CFG.WALL + p.size, CFG.W - CFG.WALL - p.size);
        const ty = Util.clamp(p.y + Math.sin(ang) * def.value, CFG.WALL + p.size, CFG.H - CFG.WALL - p.size);
        this.spawnParticles(p.x, p.y, '#7b61ff', 16);
        p.x = tx; p.y = ty;
        this.spawnParticles(p.x, p.y, '#7b61ff', 16);
        UI.toast('📜 Blink', 'gold');
        Audio2.consume();
        break;
      }
      case 'magnet': {
        const bonus = 8 + this.floor * 2;
        const goldMul = (Game.floorChallenge?.apply?.goldMul) || 1;
        this.run.coins += Math.round(bonus * goldMul);
        UI.toast(`🧲 +${Math.round(bonus * goldMul)} monedas atraídas`, 'gold');
        Audio2.consume();
        UI.updateHud();
        break;
      }
    }
    inv[id]--;
    if (inv[id] <= 0) delete inv[id];
    save.totalConsumablesUsed = (save.totalConsumablesUsed || 0) + 1;
    Save.write();
    UI.updateConsumableBar();
    UI.updateAbilityCooldowns();
    UI.checkAchievements();
    return true;
  },

  addConsumable(id) {
    const def = CONSUMABLES_DB.find(c => c.id === id);
    if (!def) return false;
    const inv = this.run.consumables || (this.run.consumables = {});
    inv[id] = (inv[id] || 0) + 1;
    if (inv[id] > def.maxStack) inv[id] = def.maxStack;
    return true;
  },

  loop(now) {
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    if (Gamepad.connected && this.battleActive) {
      const M = Gamepad.MAPPING;
      if (Gamepad.justPressed(M.pause)) this.togglePause();
      if (Gamepad.justPressed(M.inventory)) {
        if (UI._invModalOpen) UI.closeInventoryModal();
        else if (!this.paused) UI.toggleInventoryModal();
      }
    }

    if (this.running && this.battleActive && !this.paused) this.update(dt, now);
    this.render(now);

    if (Gamepad.connected) {
      UI.handleGamepadMenuNav();
    }

    if (Gamepad.connected) {
      Gamepad.updateButtons();
      Gamepad.updateButtonsUI();
    }

    requestAnimationFrame(t => this.loop(t));
  },

  update(dt, now) {
    for (const p of this.activePlayers()) p.update(dt, now);

    for (const e of this.enemies) e.update(dt, now);
    this.enemies = this.enemies.filter(e => !e.dead);
    if (this.currentRoom) this.currentRoom.enemies = this.enemies;

    if (this.survivalMode) {
      if (!this.survivalBreak && this.enemies.length === 0) {
        if (this.survivalHorde > 0 && this.survivalHorde % 5 === 0 && this.survivalNextHordeAt === 0) {
          this.survivalBreak = true;
          this.survivalBreakUntil = now + 18000;
          this.currentRoom.spawnStalls(this.floor + Math.floor(this.survivalHorde / 5));
          for (const p of this.activePlayers()) {
            p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.2));
          }
          UI.toast('🛒 Descanso: tienda abierta durante 18 s', 'gold');
          UI.updateHud();
        } else if (this.survivalNextHordeAt === 0) {
          this.survivalNextHordeAt = now + 1800;
        } else if (now >= this.survivalNextHordeAt) {
          this.survivalNextHordeAt = 0;
          this.spawnSurvivalHorde();
        }
      }
      if (this.survivalBreak && now >= this.survivalBreakUntil) {
        this.survivalBreak = false;
        this.currentRoom.stalls = [];
        this.spawnSurvivalHorde();
      }
    }

    if (this.boss && !this.boss.dead) this.boss.update(dt, now);

    for (const pr of this.projectiles) {
      if (pr.dead) continue;
      const step = dt / 16.6;

      if (pr.homing && pr.fromBoss) {
        const target = this.nearestPlayer(pr.x, pr.y);
        if (!target) { pr.dead = true; continue; }
        const dx = target.x - pr.x, dy = target.y - pr.y;
        const d = Math.hypot(dx, dy) || 1;
        pr.vx += (dx/d) * 0.15;
        pr.vy += (dy/d) * 0.15;
        const sp = Math.hypot(pr.vx, pr.vy);
        if (sp > 5) { pr.vx = pr.vx/sp*5; pr.vy = pr.vy/sp*5; }
      }

      pr.x += pr.vx * step;
      pr.y += pr.vy * step;
      pr.life -= dt;

      if (pr.life <= 0) {
        if (pr.kind === 'long' && !pr._exploded) this.explodeLong(pr);
        pr.dead = true;
        continue;
      }
      if (pr.x < -50 || pr.x > CFG.W + 50 || pr.y < -50 || pr.y > CFG.H + 50) {
        pr.dead = true;
        continue;
      }

      if (this.projHitsObstacle(pr)) {
        const r = this.currentRoom;
        if (r) {
          for (const o of r.obstacles) {
            if (o.hp <= 0) continue;
            if (Util.pointInRect(pr.x, pr.y, o)) this.damageObstacle(o, pr.dmg);
          }
        }
        this.spawnParticles(pr.x, pr.y, pr.color, 5);
        if (pr.kind === 'long') this.explodeLong(pr);
        pr.dead = true;
        continue;
      }

      if (pr.fromBoss) {
        for (const p of this.activePlayers()) {
          if (p.downed || !Util.circleCollide(pr, p, pr.size, p.size)) continue;
          p.takeDamage(pr.dmg);
          if (pr.slowDuration) p.invulnUntil = Math.max(p.invulnUntil, now + pr.slowDuration);
          pr.dead = true;
          break;
        }
      } else {
        const isLong = pr.kind === 'long';
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (isLong && pr.hit.has(e)) continue;
          if (Util.circleCollide(pr, e, pr.size, e.size)) {
            e.takeDamage(pr.dmg, pr.crit, { slowDuration: pr.slowDuration });
            this.spawnParticles(pr.x, pr.y, pr.color, isLong ? 12 : 5);
            if (isLong) { pr.hit.add(e); }
            else { pr.dead = true; break; }
          }
        }
        if (!pr.dead && this.boss && !this.boss.dead && Util.circleCollide(pr, this.boss, pr.size, this.boss.size)) {
          this.boss.takeDamage(pr.dmg, pr.crit, { slowDuration: pr.slowDuration });
          this.spawnParticles(pr.x, pr.y, pr.color, isLong ? 16 : 6);
          if (isLong) this.explodeLong(pr);
          pr.dead = true;
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);

    for (const p of this.particles) {
      p.x += p.vx * (dt/16.6);
      p.y += p.vy * (dt/16.6);
      p.vx *= 0.95; p.vy *= 0.95;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    for (const d of this.damageNumbers) {
      d.y -= dt * 0.05;
      d.life -= dt;
    }
    this.damageNumbers = this.damageNumbers.filter(d => d.life > 0);

    if (!this.survivalMode && this.currentRoom && !this.currentRoom.cleared) {
      const noBoss = !this.currentRoom.boss || this.currentRoom.boss.dead;
      if (this.enemies.length === 0 && noBoss) {
        this.currentRoom.cleared = true;
        for (const p of this.activePlayers()) {
          if (p.downed) {
            p.downed = false;
            p.hp = Math.max(1, Math.round(p.maxHp * 0.35));
            p.invulnUntil = now + 1200;
          }
        }
        this.run.roomsCleared++;
        UI.toast('✓ Sala limpia — Puertas abiertas', 'gold');
        if (this.currentRoom.type === 'challenge' && !this.currentRoom.challengeRewarded) {
          this.currentRoom.challengeRewarded = true;
          const reward = this.currentRoom.challenge ? this.currentRoom.challenge.rewardCoins : 0;
          this.run.coins += reward || 0;
          UI.toast(`${this.currentRoom.challenge.icon} Recompensa de cámara: +${reward || 0} monedas`, 'gold');
        }
        UI.updateHud();
        this.checkBossUnlock();
      }
    }

    if (save.options.minimap) this.updateMinimapOpacity();
  },

  explodeLong(pr) {
    if (pr._exploded) return;
    pr._exploded = true;
    const radius = pr.explodeRadius || 120;
    const dmg = pr.explodeDamage || 20;
    Audio2.explosion();
    Gamepad.rumble(0.75, 160);
    this.spawnParticles(pr.x, pr.y, '#ff9b3d', 30);
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - pr.x, e.y - pr.y);
      if (d < radius + e.size) e.takeDamage(dmg, false, { slowDuration: pr.slowDuration });
    }
    if (this.boss && !this.boss.dead) {
      const d = Math.hypot(this.boss.x - pr.x, this.boss.y - pr.y);
      if (d < radius + this.boss.size) this.boss.takeDamage(dmg, false, { slowDuration: pr.slowDuration });
    }
    if (this.currentRoom) {
      for (const o of this.currentRoom.obstacles) {
        if (o.hp <= 0) continue;
        const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        const d = Math.hypot(cx - pr.x, cy - pr.y);
        if (d < radius + Math.max(o.w, o.h) / 2) this.damageObstacle(o, dmg);
      }
    }
  },

  updateMinimapOpacity() {
    const mm = document.getElementById('minimap');
    if (!mm || mm.classList.contains('hidden')) return;
    const r = mm.getBoundingClientRect();
    const app = document.getElementById('app').getBoundingClientRect();
    const scaleX = CFG.W / app.width;
    const scaleY = CFG.H / app.height;
    const mmX = (r.left - app.left) * scaleX;
    const mmY = (r.top - app.top) * scaleY;
    const mmW = r.width * scaleX;
    const mmH = r.height * scaleY;
    let faded = false;
    if (this.player &&
        this.player.x > mmX - 20 && this.player.x < mmX + mmW + 20 &&
        this.player.y > mmY - 20 && this.player.y < mmY + mmH + 20) faded = true;
    for (const e of this.enemies) {
      if (e.x > mmX - 10 && e.x < mmX + mmW + 10 &&
          e.y > mmY - 10 && e.y < mmY + mmH + 10) { faded = true; break; }
    }
    if (this.boss && !this.boss.dead &&
        this.boss.x > mmX - 30 && this.boss.x < mmX + mmW + 30 &&
        this.boss.y > mmY - 30 && this.boss.y < mmY + mmH + 30) faded = true;
    mm.classList.toggle('faded', faded);
  },

  renderStalls(ctx, now) {
    const r = this.currentRoom;
    if (!r || !r.stalls) return;
    const t = now * 0.001;
    const p = this.player;

    for (const stall of r.stalls) {
      const bob = Math.sin(t * 2 + stall.pulse) * 2;
      const sx = stall.x;
      const sy = stall.y + bob;

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 32, 44, 10, 0, 0, Math.PI*2);
      ctx.fill();

      ctx.save();
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = (i % 2 === 0) ? stall.color : '#ffffff';
        ctx.globalAlpha = 0.88;
        ctx.fillRect(sx - 48 + i*16, sy - 56, 16, 16);
      }
      ctx.restore();

      ctx.fillStyle = '#5a3a2a';
      ctx.fillRect(sx - 48, sy - 40, 4, 62);
      ctx.fillRect(sx + 44, sy - 40, 4, 62);

      ctx.fillStyle = '#7a5a3a';
      ctx.fillRect(sx - 50, sy + 18, 100, 14);
      ctx.fillStyle = '#5a3a2a';
      ctx.fillRect(sx - 50, sy + 28, 100, 4);

      ctx.save();
      const glow = ctx.createRadialGradient(sx, sy - 10, 6, sx, sy - 10, 70);
      glow.addColorStop(0, stall.color + '55');
      glow.addColorStop(1, stall.color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(sx, sy - 10, 70, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(sx, sy - 18 + Math.sin(t*3 + stall.pulse) * 3);
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = stall.color;
      ctx.shadowBlur = 18;
      ctx.fillText(stall.icon, 0, 0);
      ctx.restore();

      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = stall.color;
      ctx.shadowColor = stall.color;
      ctx.shadowBlur = 10;
      ctx.fillText(stall.name.toUpperCase(), sx, sy + 48);
      ctx.shadowBlur = 0;
    }

    if (p) {
      const near = this._nearestStall(p);
      if (near) {
        const pulse = 0.6 + Math.sin(t * 6) * 0.4;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e8fbff';
        ctx.strokeStyle = '#040d1a';
        ctx.lineWidth = 4;
        const txt = `[E]  ${near.name}`;
        ctx.strokeText(txt, near.x, near.y - 78);
        ctx.fillText(txt, near.x, near.y - 78);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd54f';
    ctx.shadowColor = '#ffd54f';
    ctx.shadowBlur = 18;
    ctx.fillText('🏪 MERCADILLO GLACIAL', CFG.W/2, 40);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#b2ebf2';
    ctx.shadowBlur = 6;
    ctx.fillText('Pasea por los puestos y pulsa E para comerciar', CFG.W/2, 62);
    ctx.restore();
  },

  renderChests(ctx, now) {
    const r = this.currentRoom;
    if (!r || !r.chests) return;
    const t = now * 0.001;
    const p = this.player;

    for (const c of r.chests) {
      const opened = c.opened === true;
      const locked = c.opened === 'locked';
      const bob = opened ? 0 : Math.sin(t * 2 + c.x * 0.01) * 3;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + 34 + bob, 40, 9, 0, 0, Math.PI*2);
      ctx.fill();

      let glowColor = '#7b61ff';
      if (opened) glowColor = '#ffd54f';
      if (locked) glowColor = '#3a3a3a';

      ctx.save();
      const glow = ctx.createRadialGradient(c.x, c.y + bob, 10, c.x, c.y + bob, 80);
      glow.addColorStop(0, glowColor + (opened ? 'aa' : locked ? '22' : '55'));
      glow.addColorStop(1, glowColor + '00');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(c.x, c.y + bob, 80, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(c.x, c.y + bob);
      if (locked) ctx.globalAlpha = 0.35;

      ctx.fillStyle = '#4a2a5a';
      ctx.fillRect(-30, -6, 60, 38);
      ctx.strokeStyle = '#2a1a3a';
      ctx.lineWidth = 2;
      ctx.strokeRect(-30, -6, 60, 38);

      ctx.save();
      if (opened) {
        ctx.translate(0, -6);
        ctx.rotate(-0.8);
      }
      ctx.fillStyle = '#5a3a6a';
      ctx.fillRect(-30, -22, 60, 20);
      ctx.strokeRect(-30, -22, 60, 20);
      ctx.restore();

      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(-5, 2, 10, 10);
      ctx.fillStyle = '#3a2010';
      ctx.fillRect(-2, 5, 4, 5);

      if (opened) {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✨', 0, -30);
      } else if (locked) {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🔒', 0, -30);
      } else {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('❓', 0, -30);
      }

      ctx.restore();

      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = locked ? '#7a7a7a' : (opened ? '#7bff9f' : '#b48aff');
      ctx.fillText(c.label.toUpperCase(), c.x, c.y + 58);
    }

    if (p) {
      const near = this._nearestChest(p);
      if (near && !near.opened) {
        const pulse = 0.6 + Math.sin(t * 6) * 0.4;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e8fbff';
        ctx.strokeStyle = '#040d1a';
        ctx.lineWidth = 4;
        const txt = `[E]  Abrir cofre`;
        ctx.strokeText(txt, near.x, near.y - 80);
        ctx.fillText(txt, near.x, near.y - 80);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#b48aff';
    ctx.shadowColor = '#b48aff';
    ctx.shadowBlur = 18;
    ctx.fillText('📦 SALA DE COFRES', CFG.W/2, 40);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#b2ebf2';
    ctx.shadowBlur = 6;
    ctx.fillText('Elige sabiamente — solo puedes abrir UNO', CFG.W/2, 62);
    ctx.restore();
  },

  renderGacha(ctx, now) {
    const r = this.currentRoom;
    if (!r || !r.gachaMachine) return;
    const t = now * 0.001;
    const m = r.gachaMachine;
    const p = this.player;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(m.x, m.y + 50, 70, 14, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.save();
    const hue = (t * 60) % 360;
    const glow = ctx.createRadialGradient(m.x, m.y, 10, m.x, m.y, 110);
    glow.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.35)`);
    glow.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(m.x, m.y, 110, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(m.x - 50, m.y - 10, 100, 60);
    ctx.strokeStyle = '#7b61ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(m.x - 50, m.y - 10, 100, 60);

    ctx.save();
    ctx.beginPath();
    ctx.arc(m.x, m.y - 10, 50, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(123, 97, 255, 0.25)';
    ctx.fill();
    ctx.strokeStyle = '#7b61ff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI + t * 0.5 + i;
      const rad = 24 + Math.sin(t * 2 + i) * 6;
      const bx = m.x + Math.cos(ang) * rad;
      const by = m.y - 10 - Math.abs(Math.sin(ang)) * 18;
      const col = ['#ffd54f','#7bff9f','#00e5ff','#ff9b3d','#ff3d71'][i % 5];
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(m.x + 40, m.y + 20);
    ctx.rotate(Math.sin(t * 4) * 0.15);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(-3, -22, 6, 22);
    ctx.beginPath();
    ctx.arc(0, -24, 6, 0, Math.PI*2);
    ctx.fillStyle = '#ff3d71';
    ctx.fill();
    ctx.restore();

    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7b61ff';
    ctx.shadowColor = '#7b61ff';
    ctx.shadowBlur = 15;
    ctx.fillText('🎰 GACHA', m.x, m.y + 42);
    ctx.shadowBlur = 0;

    const baseCost = 50 + Game.floor * 12;
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffd54f';
    ctx.fillText(`◆ ${baseCost} por tirada`, m.x, m.y + 58);

    if (p) {
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (d < m.radius + p.size) {
        const pulse = 0.6 + Math.sin(t * 6) * 0.4;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e8fbff';
        ctx.strokeStyle = '#040d1a';
        ctx.lineWidth = 4;
        const txt = `[E]  Girar Gacha`;
        ctx.strokeText(txt, m.x, m.y - 85);
        ctx.fillText(txt, m.x, m.y - 85);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7b61ff';
    ctx.shadowColor = '#7b61ff';
    ctx.shadowBlur = 18;
    ctx.fillText('🎰 CÁMARA GACHA', CFG.W/2, 40);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#b2ebf2';
    ctx.shadowBlur = 6;
    ctx.fillText(`Pity: ${r.gachaPity || 0}/10 — épico garantizado al llegar a 10`, CFG.W/2, 62);
    ctx.restore();
  },

  render(now) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.fillStyle = '#040d1a';
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    if (!this.currentRoom) return;

    const grad = ctx.createRadialGradient(CFG.W/2, CFG.H/2, 100, CFG.W/2, CFG.H/2, 600);
    grad.addColorStop(0, '#0a2846');
    grad.addColorStop(1, '#040d1a');
    ctx.fillStyle = grad;
    ctx.fillRect(CFG.WALL, CFG.WALL, CFG.W - CFG.WALL*2, CFG.H - CFG.WALL*2);

    ctx.strokeStyle = 'rgba(0,229,255,0.05)';
    for (let x = CFG.WALL; x < CFG.W - CFG.WALL; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, CFG.WALL); ctx.lineTo(x, CFG.H - CFG.WALL); ctx.stroke();
    }
    for (let y = CFG.WALL; y < CFG.H - CFG.WALL; y += 40) {
      ctx.beginPath(); ctx.moveTo(CFG.WALL, y); ctx.lineTo(CFG.W - CFG.WALL, y); ctx.stroke();
    }

    ctx.fillStyle = '#071a2e';
    ctx.fillRect(0, 0, CFG.W, CFG.WALL);
    ctx.fillRect(0, CFG.H - CFG.WALL, CFG.W, CFG.WALL);
    ctx.fillRect(0, 0, CFG.WALL, CFG.H);
    ctx.fillRect(CFG.W - CFG.WALL, 0, CFG.WALL, CFG.H);

    const r = this.currentRoom;
    const doorColor = r.cleared ? '#00e5ff' : '#7a2030';
    const doorGlow  = r.cleared ? 'rgba(0,229,255,0.7)' : 'rgba(255,61,113,0.5)';
    ctx.shadowColor = doorGlow; ctx.shadowBlur = 20;
    ctx.fillStyle = doorColor;
    if (r.neighbors.up)    ctx.fillRect(CFG.W/2 - CFG.DOOR_W/2, 0, CFG.DOOR_W, CFG.WALL);
    if (r.neighbors.down)  ctx.fillRect(CFG.W/2 - CFG.DOOR_W/2, CFG.H - CFG.WALL, CFG.DOOR_W, CFG.WALL);
    if (r.neighbors.left)  ctx.fillRect(0, CFG.H/2 - CFG.DOOR_W/2, CFG.WALL, CFG.DOOR_W);
    if (r.neighbors.right) ctx.fillRect(CFG.W - CFG.WALL, CFG.H/2 - CFG.DOOR_W/2, CFG.WALL, CFG.DOOR_W);
    ctx.shadowBlur = 0;

    if (!this.bossUnlocked) {
      const neighborsList = [r.neighbors.up, r.neighbors.down, r.neighbors.left, r.neighbors.right];
      for (const n of neighborsList) {
        if (!n) continue;
        const nb = this.rooms[n.y][n.x];
        if (nb && nb.type === 'boss') {
          ctx.fillStyle = 'rgba(255, 61, 113, 0.85)';
          if (r.neighbors.up === n)    ctx.fillRect(CFG.W/2 - CFG.DOOR_W/2, 0, CFG.DOOR_W, CFG.WALL);
          if (r.neighbors.down === n)  ctx.fillRect(CFG.W/2 - CFG.DOOR_W/2, CFG.H - CFG.WALL, CFG.DOOR_W, CFG.WALL);
          if (r.neighbors.left === n)  ctx.fillRect(0, CFG.H/2 - CFG.DOOR_W/2, CFG.WALL, CFG.DOOR_W);
          if (r.neighbors.right === n) ctx.fillRect(CFG.W - CFG.WALL, CFG.H/2 - CFG.DOOR_W/2, CFG.WALL, CFG.DOOR_W);
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const cx = r.neighbors.up === n || r.neighbors.down === n ? CFG.W/2 : (r.neighbors.left === n ? CFG.WALL/2 : CFG.W - CFG.WALL/2);
          const cy = r.neighbors.left === n || r.neighbors.right === n ? CFG.H/2 : (r.neighbors.up === n ? CFG.WALL/2 : CFG.H - CFG.WALL/2);
          ctx.fillText('🔒', cx, cy);
        }
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    if (r.type === 'boss')    ctx.fillText('⚔ JEFE', 40, 40);
    if (this.survivalMode) {
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(`⚔ SUPERVIVENCIA · HORDA ${this.survivalHorde}`, 40, 40);
      if (this.survivalBreak) {
        ctx.fillStyle = '#7bff9f';
        ctx.fillText(`DESCANSO · ${Math.max(0, Math.ceil((this.survivalBreakUntil - now) / 1000))} s`, 40, 62);
      }
    }
    if (r.type === 'challenge' && r.challenge) {
      ctx.fillStyle = '#ff9b3d';
      ctx.fillText(`${r.challenge.icon} ${r.challenge.name}`, 40, 40);
    }

    if (r.type === 'shop' || (r.type === 'survival' && this.survivalBreak)) this.renderStalls(ctx, now);
    if (r.type === 'chest')   this.renderChests(ctx, now);
    if (r.type === 'upgrade') this.renderGacha(ctx, now);

    for (const o of r.obstacles) {
      if (o.hp <= 0) continue;
      const color = o.kind === 'rock' ? '#3a4a5a'
                  : o.kind === 'ice_block' ? '#2a4a6a'
                  : '#5a3a2a';
      const borderColor = o.hitFlash > 0 ? '#fff'
                  : o.kind === 'rock' ? '#8a9ab0'
                  : o.kind === 'ice_block' ? '#7dffff'
                  : '#ff9b3d';
      ctx.fillStyle = o.hitFlash > 0 ? '#ffffff' : color;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x, o.y, o.w, o.h);
      ctx.lineWidth = 1;
      if (o.hp < o.maxHp) {
        const pct = o.hp / o.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(o.x, o.y - 8, o.w, 4);
        ctx.fillStyle = pct > 0.5 ? '#7bff9f' : pct > 0.25 ? '#ffd54f' : '#ff3d71';
        ctx.fillRect(o.x, o.y - 8, o.w * pct, 4);
      }
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = o.kind === 'rock' ? '🪨' : o.kind === 'ice_block' ? '🧊' : '💎';
      ctx.fillText(icon, o.x + o.w / 2, o.y + o.h / 2);
      if (o.hitFlash > 0) o.hitFlash--;
    }

    for (const e of this.enemies) e.draw(ctx, now);
    if (this.boss && !this.boss.dead) this.boss.draw(ctx, now);

    for (const pr of this.projectiles) {
      if (pr.kind === 'long') {
        ctx.save();
        ctx.shadowColor = '#ff9b3d'; ctx.shadowBlur = 25;
        ctx.fillStyle = pr.color;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.size, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.size + 4, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = pr.color;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.size, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.size * 0.4, 0, Math.PI*2); ctx.fill();
      }
    }

    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const p of this.activePlayers()) p.draw(ctx, now);

    for (const d of this.damageNumbers) {
      ctx.globalAlpha = d.life / d.maxLife;
      ctx.fillStyle = d.color || (d.crit ? '#ffd54f' : '#e8fbff');
      ctx.font = `bold ${d.crit ? 20 : 14}px monospace`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.strokeText(d.value, d.x, d.y);
      ctx.fillText(d.value, d.x, d.y);
    }
    ctx.globalAlpha = 1;

    if (save.options.minimap) this.renderMinimap();
  },

  renderMinimap() {
    const mm = this.minimapCtx;
    const w = this.minimap.width, h = this.minimap.height;
    mm.clearRect(0, 0, w, h);
    mm.fillStyle = 'rgba(4,13,26,0.85)';
    mm.fillRect(0, 0, w, h);
    mm.strokeStyle = '#00e5ff';
    mm.strokeRect(0, 0, w, h);
    if (!this.rooms) return;
    const size = this.rooms.length;
    const cell = Math.min(w, h) / (size + 1);
    const offX = (w - cell * size) / 2;
    const offY = (h - cell * size) / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const r = this.rooms[y][x];
        if (!r) continue;
        const px = offX + x * cell, py = offY + y * cell;
        if (x === this.roomPos.x && y === this.roomPos.y) mm.fillStyle = '#ffffff';
        else if (r.type === 'boss') mm.fillStyle = this.bossUnlocked ? '#ff3d71' : '#7a2030';
        else if (r.type === 'shop') mm.fillStyle = '#ffd54f';
        else if (r.type === 'chest') mm.fillStyle = '#7b61ff';
        else if (r.type === 'upgrade') mm.fillStyle = '#7bff9f';
        else if (r.type === 'challenge') mm.fillStyle = '#ff9b3d';
        else if (r.cleared) mm.fillStyle = 'rgba(0,229,255,0.3)';
        else if (r.visited) mm.fillStyle = 'rgba(0,229,255,0.6)';
        else mm.fillStyle = 'rgba(0,229,255,0.15)';
        mm.fillRect(px + 1, py + 1, cell - 2, cell - 2);
      }
    }
  },

  spawnParticles(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Util.rand(1, 4);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 300 + Math.random() * 200,
        maxLife: 500,
        color, size: 2 + Math.random() * 2,
      });
    }
  },

  bossDefeated() {
    Audio2.victory();
    Gamepad.rumble(1.0, 500);
    this.grantXp(30 + this.floor * 5);
    save.bestFloor = Math.max(save.bestFloor, this.floor);
    save.metaCoins += Math.round(this.run.coins * 0.3) + this.floor * 5;
    save.metaGems  += this.floor;
    Save.write();
    UI.checkAchievements();
    setTimeout(() => {
      const maxFloors = this.coop ? CFG.COOP_MAX_FLOORS : CFG.MAX_FLOORS;
      if (!this.endless && this.floor >= maxFloors) {
        save.totalWins = (save.totalWins || 0) + 1;
        Save.write();
        UI.checkAchievements();
        UI.showGameOver(true);
      } else {
        this.floor++;
        this.startNewFloor();
      }
    }, 1200);
  },

  startNewFloor() {
    this.run.roomsCleared = 0;
    this.boss = null;
    this.bossUnlocked = false;

    // 🗺️ Nuevo reto por piso
    this._rollFloorChallenge();

    this.rebuildPlayers(true);
    for (const p of this.activePlayers()) p.downed = false;
    this.generateFloor();
    UI.toast(`❄ Piso ${this.floor}`, 'gold');
    UI.updateHud();
    UI.updateConsumableBar();
    UI.updateXpBar();
    UI.updateChallengeBadge();
    if (this.floorChallenge) {
      setTimeout(() => {
        UI.toast(`${this.floorChallenge.icon} RETO: ${this.floorChallenge.name}`, 'challenge');
        Audio2.challenge();
      }, 500);
    }
  },

  togglePause() {
    if (!this.battleActive) return;
    if (this.paused) { this.paused = false; UI.show('battle'); }
    else { this.paused = true; UI.show('pause'); }
  },
  resume() { this.paused = false; UI.show('battle'); },
  gameOver() {
    this.battleActive = false;
    this.running = false;
    save.metaCoins += Math.round(this.run.coins * 0.15);
    Save.write();
    Gamepad.rumble(1.0, 400);
    UI.checkAchievements();
    UI.showGameOver(false);
  },
  abandon() {
    this.running = false;
    this.battleActive = false;
    this.boss = null;
    this.player = null;
    this.players = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.damageNumbers = [];
    this.floorChallenge = null;
    UI.show('lobby');
  },
};

/* ================================================================
   UI
   ================================================================ */
const UI = {
  screens: {},
  current: 'menu',
  _lastScreen: 'menu',
  _invModalOpen: false,
  _bossLockTimer: 0,
  _menuFocusIndex: 0,
  _menuNavCooldown: 0,
  _menuLastActiveOverlay: null,
  customizationPlayer: null,

  init() {
    this.screens = {
      menu:          document.getElementById('screen-menu'),
      lobby:         document.getElementById('screen-lobby'),
      options:       document.getElementById('screen-options'),
      stats:         document.getElementById('screen-stats'),
      achievements:  document.getElementById('screen-achievements'),
      shopPerm:      document.getElementById('screen-shop-perm'),
      invMeta:       document.getElementById('screen-inv-meta'),
      shop:          document.getElementById('screen-shop'),
      chest:         document.getElementById('screen-chest'),
      upgrade:       document.getElementById('screen-upgrade'),
      levelup:       document.getElementById('screen-levelup'),
      pause:         document.getElementById('screen-pause'),
      gameover:      document.getElementById('screen-gameover'),
      invModal:      document.getElementById('screen-inventory-modal'),
      customize:     document.getElementById('screen-customize'),
    };

    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => { Audio2.click(); fn(); });
    };

    bind('btn-play',    () => this.show('lobby'));
    bind('btn-survival-menu', () => Game.startRun(false, false, true));
    bind('btn-options', () => this.showOptions('menu'));
    bind('btn-stats',   () => { this.refreshStats(); this.show('stats'); });
    bind('btn-achievements', () => { this.refreshAchievements(); this.show('achievements'); });

    bind('btn-new-run',    () => Game.startRun(false, false));
    bind('btn-coop-run',   () => this.startCoopCharacterSelection());
    bind('btn-survival',   () => Game.startRun(false, false, true));
    bind('btn-endless',    () => { if (save.bestFloor >= CFG.ENDLESS_UNLOCK) Game.startRun(true); });
    bind('btn-shop-perm',  () => { this.refreshPermShop(); this.show('shopPerm'); });
    bind('btn-inv-meta',   () => { this.refreshInvMeta(); this.show('invMeta'); });
    bind('btn-customize',  () => this.openCustomization(false));
    bind('btn-select-p1', () => this.selectCustomizationPlayer('p1'));
    bind('btn-select-p2', () => this.selectCustomizationPlayer('p2'));
    bind('btn-start-coop-selected', () => {
      Game.startRun(false, true);
    });
    bind('btn-customize-back', () => {
      this.openCustomization(false);
      this.show('lobby');
    });
    bind('btn-achievements-lobby', () => { this.refreshAchievements(); this.show('achievements'); });
    bind('btn-options-lobby',() => this.showOptions('lobby'));
    bind('btn-back-menu',  () => this.show('menu'));

    bind('btn-options-back', () => this.show(this._lastScreen === 'battle' ? 'battle' : this._lastScreen));
    bind('btn-reset-keys',   () => this.resetKeys());
    bind('btn-reset-save',   () => {
      if (confirm('¿Borrar TODO el progreso?')) {
        Save.clear(); save = Save.load();
        this.refreshLobby(); this.refreshOptionsUI(); this.show('menu');
      }
    });

    bind('btn-stats-back', () => this.show('menu'));
    bind('btn-ach-back',   () => this.show(this._lastScreen === 'lobby' ? 'lobby' : 'menu'));
    bind('btn-perm-back',  () => this.show('lobby'));
    bind('btn-inv-back',   () => this.show('lobby'));

    bind('btn-resume',        () => Game.resume());
    bind('btn-options-pause', () => this.showOptions('pause'));
    bind('btn-abandon',       () => Game.abandon());

    bind('btn-go-lobby', () => this.show('lobby'));
    bind('btn-go-retry', () => {
      this.show('battle');
      Game.startRun(Game.endless, Game.coop, Game.survivalMode);
    });

    bind('btn-inv-modal-close', () => this.closeInventoryModal());

    const volEl = document.getElementById('optVolume');
    const sfxEl = document.getElementById('optSfx');
    if (volEl) {
      volEl.value = save.options.volume;
      document.getElementById('volVal').textContent = save.options.volume;
      volEl.addEventListener('input', e => {
        save.options.volume = +e.target.value;
        document.getElementById('volVal').textContent = e.target.value;
        Save.write();
      });
    }
    if (sfxEl) {
      sfxEl.value = save.options.sfx;
      document.getElementById('sfxVal').textContent = save.options.sfx;
      sfxEl.addEventListener('input', e => {
        save.options.sfx = +e.target.value;
        document.getElementById('sfxVal').textContent = e.target.value;
        Save.write();
      });
    }

    document.querySelectorAll('[data-toggle="minimap"]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-toggle="minimap"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        save.options.minimap = btn.dataset.value === 'on';
        Save.write();
        this.applyMinimapVisibility();
      });
    });

    document.querySelectorAll('[data-diff]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-diff]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        save.options.difficulty = btn.dataset.diff;
        Save.write();
      });
    });

    this.buildKeybindList();
    this.refreshLobby();
    this.refreshStats();
    this.refreshAchievements();
    this.refreshOptionsUI();
    this.applyMinimapVisibility();
    this.updateConsumableBar();
    this.updateKeyLabels();
    this.updateXpBar();
    this.updateChallengeBadge();
  },

  applyMinimapVisibility() {
    const mm = document.getElementById('minimap');
    if (!mm) return;
    if (save.options.minimap) {
      mm.classList.remove('hidden');
    } else {
      mm.classList.add('hidden');
      const c = mm.getContext('2d');
      c.clearRect(0, 0, mm.width, mm.height);
    }
  },

  show(name) {
    if (name !== 'shop') {
      const title = document.querySelector('#screen-shop .screen-title');
      if (title) title.innerHTML = '🏪 MERCADILLO DEL PISO <span id="shopFloor">1</span>';
      const subtitle = document.querySelector('#screen-shop p');
      if (subtitle) subtitle.textContent = 'Bienes perecederos y reliquias. Los consumibles se acumulan (máx. por tipo).';
    }

    Object.values(this.screens).forEach(s => s && s.classList.remove('active'));
    if (name === 'battle') { this.current = 'battle'; this._menuLastActiveOverlay = null; return; }
    const el = this.screens[name];
    if (el) { el.classList.add('active'); this.current = name; }
    if (name === 'lobby')         this.refreshLobby();
    if (name === 'stats')         this.refreshStats();
    if (name === 'achievements')  this.refreshAchievements();
    if (name === 'shopPerm')      this.refreshPermShop();
    if (name === 'invMeta')       this.refreshInvMeta();
    if (name === 'options')       this.refreshOptionsUI();
    if (name === 'customize')     this.refreshCustomization();
    this._menuLastActiveOverlay = null;
    this._menuFocusIndex = 0;

    setTimeout(() => {
      this.updateKeyLabels();
      this.updateInputModeBadge();
    }, 30);
  },

  showOptions(from) { this._lastScreen = from; this.show('options'); },

  showBossLockMessage() {
    const el = document.getElementById('bossLockMsg');
    if (!el) return;
    el.style.display = 'block';
    clearTimeout(this._bossLockTimer);
    this._bossLockTimer = setTimeout(() => {
      el.style.display = 'none';
    }, 2200);
  },

  toggleInventoryModal() {
    if (this._invModalOpen) this.closeInventoryModal();
    else this.openInventoryModal();
  },
  openInventoryModal() {
    this._invModalOpen = true;
    Game.paused = true;
    this.renderInventoryModal();
    this.screens.invModal.classList.add('active');
  },
  closeInventoryModal() {
    this._invModalOpen = false;
    this.screens.invModal.classList.remove('active');
    if (Game.battleActive) {
      Game.paused = false;
      this.current = 'battle';
    }
  },

  goBack() {
    if (this._invModalOpen) { this.closeInventoryModal(); return true; }
    if (Game.paused && Game.battleActive) {
      if (this.current === 'levelup') {
        const firstCard = document.querySelector('#levelupGrid .levelup-card');
        if (firstCard) { firstCard.click(); return true; }
      }
      if (this.current === 'upgrade') {
        const closeButton = document.querySelector('#upgradeGrid .shop-item:last-child .shop-item-buy');
        if (closeButton) { closeButton.click(); return true; }
      }
      Game.resume();
      return true;
    }
    const backMap = {
      'stats':        'menu',
      'achievements': this._lastScreen === 'lobby' ? 'lobby' : 'menu',
      'options':      this._lastScreen === 'lobby' ? 'lobby' : 'menu',
      'shopPerm':     'lobby',
      'invMeta':      'lobby',
      'lobby':        'menu',
      'gameover':     'lobby',
    };
    if (backMap[this.current]) { this.show(backMap[this.current]); return true; }
    return false;
  },

  renderInventoryModal() {
    document.getElementById('invModalCoins').textContent = Game.run.coins;
    document.getElementById('invModalItemsCount').textContent = Game.run.items.length;
    const lvlEl = document.getElementById('invModalLevel');
    if (lvlEl) lvlEl.textContent = Game.run.level;
    document.getElementById('invModalBoss').textContent =
      (Game.boss && !Game.boss.dead) ? Game.boss.name : '—';

    // Reto del piso
    const cEl = document.getElementById('invModalChallenge');
    if (cEl) {
      if (Game.floorChallenge) {
        cEl.innerHTML = `<span style="font-size:18px;">${Game.floorChallenge.icon}</span> <strong style="color:#ff8aa3;letter-spacing:2px;">RETO DEL PISO:</strong> ${Game.floorChallenge.name} — <em>${Game.floorChallenge.desc}</em>`;
      } else {
        cEl.innerHTML = '';
        cEl.style.display = 'none';
      }
    }

    const synEl = document.getElementById('invModalSynergies');
    synEl.innerHTML = '';
    const active = SYNERGIES.filter(s => s.ids.every(id => Game.run.items.includes(id)));
    if (active.length === 0) {
      synEl.innerHTML = '<span class="synergy-empty">Sin sinergias activas.</span>';
    } else {
      for (const s of active) {
        const tag = document.createElement('div');
        tag.className = 'synergy-tag';
        const bonusText = Object.entries(s.bonus).map(([k,v]) => `+${v} ${k.toUpperCase()}`).join(', ');
        tag.textContent = `${s.name} · ${bonusText}`;
        synEl.appendChild(tag);
      }
    }

    const grid = document.getElementById('invModalItems');
    grid.innerHTML = '';
    if (Game.run.items.length === 0) {
      grid.innerHTML = '<span class="synergy-empty">Aún no tienes items esta run.</span>';
    } else {
      for (const id of Game.run.items) {
        const item = ITEMS_DB.find(i => i.id === id);
        if (!item) continue;
        const rar = RARITY[item.rarity];
        const div = document.createElement('div');
        div.className = 'inv-modal-item';
        div.style.borderColor = rar.color;
        div.innerHTML = `
          <div class="inv-modal-icon" style="filter:drop-shadow(0 0 8px ${rar.color});">${item.icon}</div>
          <div class="inv-modal-name">${item.name}</div>
          <div class="inv-modal-desc">${item.desc}</div>
          <div class="inv-modal-rarity" style="color:${rar.color};">${rar.label}</div>
        `;
        grid.appendChild(div);
      }
    }

    const consGrid = document.getElementById('invModalConsumables');
    if (consGrid) {
      consGrid.innerHTML = '';
      const inv = Game.run.consumables || {};
      const entries = Object.entries(inv).filter(([_, c]) => c > 0);
      if (entries.length === 0) {
        consGrid.innerHTML = '<span class="synergy-empty">Sin consumibles. Compra en el mercadillo.</span>';
      } else {
        for (const [id, count] of entries) {
          const def = CONSUMABLES_DB.find(c => c.id === id);
          if (!def) continue;
          const rar = RARITY[def.rarity];
          const div = document.createElement('div');
          div.className = 'inv-modal-item';
          div.style.borderColor = rar.color;
          div.innerHTML = `
            <div class="inv-modal-icon" style="filter:drop-shadow(0 0 8px ${rar.color});">${def.icon}</div>
            <div class="inv-modal-name">${def.name}</div>
            <div class="inv-modal-desc">${def.desc}</div>
            <div class="inv-modal-rarity" style="color:${rar.color};">x${count} · ${rar.label}</div>
          `;
          consGrid.appendChild(div);
        }
      }
    }
  },

  /* 🗺️ Actualiza el badge del reto del piso en el HUD */
  updateChallengeBadge() {
    const badge = document.getElementById('challengeBadge');
    const iconEl = document.getElementById('challengeIcon');
    const textEl = document.getElementById('challengeText');
    if (!badge || !iconEl || !textEl) return;

    if (!Game.floorChallenge) {
      badge.style.display = 'none';
      return;
    }
    const c = Game.floorChallenge;
    badge.style.display = 'flex';
    // Quitar clases previas y añadir la actual
    badge.classList.remove('easy', 'medium', 'hard', 'extreme');
    badge.classList.add(c.severity || 'medium');
    iconEl.textContent = c.icon;
    textEl.textContent = c.name;
    badge.title = c.desc;
  },

  refreshLobby() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('lobbyCoins', save.metaCoins || 0);
    set('lobbyGems',  save.metaGems || 0);
    set('lobbyBest',  save.bestFloor || 0);
    const btn = document.getElementById('btn-endless');
    if (btn) {
      btn.disabled = save.bestFloor < CFG.ENDLESS_UNLOCK;
      btn.textContent = save.bestFloor >= CFG.ENDLESS_UNLOCK ? '∞ Modo Endless' : `∞ Endless (Piso ${CFG.ENDLESS_UNLOCK})`;
    }
  },

  refreshCustomization() {
    const grid = document.getElementById('customizationGrid');
    const preview = document.getElementById('customizationPreview');
    const selectedLabel = document.getElementById('customizationSelected');
    if (!grid || !preview || !selectedLabel) return;

    const selected = PlayerCustomization.selected(this.customizationPlayer);
    selectedLabel.textContent = `${this.customizationPlayer ? this.customizationPlayer.toUpperCase() + ' · ' : ''}Seleccionado: ${selected.name}`;
    grid.innerHTML = '';
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.fillStyle = '#071a2e';
    ctx.fillRect(0, 0, preview.width, preview.height);
    PlayerCustomization.renderPreview(ctx, selected, 128);

    for (const sprite of PLAYER_SPRITES) {
      const button = document.createElement('button');
      button.className = `customization-card${sprite.id === selected.id ? ' selected' : ''}`;
      button.type = 'button';
      const thumbnail = document.createElement('canvas');
      thumbnail.width = 64;
      thumbnail.height = 64;
      thumbnail.className = 'customization-card-preview';
      PlayerCustomization.renderPreview(thumbnail.getContext('2d'), sprite);
      button.appendChild(thumbnail);
      const name = document.createElement('span');
      name.className = 'customization-card-name';
      name.textContent = sprite.name;
      button.appendChild(name);
      const file = document.createElement('span');
      file.className = 'customization-card-file';
      file.textContent = sprite.src || 'Personaje original';
      button.appendChild(file);
      button.addEventListener('click', () => PlayerCustomization.select(sprite.id, this.customizationPlayer));
      grid.appendChild(button);
    }
    const controls = document.getElementById('coopCharacterControls');
    const hint = document.getElementById('customizationHint');
    if (controls) controls.classList.toggle('is-hidden', !this.customizationPlayer);
    if (hint) hint.innerHTML = this.customizationPlayer
      ? 'Elige un personaje para cada jugador. Pueden ser diferentes.'
      : 'Selecciona un sprite de <strong>player.customize</strong>.';
    const p1 = document.getElementById('btn-select-p1');
    const p2 = document.getElementById('btn-select-p2');
    if (p1) p1.textContent = `P1: ${PlayerCustomization.selected('p1').name}`;
    if (p2) p2.textContent = `P2: ${PlayerCustomization.selected('p2').name}`;
  },

  openCustomization(coop = false) {
    this.customizationPlayer = coop ? (this.customizationPlayer || 'p1') : null;
    this.refreshCustomization();
    this.show('customize');
  },

  startCoopCharacterSelection() {
    this.customizationPlayer = 'p1';
    this.refreshCustomization();
    this.show('customize');
  },

  selectCustomizationPlayer(playerId) {
    this.customizationPlayer = playerId;
    this.refreshCustomization();
  },

  refreshOptionsUI() {
    const volEl = document.getElementById('optVolume');
    const sfxEl = document.getElementById('optSfx');
    if (volEl) { volEl.value = save.options.volume; document.getElementById('volVal').textContent = save.options.volume; }
    if (sfxEl) { sfxEl.value = save.options.sfx; document.getElementById('sfxVal').textContent = save.options.sfx; }
    document.querySelectorAll('[data-toggle="minimap"]').forEach(b => {
      const on = save.options.minimap && b.dataset.value === 'on';
      const off = !save.options.minimap && b.dataset.value === 'off';
      b.classList.toggle('active', on || off);
    });
    document.querySelectorAll('[data-diff]').forEach(b => {
      b.classList.toggle('active', save.options.difficulty === b.dataset.diff);
    });
  },

  refreshStats() {
    const grid = document.getElementById('statsGrid');
    if (!grid) return;
    grid.innerHTML = `
      <div class="stat-row"><span class="label">Mejor piso</span><span class="value">${save.bestFloor || 0} / ${CFG.MAX_FLOORS}</span></div>
      <div class="stat-row"><span class="label">Runs totales</span><span class="value">${save.totalRuns || 0}</span></div>
      <div class="stat-row"><span class="label">Victorias</span><span class="value">${save.totalWins || 0}</span></div>
      <div class="stat-row"><span class="label">Kills totales</span><span class="value">${save.totalKills || 0}</span></div>
      <div class="stat-row"><span class="label">Monedas meta</span><span class="value">${save.metaCoins || 0}</span></div>
      <div class="stat-row"><span class="label">Gemas meta</span><span class="value">${save.metaGems || 0}</span></div>
      <div class="stat-row"><span class="label">Mejoras compradas</span><span class="value">${save.totalUpgradesBought || 0}</span></div>
      <div class="stat-row"><span class="label">Mejor nivel</span><span class="value">${save.bestLevelReached || 1}</span></div>
      <div class="stat-row"><span class="label">Tiradas gacha</span><span class="value">${save.totalGachaRolls || 0}</span></div>
      <div class="stat-row"><span class="label">Obstáculos destruidos</span><span class="value">${save.totalObstaclesDestroyed || 0}</span></div>
      <div class="stat-row"><span class="label">Consumibles usados</span><span class="value">${save.totalConsumablesUsed || 0}</span></div>
      <div class="stat-row"><span class="label">Logros</span><span class="value">${Object.keys(save.achievements || {}).length} / ${ACHIEVEMENTS_DB.length}</span></div>
    `;
  },

  refreshAchievements() {
    const grid = document.getElementById('achGrid');
    if (!grid) return;
    grid.innerHTML = '';
    let unlockedCount = 0;

    for (const ach of ACHIEVEMENTS_DB) {
      const unlocked = !!save.achievements[ach.id];
      const current = save[ach.stat] || 0;
      const pct = Math.min(100, Math.round((current / ach.goal) * 100));
      if (unlocked) unlockedCount++;

      const card = document.createElement('div');
      card.className = `ach-card ${unlocked ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        ${unlocked ? '<div class="ach-card-badge">✓</div>' : ''}
        <div class="ach-card-icon" style="color:${unlocked ? '#ffd54f' : '#7a9ab0'};">${ach.icon}</div>
        <div class="ach-card-name">${ach.name}</div>
        <div class="ach-card-desc">${ach.desc}</div>
        <div class="ach-card-progress">${unlocked ? 'Desbloqueado' : `${current} / ${ach.goal}`}</div>
        <div class="ach-progress-bar">
          <div class="ach-progress-fill" style="width:${unlocked ? 100 : pct}%;"></div>
        </div>
      `;
      grid.appendChild(card);
    }

    const countEl = document.getElementById('achCount');
    const totalEl = document.getElementById('achTotal');
    const pctEl = document.getElementById('achPercent');
    if (countEl) countEl.textContent = unlockedCount;
    if (totalEl) totalEl.textContent = ACHIEVEMENTS_DB.length;
    if (pctEl) pctEl.textContent = Math.round((unlockedCount / ACHIEVEMENTS_DB.length) * 100) + '%';
  },

  checkAchievements() {
    let changed = false;
    for (const ach of ACHIEVEMENTS_DB) {
      if (save.achievements[ach.id]) continue;
      const current = save[ach.stat] || 0;
      if (current >= ach.goal) {
        save.achievements[ach.id] = true;
        changed = true;
        Audio2.achievement();
        Gamepad.rumble(0.8, 300);
        this._showAchievementToast(ach);
      }
    }
    if (changed) {
      Save.write();
      this.refreshAchievements();
    }
  },

  _showAchievementToast(ach) {
    const el = document.createElement('div');
    el.className = 'toast achievement';
    el.innerHTML = `🏆 <strong>LOGRO:</strong> ${ach.icon} ${ach.name}`;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  },

  refreshPermShop() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('permShopCoins', save.metaCoins || 0);
    const grid = document.getElementById('permShopGrid');
    if (!grid) return;
    const ups = [
      { id:'atk',   icon:'⚔️', name:'+2 ATK',    cost:75 },
      { id:'def',   icon:'🛡️', name:'+2 DEF',    cost:75 },
      { id:'maxHp', icon:'❤️', name:'+5 HP',     cost:100 },
      { id:'speed', icon:'💨', name:'+0.15 VEL', cost:85 },
      { id:'crit',  icon:'🎯', name:'+2% CRIT',  cost:110 },
    ];
    grid.innerHTML = '';
    for (const u of ups) {
      const lvl = save.upgrades[u.id] || 0;
      const cost = u.cost + lvl * 45;
      const canBuy = save.metaCoins >= cost && lvl < 10;
      const div = document.createElement('div');
      div.className = 'stat-row';
      div.innerHTML = `
        <span class="label">${u.icon} ${u.name} · Nv.${lvl}/10</span>
        <span class="value">◆ ${cost}
          <button class="btn small" style="display:inline-block; margin-left:8px; min-width:auto; padding:4px 10px; font-size:10px;"
            ${canBuy ? '' : 'disabled'}>${lvl >= 10 ? 'MÁX' : 'COMPRAR'}</button>
        </span>
      `;
      if (canBuy) {
        div.querySelector('button').addEventListener('click', () => {
          save.metaCoins -= cost;
          save.upgrades[u.id] = lvl + 1;
          save.totalUpgradesBought = (save.totalUpgradesBought || 0) + 1;
          Save.write();
          Audio2.buy();
          Gamepad.rumble(0.3, 60);
          this.refreshPermShop();
          this.refreshLobby();
          this.checkAchievements();
        });
      }
      grid.appendChild(div);
    }
  },

  refreshInvMeta() {
    const grid = document.getElementById('invMetaGrid');
    if (!grid) return;
    grid.innerHTML = `
      <div class="stat-row"><span class="label">Items totales</span><span class="value">${ITEMS_DB.length}</span></div>
      <div class="stat-row"><span class="label">Consumibles</span><span class="value">${CONSUMABLES_DB.length}</span></div>
      <div class="stat-row"><span class="label">Rarezas</span><span class="value">4</span></div>
      <div class="stat-row"><span class="label">Sinergias</span><span class="value">${SYNERGIES.length}</span></div>
      <div class="stat-row"><span class="label">Mejoras nivel</span><span class="value">${LEVELUP_POOL.length}</span></div>
      <div class="stat-row"><span class="label">Retos de piso</span><span class="value">${FLOOR_CHALLENGES.length}</span></div>
      <div class="stat-row"><span class="label">Jefes</span><span class="value">${BOSS_TYPES.length}</span></div>
      <div class="stat-row"><span class="label">Tipos de enemigo</span><span class="value">${Object.keys(ENEMY_TYPES).length}</span></div>
      <div class="stat-row"><span class="label">Logros</span><span class="value">${ACHIEVEMENTS_DB.length}</span></div>
    `;
  },

  buildKeybindList() {
    const list = document.getElementById('keybindList');
    if (!list) return;
    const labels = {
      up:'Arriba', down:'Abajo', left:'Izquierda', right:'Derecha',
      pause:'Pausa',
      basic:'Ataque Básico', melee:'Melee', long:'Ráfaga Larga', dash:'Dash', inventory:'Inventario',
    };
    list.innerHTML = '';
    for (const [key, label] of Object.entries(labels)) {
      const row = document.createElement('div');
      row.className = 'keybind-row';
      const keyName = save.keybinds[key] === ' ' ? 'Espacio' : (save.keybinds[key] || '').toUpperCase();
      row.innerHTML = `<span class="keybind-label">${label}</span><button class="keybind-key" data-key="${key}">${keyName}</button>`;
      row.querySelector('.keybind-key').addEventListener('click', e => this.startRebind(e.target, key));
      list.appendChild(row);
    }
    this.updateKeyLabels();
  },

  startRebind(btn, key) {
    if (btn.classList.contains('listening')) return;
    btn.classList.add('listening');
    btn.textContent = '...';
    const handler = e => {
      e.preventDefault();
      const k = e.key.toLowerCase();
      if (k !== 'escape') { save.keybinds[key] = k; Save.write(); }
      btn.classList.remove('listening');
      btn.textContent = k === ' ' ? 'Espacio' : k.toUpperCase();
      this.updateKeyLabels();
      window.removeEventListener('keydown', handler, true);
    };
    window.addEventListener('keydown', handler, true);
  },

  updateKeyLabels() {
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const setHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };

    if (typeof Gamepad !== 'undefined' && Gamepad.connected) {
      const G = Gamepad;
      const brand = G._getBrand();

      const buildLabel = (action) => {
        const icon = G.getButtonIcon(action);
        const text = G.getButtonLabel(action);
        return `<span class="gp-icon">${icon}</span><span class="gp-label">${text}</span>`;
      };

      setHTML('dashKey',  buildLabel('dash'));
      setHTML('basicKey', buildLabel('basic'));
      setHTML('meleeKey', buildLabel('melee'));
      setHTML('longKey',  buildLabel('long'));
      setHTML('blockKey', buildLabel('block'));

      ['dashKey','basicKey','meleeKey','longKey','blockKey'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('gamepad-label', 'brand-xbox', 'brand-ps', 'brand-switch', 'brand-8bitdo');
        el.classList.add('gamepad-label', 'brand-' + brand);
      });

      this.updateInputModeBadge();
      return;
    }

    const kb = save.keybinds;
    ['dashKey','basicKey','meleeKey','longKey','blockKey'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('gamepad-label', 'brand-xbox', 'brand-ps', 'brand-switch', 'brand-8bitdo');
    });
    setText('dashKey',  (kb.dash  || '').toUpperCase());
    setText('basicKey', (kb.basic || '').toUpperCase());
    setText('meleeKey', (kb.melee || '').toUpperCase());
    setText('longKey',  (kb.long  || '').toUpperCase());
    setText('blockKey', (kb.block || 'f').toUpperCase());
    this.updateInputModeBadge();
  },

  updateInputModeBadge() {
    const badge = document.getElementById('inputModeBadge');
    if (!badge) return;
    badge.classList.remove('brand-xbox', 'brand-ps', 'brand-switch', 'brand-8bitdo');
    if (typeof Gamepad !== 'undefined' && Gamepad.connected) {
      const brand = Gamepad._getBrand();
      badge.textContent = Gamepad.getBrandName();
      badge.style.display = 'inline-block';
      badge.classList.add('brand-' + brand);
    } else {
      badge.style.display = 'none';
      badge.textContent = '';
    }
  },

  resetKeys() {
    save.keybinds = Save.defaults().keybinds;
    Save.write();
    this.buildKeybindList();
    this.toast('↻ Controles restaurados', 'gold');
  },

  updateHud() {
    const p = Game.player;
    if (p) {
      document.getElementById('hpFill').style.width = (p.hp / p.maxHp * 100) + '%';
      document.getElementById('hpText').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
      document.getElementById('statsText').textContent =
        `${p.atk.toFixed(0)} · ${p.def.toFixed(0)} · ${p.speed.toFixed(1)} · ${(p.crit*100).toFixed(0)}%`;
    }
    const p2 = Game.coop ? Game.players[1] : null;
    const p2Hud = document.getElementById('hud-p2');
    if (p2Hud) {
      p2Hud.classList.toggle('is-hidden', !p2);
      if (p2) {
        document.getElementById('p2HpFill').style.width = Math.max(0, p2.hp / p2.maxHp * 100) + '%';
        document.getElementById('p2HpText').textContent = p2.downed
          ? 'CAÍDO — acércate para revivir'
          : `${Math.ceil(p2.hp)} / ${p2.maxHp}${p2.shieldUntil > performance.now() ? ' · 🛡' : ''}`;
      }
    }
    document.getElementById('floorText').textContent = Game.floor;
    const cleared = Game.rooms ? Game.rooms.flat().filter(r => r && r.cleared).length : 0;
    const total = Game.rooms ? Game.rooms.flat().filter(r => r).length : 0;
    document.getElementById('roomsText').textContent = `${cleared} / ${total}`;
    const coinsEl = document.getElementById('runCoinsText');
    if (coinsEl) coinsEl.textContent = `◆ ${Game.run.coins}`;
    const bossInline = document.getElementById('bossInline');
    if (Game.boss && !Game.boss.dead) {
      bossInline.style.display = 'flex';
      document.getElementById('bossInlineName').textContent = Game.boss.name;
      document.getElementById('bossInlineFill').style.width = (Game.boss.hp / Game.boss.maxHp * 100) + '%';
      document.getElementById('bossInlineHp').textContent =
        `${Math.ceil(Game.boss.hp)}/${Game.boss.maxHp}`;
    } else {
      bossInline.style.display = 'none';
    }
    this.updateAbilityCooldowns();
    this.updateConsumableBar();
    this.updateXpBar();
    this.updateChallengeBadge();
  },

  updateAbilityCooldowns() {
    const now = performance.now();
    const p = Game.player;
    if (!p) return;
    this._updateSlot('abilitySlot', 'dashCooldown', p.dashReady(now), p.dashCooldownUntil, now);
    const basicReady = now - p.lastBasic >= CFG.BASIC.cooldown * (p._challengeFireRateMul || 1);
    const basicUntil = p.lastBasic + CFG.BASIC.cooldown * (p._challengeFireRateMul || 1);
    this._updateSlot('basicSlot', 'basicCooldown', basicReady, basicUntil, now);
    this._updateSlot('meleeSlot', 'meleeCooldown', p.meleeReady(now), p.meleeCooldownUntil, now);
    this._updateSlot('longSlot', 'longCooldown', p.longReady(now), p.longCooldownUntil, now);
    this._updateSlot('blockSlot', 'blockCooldown', p.blockReady(now), p.blockCooldownUntil, now);
  },

  _updateSlot(slotId, cdId, ready, until, now) {
    const slot = document.getElementById(slotId);
    const cd = document.getElementById(cdId);
    if (!slot || !cd) return;
    if (ready) {
      slot.classList.remove('cooling');
      slot.classList.add('ready');
      cd.textContent = '';
    } else {
      slot.classList.remove('ready');
      slot.classList.add('cooling');
      const remainingMs = until - now;
      if (remainingMs > 300) {
        const remaining = (remainingMs / 1000).toFixed(1);
        cd.textContent = remaining + 's';
      } else {
        cd.textContent = '';
      }
    }
  },

  getConsumableSlots() {
    const inv = (Game.run && Game.run.consumables) || {};
    const entries = Object.entries(inv).filter(([id, count]) => count > 0);
    entries.sort((a, b) => {
      const ia = CONSUMABLES_DB.findIndex(c => c.id === a[0]);
      const ib = CONSUMABLES_DB.findIndex(c => c.id === b[0]);
      return ia - ib;
    });
    return entries.slice(0, 4).map(([id, count]) => ({ id, count }));
  },

  updateConsumableBar() {
    const bar = document.getElementById('consumableBar');
    if (!bar) return;
    const slots = this.getConsumableSlots();
    bar.innerHTML = '';
    const now = performance.now();
    const p = Game.player;

    for (let i = 0; i < 4; i++) {
      const slot = slots[i];
      const div = document.createElement('div');
      div.className = 'consumable-slot';

      if (p && p.shieldUntil > now) div.classList.add('shielded');
      if (p && p.rageUntil > now)   div.classList.add('rage');

      if (!slot) {
        div.classList.add('empty');
        div.innerHTML = `<div class="cs-icon" style="opacity:0.3;">·</div><div class="cs-key">${i+1}</div>`;
      } else {
        const def = CONSUMABLES_DB.find(c => c.id === slot.id);
        div.innerHTML = `
          <div class="cs-icon">${def ? def.icon : '?'}</div>
          <div class="cs-count">${slot.count}</div>
          <div class="cs-key">${i+1}</div>
        `;
        div.title = def ? `${def.name} — ${def.desc}` : '';
        div.addEventListener('click', () => {
          if (Game.battleActive && !Game.paused) Game.useConsumable(slot.id);
        });
      }
      bar.appendChild(div);
    }
  },

  updateXpBar() {
    const r = Game.run;
    if (!r) return;
    const pct = Math.max(0, Math.min(100, (r.xp / r.xpToNext) * 100));
    const fill = document.getElementById('xpFill');
    const text = document.getElementById('xpText');
    const lvl = document.getElementById('levelText');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = `${r.xp} / ${r.xpToNext}`;
    if (lvl)  lvl.textContent = r.level;
  },

  showLevelUp(perks) {
    const grid = document.getElementById('levelupGrid');
    const titleEl = document.getElementById('levelupTitle');
    const subEl = document.getElementById('levelupSub');
    if (titleEl) titleEl.textContent = `NIVEL ${Game.run.level}`;
    if (subEl) subEl.textContent = 'Elige una mejora';
    grid.innerHTML = '';

    for (const perk of perks) {
      const rar = RARITY[perk.rarity];
      const card = document.createElement('div');
      card.className = `levelup-card rarity-${perk.rarity}`;
      card.innerHTML = `
        <div>
          <div class="levelup-card-rarity" style="background:${rar.color}22; color:${rar.color}; border:1px solid ${rar.color};">${rar.label}</div>
          <div class="levelup-card-icon" style="color:${rar.color};">${perk.icon}</div>
          <div class="levelup-card-name">${perk.name}</div>
          <div class="levelup-card-desc">${perk.desc}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        Audio2.buy();
        Gamepad.rumble(0.5, 150);
        this.show('battle');
        Game.applyLevelUpPerk(perk);
      });
      grid.appendChild(card);
    }

    this.show('levelup');
  },

  showStall(stall, coins, items, onBuy, onClose) {
    document.getElementById('shopCoins').textContent = coins;
    const title = document.querySelector('#screen-shop .screen-title');
    if (title) title.innerHTML = `${stall.icon} ${stall.name.toUpperCase()}`;
    const subtitle = document.querySelector('#screen-shop p');
    if (subtitle) subtitle.textContent = stall.desc;

    const grid = document.getElementById('shopGrid');
    grid.innerHTML = '';

    if (items.length === 0) {
      grid.innerHTML = '<p style="color:var(--ice-frost);font-size:12px;">Este puesto no tiene stock disponible.</p>';
    }

    for (const item of items) {
      const rar = RARITY[item.rarity];
      const cost = Math.round(item.baseCost * rar.priceMul);
      const isConsumable = item._kind === 'consumable';
      let alreadyOwned = false;
      let stockText = '';
      if (isConsumable) {
        const inv = Game.run.consumables || {};
        const cur = inv[item.id] || 0;
        stockText = `x${cur}/${item.maxStack}`;
        alreadyOwned = cur >= item.maxStack;
      } else {
        alreadyOwned = Game.run.items.includes(item.id);
      }
      const canBuy = !alreadyOwned && coins >= cost;

      const div = document.createElement('div');
      div.className = `shop-item rarity-${item.rarity}`;
      if (isConsumable) div.classList.add('shop-item-consumable');

      const badge = isConsumable
        ? `<div class="shop-item-badge">CONSUMIBLE</div>`
        : `<div class="shop-item-badge perm">PERMANENTE</div>`;

      const stockLine = isConsumable
        ? `<div class="shop-item-stock">${stockText}</div>`
        : '';

      div.innerHTML = `
        ${badge}
        <div class="shop-item-icon" style="filter:drop-shadow(0 0 8px ${rar.color});">${item.icon}</div>
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.desc}<br><small style="color:${rar.color};">${rar.label}</small></div>
        ${stockLine}
        <div class="shop-item-price ${canBuy ? '' : 'cant'}">◆ ${cost}</div>
        <button class="shop-item-buy" ${canBuy ? '' : 'disabled'}>
          ${alreadyOwned ? (isConsumable ? 'STACK LLENO' : 'COMPRADO') : (coins < cost ? 'SIN FONDOS' : 'COMPRAR')}
        </button>
      `;

      if (canBuy) {
        div.querySelector('.shop-item-buy').addEventListener('click', () => {
          if (onBuy(item)) {
            document.getElementById('shopCoins').textContent = Game.run.coins;
            const inv = Game.run.consumables || {};
            const cur = inv[item.id] || 0;
            if (isConsumable) {
              const stockEl = div.querySelector('.shop-item-stock');
              if (stockEl) stockEl.textContent = `x${cur}/${item.maxStack}`;
              if (cur >= item.maxStack) {
                div.querySelector('.shop-item-buy').disabled = true;
                div.querySelector('.shop-item-buy').textContent = 'STACK LLENO';
              }
            } else {
              div.querySelector('.shop-item-buy').disabled = true;
              div.querySelector('.shop-item-buy').textContent = 'COMPRADO';
            }
            UI.updateConsumableBar();
            Gamepad.rumble(0.3, 60);
          }
        });
      }
      grid.appendChild(div);
    }

    const closeBtn = document.getElementById('btn-shop-close');
    if (closeBtn) {
      const newBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newBtn, closeBtn);
      newBtn.addEventListener('click', () => { Audio2.click(); this.show('battle'); onClose(); });
    }
    this.show('shop');
  },

  showChestChoice(chest, choices, onPick, onClose) {
    const grid = document.getElementById('chestGrid');
    grid.innerHTML = '';

    const header = document.createElement('div');
    header.style.cssText = 'grid-column: 1/-1; text-align:center; color:#b48aff; font-weight:bold; letter-spacing:2px; margin-bottom:8px;';
    header.innerHTML = `
      <div style="font-size:20px;">📦 COFRE MISTERIOSO</div>
      <div style="font-size:11px; color:#b2ebf2; font-weight:normal; letter-spacing:1px; margin-top:4px;">Elige UN item de los 3 que aparecen</div>
    `;
    grid.appendChild(header);

    for (const item of choices) {
      const rar = RARITY[item.rarity];
      const div = document.createElement('div');
      div.className = `shop-item rarity-${item.rarity}`;
      div.innerHTML = `
        <div class="shop-item-icon" style="filter:drop-shadow(0 0 8px ${rar.color});">${item.icon}</div>
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.desc}<br><small style="color:${rar.color};">${rar.label}</small></div>
        <button class="shop-item-buy">ELEGIR</button>
      `;
      div.querySelector('.shop-item-buy').addEventListener('click', () => {
        Audio2.buy(); Gamepad.rumble(0.5, 150);
        this.show('battle'); onPick(item);
      });
      grid.appendChild(div);
    }
    this.show('chest');
  },

  showGacha(baseCost, coins, onRoll, onClose) {
    const grid = document.getElementById('upgradeGrid');
    grid.innerHTML = '';

    const info = document.createElement('div');
    info.style.cssText = 'grid-column: 1/-1; text-align:center; color:#b2ebf2; font-size:12px; line-height:1.8;';
    const pity = Game.currentRoom ? (Game.currentRoom.gachaPity || 0) : 0;
    info.innerHTML = `
      <div style="font-size:14px;color:#7b61ff;font-weight:bold;letter-spacing:2px;margin-bottom:6px;">🎰 GACHA GLACIAL</div>
      <div>Obtén mejoras permanentes aleatorias para esta run.</div>
      <div style="color:#ffd54f;">Rarezas: Común · Rara · Épica · Legendaria</div>
      <div>Pity: <strong>${pity}/10</strong> — épico+ garantizado al llegar a 10.</div>
      <div style="margin-top:8px;">Monedas: <strong style="color:#ffd54f;">◆ ${coins}</strong></div>
    `;
    grid.appendChild(info);

    const singleCost = baseCost;
    const canSingle = coins >= singleCost;
    const divSingle = document.createElement('div');
    divSingle.className = 'shop-item rarity-rare';
    divSingle.innerHTML = `
      <div class="shop-item-icon" style="filter:drop-shadow(0 0 8px #00e5ff);">🎲</div>
      <div class="shop-item-name">Tirada simple</div>
      <div class="shop-item-desc">1 mejora aleatoria.</div>
      <div class="shop-item-price ${canSingle ? '' : 'cant'}">◆ ${singleCost}</div>
      <button class="shop-item-buy" ${canSingle ? '' : 'disabled'}>GIRAR</button>
    `;
    if (canSingle) {
      divSingle.querySelector('.shop-item-buy').addEventListener('click', () => onRoll('single'));
    }
    grid.appendChild(divSingle);

    const tripleCost = Math.round(baseCost * 3 * 0.9);
    const canTriple = coins >= tripleCost;
    const divTriple = document.createElement('div');
    divTriple.className = 'shop-item rarity-epic';
    divTriple.innerHTML = `
      <div class="shop-item-icon" style="filter:drop-shadow(0 0 8px #7b61ff);">🎲🎲🎲</div>
      <div class="shop-item-name">Tirada triple</div>
      <div class="shop-item-desc">3 mejoras. <strong style="color:#7bff9f;">-10% descuento</strong></div>
      <div class="shop-item-price ${canTriple ? '' : 'cant'}">◆ ${tripleCost}</div>
      <button class="shop-item-buy" ${canTriple ? '' : 'disabled'}>GIRAR x3</button>
    `;
    if (canTriple) {
      divTriple.querySelector('.shop-item-buy').addEventListener('click', () => onRoll('multi'));
    }
    grid.appendChild(divTriple);

    const divClose = document.createElement('div');
    divClose.className = 'shop-item';
    divClose.style.borderColor = '#7a9ab0';
    divClose.innerHTML = `
      <div class="shop-item-icon">🚪</div>
      <div class="shop-item-name">Salir</div>
      <div class="shop-item-desc">Abandonar el gacha.</div>
      <button class="shop-item-buy">CERRAR</button>
    `;
    divClose.querySelector('.shop-item-buy').addEventListener('click', () => {
      Audio2.click(); this.show('battle'); onClose();
    });
    grid.appendChild(divClose);

    this.show('upgrade');
  },

  showGachaResults(results) {
    const grid = document.getElementById('upgradeGrid');
    grid.innerHTML = '';

    const header = document.createElement('div');
    header.style.cssText = 'grid-column: 1/-1; text-align:center; margin-bottom:8px;';
    header.innerHTML = `<div style="font-size:20px;color:#ffd54f;font-weight:bold;letter-spacing:3px;">✦ RESULTADOS ✦</div>`;
    grid.appendChild(header);

    for (const roll of results) {
      const rar = RARITY[roll.rarity];
      const div = document.createElement('div');
      div.className = `shop-item rarity-${roll.rarity}`;
      div.style.borderWidth = '3px';
      div.innerHTML = `
        <div class="shop-item-icon" style="font-size:42px;filter:drop-shadow(0 0 12px ${rar.color});">${roll.icon}</div>
        <div class="shop-item-name" style="font-size:13px;color:${rar.color};">${roll.name}</div>
        <div class="shop-item-desc">${rar.label === 'Legendario' ? '⭐ ¡LEGENDARIO!' : rar.label === 'Épico' ? '💜 Épico' : rar.label === 'Raro' ? '💙 Raro' : 'Común'}</div>
      `;
      grid.appendChild(div);
    }

    const close = document.createElement('div');
    close.className = 'shop-item';
    close.style.gridColumn = '1/-1';
    close.style.maxWidth = '200px';
    close.style.margin = '0 auto';
    close.innerHTML = `
      <div class="shop-item-name">Continuar</div>
      <button class="shop-item-buy">OK</button>
    `;
    close.querySelector('.shop-item-buy').addEventListener('click', () => {
      Audio2.click();
      const baseCost = 50 + Game.floor * 12;
      UI.showGacha(baseCost, Game.run.coins, (tier) => {
        const rolls = tier === 'multi' ? 3 : 1;
        const cost = tier === 'multi' ? Math.round(baseCost * 3 * 0.9) : baseCost;
        if (Game.run.coins < cost) return false;
        Game.run.coins -= cost;
        const newResults = [];
        for (let i = 0; i < rolls; i++) newResults.push(Game._rollGacha());
        for (const r of newResults) Game._applyGacha(r);
        save.totalGachaRolls = (save.totalGachaRolls || 0) + rolls;
        Save.write();
        UI.updateHud();
        UI.checkAchievements();
        UI.showGachaResults(newResults);
        return true;
      }, () => { Game.paused = false; });
    });
    grid.appendChild(close);

    Gamepad.rumble(0.6, 200);
  },

  showGameOver(victory) {
    const title = document.getElementById('goTitle');
    const info = document.getElementById('goInfo');
    if (victory) {
      title.textContent = '🏆 ¡VICTORIA FINAL!';
      title.style.color = '#4dffff';
    } else {
      title.textContent = '💀 DERROTA';
      title.style.color = '#ff3d71';
    }
    const synergiesActive = SYNERGIES.filter(s => s.ids.every(id => Game.run.items.includes(id))).length;
    const consCount = Object.values(Game.run.consumables || {}).reduce((a,b) => a+b, 0);
    info.innerHTML = `
      <div>Piso alcanzado: <strong>${Game.floor}</strong></div>
      <div>Nivel final: <strong>${Game.run.level}</strong></div>
      <div>Salas limpiadas: <strong>${Game.run.roomsCleared}</strong></div>
      <div>Enemigos derrotados: <strong>${Game.run.kills}</strong></div>
      <div>Items obtenidos: <strong>${Game.run.items.length}</strong></div>
      <div>Consumibles restantes: <strong>${consCount}</strong></div>
      <div>Sinergias activas: <strong>${synergiesActive}</strong></div>
      <div>Monedas: <strong>${Game.run.coins}</strong></div>
    `;
    this.show('gameover');
  },

  toast(msg, type = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 2000);
  },

  /* ================================================================
     NAVEGACIÓN CON MANDO + ANIMACIÓN DE FOCO
     ================================================================ */
  handleGamepadMenuNav() {
    const activeOverlay = document.querySelector('.overlay.active');
    if (!activeOverlay) {
      this._menuLastActiveOverlay = null;
      return;
    }
    if (activeOverlay !== this._menuLastActiveOverlay) {
      this._menuLastActiveOverlay = activeOverlay;
      this._menuFocusIndex = 0;
      this._menuNavCooldown = 0;
    }

    const buttons = Array.from(activeOverlay.querySelectorAll(
      'button:not([disabled]):not(.keybind-key), input[type="range"], .levelup-card, .ach-card, .shop-item'
    )).filter(el => {
      // Una tarjeta con botón debe ser un solo elemento navegable.
      // Así el mando no se detiene en la tarjeta antes de llegar a CERRAR.
      return !el.classList.contains('shop-item') || !el.querySelector('button');
    });
    if (buttons.length === 0) return;

    const now = performance.now();
    const dpad = Gamepad.dpad();
    const sticks = Gamepad.pollSticks();
    const navDown  = dpad.down  || sticks.ly >  0.55;
    const navUp    = dpad.up    || sticks.ly < -0.55;
    const navRight = dpad.right || sticks.lx >  0.55;
    const navLeft  = dpad.left  || sticks.lx < -0.55;

    const gridContainer = activeOverlay.querySelector('.shop-grid, .levelup-grid, .ach-grid');
    let gridCols = 1;
    if (gridContainer) {
      gridCols = gridContainer.classList.contains('levelup-grid') ? 3
               : gridContainer.classList.contains('ach-grid') ? 3
               : 4;
    }

    if (now > this._menuNavCooldown) {
      if (navDown) {
        this._menuFocusIndex = (this._menuFocusIndex + gridCols) % buttons.length;
        this._menuNavCooldown = now + Gamepad.menuNavInterval;
      } else if (navUp) {
        this._menuFocusIndex = (this._menuFocusIndex - gridCols + buttons.length * 2) % buttons.length;
        this._menuNavCooldown = now + Gamepad.menuNavInterval;
      } else if (navRight) {
        this._menuFocusIndex = (this._menuFocusIndex + 1) % buttons.length;
        this._menuNavCooldown = now + Gamepad.menuNavInterval;
      } else if (navLeft) {
        this._menuFocusIndex = (this._menuFocusIndex - 1 + buttons.length) % buttons.length;
        this._menuNavCooldown = now + Gamepad.menuNavInterval;
      }
    }

    // ✨ Aplicar .focused con auto-scroll
    buttons.forEach((b, i) => {
      if (i === this._menuFocusIndex) {
        if (!b.classList.contains('focused')) {
          b.classList.add('focused');
          const scrollParent = b.closest('.ach-grid, .shop-grid, .overlay');
          if (scrollParent && scrollParent !== document.body) {
            if (scrollParent.classList.contains('overlay')) {
              if (typeof b.scrollIntoView === 'function') {
                try { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch(e) {}
              }
            } else {
              const bTop = b.offsetTop;
              const bBottom = bTop + b.offsetHeight;
              const pTop = scrollParent.scrollTop;
              const pBottom = pTop + scrollParent.clientHeight;
              if (bTop < pTop) {
                scrollParent.scrollTop = bTop - 8;
              } else if (bBottom > pBottom) {
                scrollParent.scrollTop = bBottom - scrollParent.clientHeight + 8;
              }
            }
          }
        }
      } else {
        b.classList.remove('focused');
      }
    });

    if (Gamepad.justPressedUI(Gamepad.MAPPING.confirm)) {
      const el = buttons[this._menuFocusIndex];
      if (el) { Audio2.click(); el.click(); }
    }
    if (Gamepad.justPressedUI(Gamepad.MAPPING.cancel)) {
      this.goBack();
    }
  },
};

/* ================================================================
   INIT
   ================================================================ */
window.addEventListener('load', () => {
  PlayerCustomization.init();
  Game.init();
  UI.init();
  Gamepad.init();
  document.body.addEventListener('click', () => Audio2.init(), { once: true });
  setInterval(() => {
    if (Game.battleActive && !Game.paused) UI.updateAbilityCooldowns();
  }, 100);
  console.log('❄ ICE RUN v14 — XP dura + Animación foco + Reto por piso');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && Game.battleActive && !Game.paused) Game.togglePause();
});
