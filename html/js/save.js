const Save = {
  KEY: 'iceRun_v14',
  defaults() {
    return {
      bestFloor:0, totalRuns:0, totalKills:0, metaCoins:0, metaGems:0,
      totalWins:0,
      totalUpgradesBought:0,
      bestLevelReached:1,
      totalGachaRolls:0,
      bestItemsInRun:0,
      bestSynergiesInRun:0,
      totalObstaclesDestroyed:0,
      totalConsumablesUsed:0,
      achievements: {},
      upgrades: { atk:0, def:0, maxHp:0, speed:0, crit:0 },
      options: { volume:70, sfx:80, minimap:true, difficulty:'normal' },
      customization: { sprite:'default', p1:'default', p2:'personaje-1' },
      keybinds: {
        up:'w', down:'s', left:'a', right:'d',
        pause:'escape',
        basic:'z',
        melee:'e',
        long:'q',
        dash:'shift',
        block:'f',
        inventory:'i',
      },
    };
  },
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return this.defaults();
      const d = JSON.parse(raw);
      const def = this.defaults();
      return {
        ...def, ...d,
        upgrades: { ...def.upgrades, ...(d.upgrades||{}) },
        options:  { ...def.options,  ...(d.options||{}) },
        customization: { ...def.customization, ...(d.customization||{}) },
        keybinds: { ...def.keybinds, ...(d.keybinds||{}) },
        achievements: { ...(d.achievements||{}) },
      };
    } catch { return this.defaults(); }
  },
  write() { try { localStorage.setItem(this.KEY, JSON.stringify(save)); } catch {} },
  clear() { try { localStorage.removeItem(this.KEY); } catch {} },
};
let save = Save.load();
