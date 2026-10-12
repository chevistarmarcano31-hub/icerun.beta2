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
