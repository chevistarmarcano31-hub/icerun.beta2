/* ================================================================
   ICE RUN — game.js v14 COMPLETO
   - ⚖️ XP más dura por nivel (curva 20 × 1.45^n)
   - ✨ Animación clara de foco (scale + pulse + glow)
   - 🗺️ Reto aleatorio por piso con efectos reales
   - 🎮 Gamepad completo (HUD adaptativo, navegación, back)
   ================================================================ */
'use strict';

const CFG = {
  W: 960, H: 640,
  WALL: 30, DOOR_W: 80,
  PLAYER: {
    size: 16, hp: 100, speed: 3.2, atk: 10, def: 0,
    atkSpeed: 300, crit: 0.05, range: 320, invulnTime: 500,
    dashDistance: 140, dashCooldown: 1800, dashDuration: 180,
  },
  BASIC: { speed: 10, life: 900, size: 5, cooldown: 500, damageMul: 1.0 },
  MELEE: {
    range: 82, arc: Math.PI * 0.6, cooldown: 400, activeTime: 220,
    damageMul: 2.0, knockback: 26,
  },
  BLOCK: {
    cooldown: 10, activeTime: 360, damageReduction: 0.85,
  },
  LONG: {
    speed: 5.5, life: 1800, size: 22, cooldown: 3500,
    damageMul: 4.0, slowDuration: 2500, explodeRadius: 120, explodeDamageMul: 2.5,
  },
  ENEMY: { hp: 12, speed: 1.2, damage: 6, size: 14 },
  MAX_FLOORS: 10,
  COOP_MAX_FLOORS: 12,
  ENDLESS_UNLOCK: 5,
};

const RARITY = {
  common: { key:'common', label:'Común',      color:'#7a9ab0', priceMul:1.0, statMul:1.0 },
  rare:   { key:'rare',   label:'Raro',       color:'#00e5ff', priceMul:1.5, statMul:1.35 },
  epic:   { key:'epic',   label:'Épico',      color:'#7b61ff', priceMul:2.3, statMul:1.7 },
  legend: { key:'legend', label:'Legendario', color:'#ff9b3d', priceMul:3.5, statMul:2.2 },
};

const ITEMS_DB = [
  { id:'neonSword',    icon:'⚔️', name:'Espada Neón',       desc:'+8 ATK',                  baseCost:40,  rarity:'common', stats:{atk:8} },
  { id:'glacialBlade', icon:'🗡️', name:'Filo Glacial',      desc:'+14 ATK',                 baseCost:80,  rarity:'rare',   stats:{atk:14} },
  { id:'frostAxe',     icon:'🪓', name:'Hacha Escarcha',    desc:'+20 ATK, -5% VEL',        baseCost:110, rarity:'rare',   stats:{atk:20, speed:-0.15} },
  { id:'iceWand',      icon:'🪄', name:'Cetro de Hielo',    desc:'+12 ATK, +80 Rango',      baseCost:100, rarity:'rare',   stats:{atk:12, range:80} },
  { id:'daggerFrozen', icon:'🔪', name:'Daga Congelada',    desc:'+6 ATK, +25% ATK SPD',    baseCost:90,  rarity:'rare',   stats:{atk:6, atkSpeed:0.25} },
  { id:'iceShield',    icon:'🛡️', name:'Escudo de Hielo',   desc:'+5 DEF',                  baseCost:40,  rarity:'common', stats:{def:5} },
  { id:'glacialArmor', icon:'🥋', name:'Armadura Glacial',  desc:'+10 DEF, +8 HP',          baseCost:130, rarity:'rare',   stats:{def:10, maxHp:8} },
  { id:'frostCloak',   icon:'🧥', name:'Capa Escarcha',     desc:'+6 DEF, +8% CRIT',        baseCost:90,  rarity:'rare',   stats:{def:6, crit:0.08} },
  { id:'iceHelm',      icon:'⛑️', name:'Yelmo Ártico',      desc:'+4 DEF, +6 HP',           baseCost:75,  rarity:'common', stats:{def:4, maxHp:6} },
  { id:'frozenHeart',  icon:'💙', name:'Corazón Congelado', desc:'+18 HP',                  baseCost:80,  rarity:'common', stats:{maxHp:18} },
  { id:'crystalHeart', icon:'💎', name:'Corazón de Cristal',desc:'+30 HP',                  baseCost:160, rarity:'rare',   stats:{maxHp:30} },
  { id:'titanHeart',   icon:'❤️‍🔥', name:'Corazón de Titán', desc:'+45 HP, -10% VEL',        baseCost:220, rarity:'epic',   stats:{maxHp:45, speed:-0.10} },
  { id:'iceBoots',     icon:'🥾', name:'Botas de Hielo',    desc:'+25% VEL',                baseCost:50,  rarity:'common', stats:{speed:0.25} },
  { id:'windBoots',    icon:'👟', name:'Botas del Viento',  desc:'+50% VEL',                baseCost:120, rarity:'rare',   stats:{speed:0.50} },
  { id:'phantomBoots', icon:'👢', name:'Botas Fantasma',    desc:'+40% VEL, +10% CRIT',     baseCost:150, rarity:'epic',   stats:{speed:0.40, crit:0.10} },
  { id:'glacialRing',  icon:'💍', name:'Anillo Glacial',    desc:'+10% CRIT',               baseCost:70,  rarity:'common', stats:{crit:0.10} },
  { id:'critAmulet',   icon:'🧿', name:'Amuleto Crítico',   desc:'+18% CRIT',               baseCost:140, rarity:'rare',   stats:{crit:0.18} },
  { id:'assassinMask', icon:'🎭', name:'Máscara Asesina',   desc:'+25% CRIT, +5 ATK',       baseCost:200, rarity:'epic',   stats:{crit:0.25, atk:5} },
  { id:'quickGloves',  icon:'🧤', name:'Guantes Rápidos',   desc:'+20% ATK SPD',            baseCost:60,  rarity:'common', stats:{atkSpeed:0.20} },
  { id:'hasteRing',    icon:'💫', name:'Anillo de Prisa',   desc:'+40% ATK SPD',            baseCost:150, rarity:'epic',   stats:{atkSpeed:0.40} },
];

const CONSUMABLES_DB = [
  { id:'potion_hp',     icon:'🧪', name:'Poción de Vida',     desc:'Restaura 25 HP.',              baseCost:55,  rarity:'common', maxStack:2, effect:'heal',     value:25 },
  { id:'potion_hp_big', icon:'🍷', name:'Elixir Glacial',     desc:'Restaura 55 HP.',              baseCost:120, rarity:'rare',   maxStack:1, effect:'heal',     value:55 },
  { id:'bomb_frost',    icon:'💣', name:'Bomba de Escarcha',  desc:'60 daño en área + slow 3s.',   baseCost:40,  rarity:'rare',   maxStack:3, effect:'bomb',     value:60, radius:140, slowDuration:3000 },
  { id:'shield_temp',   icon:'🛡️', name:'Escudo Temporal',   desc:'Inmunidad total durante 4s.',  baseCost:50,  rarity:'rare',   maxStack:2, effect:'shield',   value:4000 },
  { id:'rage_temp',     icon:'🔥', name:'Furia Carmesí',      desc:'+60% ATK y +30% VEL 6s.',      baseCost:60,  rarity:'epic',   maxStack:2, effect:'rage',     value:6000 },
  { id:'time_slow',     icon:'⏳', name:'Reloj de Hielo',     desc:'Ralentiza todo durante 5s.',   baseCost:70,  rarity:'epic',   maxStack:2, effect:'timeslow', value:5000 },
  { id:'blink_scroll',  icon:'📜', name:'Pergamino de Blink', desc:'Teletransporta 200 px.',       baseCost:35,  rarity:'common', maxStack:4, effect:'blink',    value:200 },
  { id:'magnet',        icon:'🧲', name:'Imán Arcano',        desc:'Atrae monedas del mapa.',      baseCost:30,  rarity:'common', maxStack:3, effect:'magnet',   value:0 },
];

const SHOP_STALLS = [
  { id:'potions',  icon:'🧪', color:'#7bff9f', name:'Botica',              desc:'Pociones y elixires',   stock:['potion_hp','magnet','blink_scroll'] },
  { id:'bombs',    icon:'💣', color:'#ff9b3d', name:'Armería',             desc:'Bombas y explosivos',   stock:['bomb_frost','time_slow','rage_temp','shield_temp'] },
  { id:'swords',   icon:'⚔️', color:'#00e5ff', name:'Herrería',            desc:'Espadas y filos',       stock:['neonSword','glacialBlade','frostAxe','iceWand','daggerFrozen'] },
  { id:'armor',    icon:'🛡️', color:'#7dffff', name:'Armería de placas',   desc:'Defensas y escudos',    stock:['iceShield','glacialArmor','frostCloak','iceHelm','frozenHeart','crystalHeart','titanHeart'] },
  { id:'boots',    icon:'🥾', color:'#b48aff', name:'Zapatería',           desc:'Botas y velocidad',     stock:['iceBoots','windBoots','phantomBoots'] },
  { id:'trinkets', icon:'💍', color:'#ffd54f', name:'Reliquias',           desc:'Anillos y amuletos',    stock:['glacialRing','critAmulet','assassinMask','quickGloves','hasteRing'] },
];

const GACHA_POOL = [
  { id:'g_atk1',   icon:'⚔️', name:'+3 ATK',            rarity:'common', weight:35, apply:{atk:3} },
  { id:'g_def1',   icon:'🛡️', name:'+2 DEF',            rarity:'common', weight:30, apply:{def:2} },
  { id:'g_hp1',    icon:'❤️', name:'+8 HP',             rarity:'common', weight:20, apply:{maxHp:8} },
  { id:'g_spd1',   icon:'💨', name:'+0.15 VEL',         rarity:'common', weight:25, apply:{speed:0.15} },
  { id:'g_crit1',  icon:'🎯', name:'+3% CRIT',          rarity:'common', weight:25, apply:{crit:0.03} },
  { id:'g_atk2',   icon:'🗡️', name:'+7 ATK',            rarity:'rare',   weight:15, apply:{atk:7} },
  { id:'g_def2',   icon:'🥋', name:'+5 DEF',            rarity:'rare',   weight:15, apply:{def:5} },
  { id:'g_hp2',    icon:'💙', name:'+18 HP',            rarity:'rare',   weight:10, apply:{maxHp:18} },
  { id:'g_spd2',   icon:'👟', name:'+0.35 VEL',         rarity:'rare',   weight:12, apply:{speed:0.35} },
  { id:'g_crit2',  icon:'🧿', name:'+8% CRIT',          rarity:'rare',   weight:12, apply:{crit:0.08} },
  { id:'g_aspd1',  icon:'🧤', name:'+20% ATK SPD',      rarity:'rare',   weight:12, apply:{atkSpeed:0.20} },
  { id:'g_atk3',   icon:'🔥', name:'+15 ATK',           rarity:'epic',   weight:5,  apply:{atk:15} },
  { id:'g_hp3',    icon:'💎', name:'+35 HP',            rarity:'epic',   weight:3,  apply:{maxHp:35} },
  { id:'g_crit3',  icon:'🎭', name:'+15% CRIT',         rarity:'epic',   weight:5,  apply:{crit:0.15} },
  { id:'g_spd3',   icon:'💫', name:'+0.6 VEL, +5 DEF',  rarity:'epic',   weight:4,  apply:{speed:0.6, def:5} },
  { id:'g_legend1',icon:'👑', name:'+25 ATK, +10 DEF',  rarity:'legend', weight:2,  apply:{atk:25, def:10} },
  { id:'g_legend2',icon:'💠', name:'+60 HP, +0.4 VEL',  rarity:'legend', weight:1,  apply:{maxHp:60, speed:0.4} },
  { id:'g_legend3',icon:'🌟', name:'+30% CRIT, +10 ATK',rarity:'legend', weight:1,  apply:{crit:0.30, atk:10} },
];

const LEVELUP_POOL = [
  { id:'lu_atk',    icon:'⚔️', name:'Filo Afilado',   desc:'+4 ATK',                    rarity:'common', apply:{atk:4} },
  { id:'lu_hp',     icon:'❤️', name:'Vitalidad',      desc:'+12 HP máx',                rarity:'common', apply:{maxHp:12} },
  { id:'lu_def',    icon:'🛡️', name:'Piel de Hielo',  desc:'+3 DEF',                    rarity:'common', apply:{def:3} },
  { id:'lu_spd',    icon:'💨', name:'Pies Ligeros',   desc:'+0.2 VEL',                  rarity:'common', apply:{speed:0.2} },
  { id:'lu_crit',   icon:'🎯', name:'Ojo Preciso',    desc:'+4% CRIT',                  rarity:'common', apply:{crit:0.04} },
  { id:'lu_aspd',   icon:'🧤', name:'Manos Rápidas',  desc:'+12% ATK SPD',              rarity:'common', apply:{atkSpeed:0.12} },
  { id:'lu_range',  icon:'📡', name:'Alcance',        desc:'+50 Rango',                 rarity:'common', apply:{range:50} },
  { id:'lu_heal',   icon:'🧪', name:'Vendaje',        desc:'Cura 20% de HP',            rarity:'common', healPct:0.20 },
  { id:'lu_atk2',   icon:'🗡️', name:'Filo Mayor',     desc:'+9 ATK',                    rarity:'rare', minLevel:3, apply:{atk:9} },
  { id:'lu_hp2',    icon:'💙', name:'Corazón Firme',  desc:'+25 HP máx',                rarity:'rare', minLevel:3, apply:{maxHp:25} },
  { id:'lu_def2',   icon:'🥋', name:'Armadura',       desc:'+6 DEF',                    rarity:'rare', minLevel:3, apply:{def:6} },
  { id:'lu_spd2',   icon:'👟', name:'Viento',         desc:'+0.4 VEL',                  rarity:'rare', minLevel:3, apply:{speed:0.4} },
  { id:'lu_crit2',  icon:'🧿', name:'Foco Letal',     desc:'+9% CRIT',                  rarity:'rare', minLevel:3, apply:{crit:0.09} },
  { id:'lu_aspd2',  icon:'⚡', name:'Sobrecarga',     desc:'+25% ATK SPD',              rarity:'rare', minLevel:3, apply:{atkSpeed:0.25} },
  { id:'lu_lifestl',icon:'🩸', name:'Sanguijuela',    desc:'+4% robo de vida',          rarity:'rare', minLevel:3, lifesteal:0.04 },
  { id:'lu_cd',     icon:'♻️', name:'Recarga',        desc:'-15% cooldown dash/melee',  rarity:'rare', minLevel:3, cooldownMul:0.85 },
  { id:'lu_atk3',   icon:'🔥', name:'Furia',          desc:'+18 ATK',                   rarity:'epic', minLevel:6, apply:{atk:18} },
  { id:'lu_hp3',    icon:'💎', name:'Coloso',         desc:'+40 HP máx + cura 8%',      rarity:'epic', minLevel:6, apply:{maxHp:40}, healPct:0.08 },
  { id:'lu_crit3',  icon:'🎭', name:'Asesino',        desc:'+18% CRIT',                 rarity:'epic', minLevel:6, apply:{crit:0.18} },
  { id:'lu_cleave', icon:'🌪️', name:'Torbellino',     desc:'+40% área de melee',        rarity:'epic', minLevel:6, meleeArcBonus:0.4 },
  { id:'lu_multi',  icon:'🌟', name:'Multidisparo',   desc:'+1 proyectil básico',       rarity:'epic', minLevel:6, extraBasicProj:1 },
  { id:'lu_exec',   icon:'💀', name:'Ejecutor',       desc:'+30% daño a enemigos <30% HP', rarity:'epic', minLevel:6, executeThreshold:0.3 },
  { id:'lu_legend1',icon:'👑', name:'Avatar Glacial', desc:'+30 ATK, +15 DEF, +0.5 VEL',rarity:'legend', minLevel:10, apply:{atk:30, def:15, speed:0.5} },
  { id:'lu_legend2',icon:'💠', name:'Inmortal',       desc:'+80 HP y revives 1 vez al 30%', rarity:'legend', minLevel:10, apply:{maxHp:80}, revive:true, revivePct:0.3 },
  { id:'lu_legend3',icon:'🌟', name:'Dios del Hielo', desc:'+40% CRIT, +25% ATK SPD',   rarity:'legend', minLevel:10, apply:{crit:0.4, atkSpeed:0.25} },
  { id:'lu_legend4',icon:'🌊', name:'Marea',          desc:'Dispara 3 proyectiles en abanico', rarity:'legend', minLevel:10, fanBasic:3 },
];

const SYNERGIES = [
  { ids:['neonSword','glacialBlade'],   name:'Filos Gemelos',    bonus:{atk:15} },
  { ids:['windBoots','phantomBoots'],   name:'Paso Veloz',       bonus:{speed:0.30} },
  { ids:['critAmulet','assassinMask'],  name:'Precisión Letal',  bonus:{crit:0.15} },
  { ids:['crystalHeart','titanHeart'],  name:'Corazón Titánico', bonus:{maxHp:20} },
  { ids:['quickGloves','hasteRing'],    name:'Ráfaga Glacial',   bonus:{atkSpeed:0.25} },
];

const ENEMY_TYPES = {
  melee_basic: { icon:'👹', size:14, baseHp:10, speed:1.4, damage:4, color:'#ff5577', behavior:'melee_spin', attackRate:3000, attackRadius:72, elite:false },
  melee_elite: { icon:'👺', size:22, baseHp:45, speed:0.75, damage:8, color:'#ff3d71', behavior:'melee_spin', attackRate:3000, attackRadius:100, elite:true },
  ranged_basic: { icon:'👻', size:14, baseHp:14, speed:1.1, damage:4, color:'#b48aff', behavior:'shoot_slow', shootRate:1600, shootSpeed:3, shootDamage:5, keepDist:220, elite:false },
  ranged_elite: { icon:'🧙', size:20, baseHp:38, speed:1.0, damage:6, color:'#7dffff', behavior:'shoot_burst', shootRate:2000, burstCount:3, burstDelay:140, shootSpeed:4, shootDamage:8, slowDuration:1800, keepDist:260, repositionRate:1400, elite:true },
  frostling: { icon:'🧊', name:'Frostling', size:13, baseHp:16, speed:1.8, damage:4, color:'#7dffff', behavior:'melee_aggressive', attackRate:3000, attackRadius:72, elite:false },
  frostling_elite: { icon:'❄️', name:'Frostling Élite', size:19, baseHp:58, speed:1.15, damage:6, color:'#00e5ff', behavior:'melee_aggressive', attackRate:3000, attackRadius:98, elite:true, pulseCount:2 },
  ice_hound: { icon:'🐺', name:'Sabueso de Hielo', size:14, baseHp:20, speed:2.1, damage:4, color:'#8ce8ff', behavior:'melee_assassin', attackRate:3000, attackRadius:62, elite:false, lunge:true },
  ice_hound_elite: { icon:'🐺', name:'Sabueso Alfa', size:21, baseHp:68, speed:1.45, damage:7, color:'#39bde8', behavior:'melee_assassin', attackRate:3000, attackRadius:88, elite:true, lunge:true, lungeDistance:54 },
  shard_knight: { icon:'🗡️', name:'Caballero de Fragmentos', size:16, baseHp:28, speed:1.25, damage:5, color:'#b48aff', behavior:'melee_charge', attackRate:3000, attackRadius:82, elite:false, chargeDistance:28 },
  shard_knight_elite: { icon:'⚔️', name:'Caballero Glacial', size:23, baseHp:82, speed:0.95, damage:8, color:'#9c7cff', behavior:'melee_charge', attackRate:3000, attackRadius:112, elite:true, pulseCount:3, chargeDistance:70 },
  rime_brute: { icon:'🗿', name:'Bruto de Escarcha', size:19, baseHp:42, speed:0.9, damage:6, color:'#7a9ab0', behavior:'melee_tank', attackRate:3000, attackRadius:92, elite:false },
  rime_brute_elite: { icon:'🗿', name:'Bruto Rúnico', size:27, baseHp:115, speed:0.7, damage:9, color:'#547d9b', behavior:'melee_tank', attackRate:3000, attackRadius:128, elite:true, pulseCount:3 },
  void_reaver: { icon:'👾', name:'Segador del Vacío', size:15, baseHp:25, speed:1.65, damage:5, color:'#d86cff', behavior:'melee_berserk', attackRate:3000, attackRadius:76, elite:false, berserkSpeed:1.35 },
  void_reaver_elite: { icon:'👾', name:'Segador Abisal', size:24, baseHp:96, speed:1.1, damage:8, color:'#a12eff', behavior:'melee_berserk', attackRate:3000, attackRadius:118, elite:true, lunge:true, pulseCount:2, berserkSpeed:1.6 },
  frost_archer: { icon:'🏹', name:'Arquero de Escarcha', size:13, baseHp:18, speed:1.05, damage:3, color:'#a9a0ff', behavior:'ranged_single', shootRate:3000, shootSpeed:4.5, shootDamage:4, keepDist:250, elite:false },
  frost_archer_elite: { icon:'🏹', name:'Arquero Boreal', size:19, baseHp:62, speed:0.95, damage:5, color:'#67e6ff', behavior:'ranged_fan', shootRate:3000, volleyCount:5, volleySpread:0.16, shootSpeed:5, shootDamage:7, keepDist:290, elite:true },
  crystal_sentinel: { icon:'🔷', name:'Centinela de Cristal', size:15, baseHp:24, speed:0.8, damage:4, color:'#68d9ff', behavior:'ranged_homing', shootRate:3000, shootSpeed:3.2, shootDamage:5, keepDist:270, elite:false },
  crystal_sentinel_elite: { icon:'💠', name:'Centinela Prismático', size:22, baseHp:78, speed:0.75, damage:5, color:'#00c8ff', behavior:'ranged_homing', shootRate:3000, orbCount:3, shootSpeed:3.4, shootDamage:8, keepDist:310, elite:true },
  dusk_witch: { icon:'🧙', name:'Bruja del Crepúsculo', size:14, baseHp:22, speed:1.0, damage:4, color:'#c47dff', behavior:'ranged_slow', shootRate:3000, shootSpeed:3.8, shootDamage:5, slowDuration:1800, keepDist:230, elite:false },
  dusk_witch_elite: { icon:'🧙‍♀️', name:'Bruja del Eclipse', size:21, baseHp:72, speed:0.9, damage:6, color:'#8b42d6', behavior:'ranged_slow', shootRate:3000, orbCount:5, shootSpeed:4.2, shootDamage:8, slowDuration:2600, keepDist:280, elite:true },
  storm_ranger: { icon:'🏹', name:'Explorador de Tormenta', size:14, baseHp:26, speed:1.35, damage:4, color:'#9fe8ff', behavior:'ranged_burst', shootRate:3000, burstCount:3, burstDelay:140, shootSpeed:5.2, shootDamage:5, keepDist:210, elite:false },
  storm_ranger_elite: { icon:'⚡', name:'Ranger de la Tormenta', size:21, baseHp:88, speed:1.1, damage:6, color:'#ffe45e', behavior:'ranged_burst', shootRate:3000, burstCount:5, burstDelay:120, shootSpeed:5.8, shootDamage:9, keepDist:260, elite:true },
  bone_sniper: { icon:'💀', name:'Francotirador Óseo', size:14, baseHp:30, speed:0.7, damage:5, color:'#d6d0bd', behavior:'ranged_single', shootRate:3000, shootSpeed:5, shootDamage:6, keepDist:340, elite:false },
  bone_sniper_elite: { icon:'☠️', name:'Ojo de la Cripta', size:22, baseHp:100, speed:0.65, damage:7, color:'#fff0b2', behavior:'ranged_homing', shootRate:3000, orbCount:4, shootSpeed:5.5, shootDamage:10, keepDist:370, elite:true },
};

const CHALLENGE_ROOMS = [
  { id:'swarm', icon:'🐝', name:'Cámara del Enjambre', desc:'Más enemigos, pero cada baja otorga monedas extra.', enemyCountMul:1.6, rewardCoins:20 },
  { id:'crossfire', icon:'🎯', name:'Cámara del Fuego Cruzado', desc:'Los arqueros aparecen reforzados.', rangedEliteBias:true, rewardCoins:24 },
  { id:'gauntlet', icon:'⚔️', name:'Cámara del Duelista', desc:'Solo criaturas cuerpo a cuerpo élite.', meleeEliteBias:true, rewardCoins:28 },
  { id:'survival', icon:'⏳', name:'Cámara de Supervivencia', desc:'Enemigos más rápidos durante la sala.', enemySpeedMul:1.3, rewardCoins:30 },
];
const BOSS_TYPES = [
  { name:'Escarcha Menor',   icon:'❄',  hp:300,  speed:1.0, atkRate:1100, minionCount:3, patterns:['fan','charge','circle'] },
  { name:'Golem de Hielo',   icon:'⛰',  hp:450,  speed:0.8, atkRate:1050, minionCount:3, patterns:['fan','slam','ring'] },
  { name:'Espectro Gélido',  icon:'👻', hp:600,  speed:1.4, atkRate:950,  minionCount:4, patterns:['spiral','charge','homing'] },
  { name:'Serpiente Ártica', icon:'🐍', hp:800,  speed:1.2, atkRate:900,  minionCount:4, patterns:['fan','wall','charge'] },
  { name:'Titán Congelado',  icon:'🗿', hp:1050, speed:0.7, atkRate:850,  minionCount:5, patterns:['ring','slam','spiral'] },
  { name:'Reina del Hielo',  icon:'👑', hp:1300, speed:1.3, atkRate:800,  minionCount:5, patterns:['fan','spiral','homing'] },
  { name:'Dragón Boreal',    icon:'🐲', hp:1600, speed:1.1, atkRate:720,  minionCount:6, patterns:['wall','charge','circle'] },
  { name:'Nigromante Frío',  icon:'💀', hp:1900, speed:1.0, atkRate:680,  minionCount:6, patterns:['homing','ring','spiral'] },
  { name:'Avatar Glacial',   icon:'🔷', hp:2300, speed:1.2, atkRate:600,  minionCount:7, patterns:['spiral','fan','charge'] },
  { name:'ICE CORE Ω',       icon:'💎', hp:3000, speed:1.5, atkRate:500,  minionCount:8, patterns:['spiral','circle','fan'] },
];

const ACHIEVEMENTS_DB = [
  { id:'kill_10',      icon:'⚔️', name:'Primer Sangre',    desc:'Mata 10 enemigos totales.',           goal:10,   stat:'totalKills' },
  { id:'kill_100',     icon:'🗡️', name:'Cazador',          desc:'Mata 100 enemigos totales.',          goal:100,  stat:'totalKills' },
  { id:'kill_500',     icon:'💀', name:'Verdugo',          desc:'Mata 500 enemigos totales.',          goal:500,  stat:'totalKills' },
  { id:'kill_2000',    icon:'☠️', name:'Segador',          desc:'Mata 2000 enemigos totales.',         goal:2000, stat:'totalKills' },
  { id:'floor_1',      icon:'❄️', name:'Escalador',        desc:'Llega al piso 2.',                    goal:2,    stat:'bestFloor' },
  { id:'floor_3',      icon:'🏔️', name:'Alpinista',        desc:'Llega al piso 4.',                    goal:4,    stat:'bestFloor' },
  { id:'floor_5',      icon:'🧗', name:'Conquistador',     desc:'Llega al piso 6.',                    goal:6,    stat:'bestFloor' },
  { id:'floor_10',     icon:'👑', name:'Rey del Hielo',    desc:'Llega al piso 10.',                   goal:10,   stat:'bestFloor' },
  { id:'run_1',        icon:'🚀', name:'Primera Run',      desc:'Completa tu primera partida.',        goal:1,    stat:'totalRuns' },
  { id:'run_10',       icon:'🎯', name:'Veterano',         desc:'Juega 10 runs.',                      goal:10,   stat:'totalRuns' },
  { id:'run_50',       icon:'🏅', name:'Adicto',           desc:'Juega 50 runs.',                      goal:50,   stat:'totalRuns' },
  { id:'win_1',        icon:'🏆', name:'Vencedor',         desc:'Gana 1 run completa.',                goal:1,    stat:'totalWins' },
  { id:'win_5',        icon:'🌟', name:'Leyenda',          desc:'Gana 5 runs completas.',              goal:5,    stat:'totalWins' },
  { id:'coins_100',    icon:'🪙', name:'Ahorrador',        desc:'Acumula 100 monedas meta.',           goal:100,  stat:'metaCoins' },
  { id:'coins_1000',   icon:'💰', name:'Magnate',          desc:'Acumula 1000 monedas meta.',          goal:1000, stat:'metaCoins' },
  { id:'upgrade_5',    icon:'⬆️', name:'Aprendiz',         desc:'Compra 5 mejoras permanentes.',       goal:5,    stat:'totalUpgradesBought' },
  { id:'upgrade_20',   icon:'📈', name:'Inversor',         desc:'Compra 20 mejoras permanentes.',      goal:20,   stat:'totalUpgradesBought' },
  { id:'level_5',      icon:'⭐', name:'Ascendido',        desc:'Alcanza el nivel 5 en una run.',      goal:5,    stat:'bestLevelReached' },
  { id:'level_10',     icon:'✨', name:'Trascendido',      desc:'Alcanza el nivel 10 en una run.',     goal:10,   stat:'bestLevelReached' },
  { id:'level_20',     icon:'🌠', name:'Iluminado',        desc:'Alcanza el nivel 20 en una run.',     goal:20,   stat:'bestLevelReached' },
  { id:'gacha_10',     icon:'🎰', name:'Jugador',          desc:'Gira el gacha 10 veces.',             goal:10,   stat:'totalGachaRolls' },
  { id:'gacha_100',    icon:'🎲', name:'Dados Cargados',   desc:'Gira el gacha 100 veces.',            goal:100,  stat:'totalGachaRolls' },
  { id:'items_10',     icon:'📦', name:'Coleccionista',    desc:'Recoge 10 items en una run.',         goal:10,   stat:'bestItemsInRun' },
  { id:'items_20',     icon:'🎁', name:'Acaparador',       desc:'Recoge 20 items en una run.',         goal:20,   stat:'bestItemsInRun' },
  { id:'syn_1',        icon:'🔗', name:'Sinergia',         desc:'Activa 1 sinergia en una run.',       goal:1,    stat:'bestSynergiesInRun' },
  { id:'syn_3',        icon:'🕸️', name:'Malla Perfecta',   desc:'Activa 3 sinergias en una run.',      goal:3,    stat:'bestSynergiesInRun' },
  { id:'obstacles_50', icon:'🪨', name:'Demoledor',        desc:'Destruye 50 obstáculos.',             goal:50,   stat:'totalObstaclesDestroyed' },
  { id:'obstacles_200',icon:'🧨', name:'Triturador',       desc:'Destruye 200 obstáculos.',            goal:200,  stat:'totalObstaclesDestroyed' },
  { id:'consume_10',   icon:'🧪', name:'Boticario',        desc:'Usa 10 consumibles.',                 goal:10,   stat:'totalConsumablesUsed' },
  { id:'consume_50',   icon:'⚗️', name:'Alquimista',       desc:'Usa 50 consumibles.',                 goal:50,   stat:'totalConsumablesUsed' },
];

/* ================================================================
   🗺️ RETOS DEL PISO — se elige uno aleatorio por cada piso nuevo
   Cada reto tiene un modificador real (afecta al gameplay) y uno visual.
   ================================================================ */
const FLOOR_CHALLENGES = [
  {
    id:'no_heal',
    icon:'🚫',
    name:'Sin Curación',
    desc:'Las pociones y curas no funcionan durante este piso.',
    severity:'extreme',
    apply: { blockHeal: true },
  },
  {
    id:'fast_enemies',
    icon:'💨',
    name:'Vientos Helados',
    desc:'Los enemigos son un 25% más rápidos.',
    severity:'hard',
    apply: { enemySpeedMul: 1.25 },
  },
  {
    id:'double_damage_half_hp',
    icon:'⚡',
    name:'Pacto de Sangre',
    desc:'Tu daño ×2 pero tu vida máxima se reduce un 30%.',
    severity:'extreme',
    apply: { playerDmgMul: 2.0, playerMaxHpMul: 0.7, onceOnStart: true },
  },
  {
    id:'glass_cannon',
    icon:'💥',
    name:'Cañón de Cristal',
    desc:'Infliges +60% de daño pero recibes +50% de daño.',
    severity:'hard',
    apply: { playerDmgMul: 1.6, playerDamageTakenMul: 1.5 },
  },
  {
    id:'tank_mode',
    icon:'🛡️',
    name:'Piel de Hierro',
    desc:'+50% vida máxima pero -25% velocidad.',
    severity:'medium',
    apply: { playerMaxHpMul: 1.5, playerSpeedMul: 0.75, onceOnStart: true },
  },
  {
    id:'sniper',
    icon:'🎯',
    name:'Ojo de Halcón',
    desc:'+30% CRIT pero -20% cadencia de disparo.',
    severity:'medium',
    apply: { playerCritBonus: 0.30, playerFireRateMul: 1.2 },
  },
  {
    id:'swarm',
    icon:'🐝',
    name:'Enjambre',
    desc:'Aparecen 50% más enemigos pero cada uno tiene 30% menos vida.',
    severity:'hard',
    apply: { enemyCountMul: 1.5, enemyHpMul: 0.7, onceOnStart: true },
  },
  {
    id:'tanky_enemies',
    icon:'🐢',
    name:'Escudos Glaciales',
    desc:'Los enemigos tienen +40% de vida pero son 15% más lentos.',
    severity:'medium',
    apply: { enemyHpMul: 1.4, enemySpeedMul: 0.85 },
  },
  {
    id:'no_shield',
    icon:'🔓',
    name:'Fragilidad',
    desc:'Los escudos temporales no funcionan.',
    severity:'medium',
    apply: { blockShield: true },
  },
  {
    id:'double_gold',
    icon:'💰',
    name:'Fiebre del Oro',
    desc:'+80% monedas de todo tipo pero los enemigos hacen +20% daño.',
    severity:'medium',
    apply: { goldMul: 1.8, enemyDmgMul: 1.2 },
  },
  {
    id:'crit_hell',
    icon:'🗡️',
    name:'Golpes Certeros',
    desc:'Los críticos hacen ×3 daño pero tu vida se reduce un 20%.',
    severity:'hard',
    apply: { critDamageMul: 3, playerMaxHpMul: 0.8, onceOnStart: true },
  },
  {
    id:'slow_burn',
    icon:'🐌',
    name:'Hielo Espeso',
    desc:'+100% daño de ralentización pero -15% velocidad propia.',
    severity:'easy',
    apply: { playerSpeedMul: 0.85, slowBonus: 2.0 },
  },
];
const Util = {
  clamp: (v,a,b) => Math.max(a, Math.min(b, v)),
  dist:  (a,b) => Math.hypot(a.x-b.x, a.y-b.y),
  rand:  (a,b) => Math.random()*(b-a)+a,
  randInt: (a,b) => Math.floor(Math.random()*(b-a+1))+a,
  pick: arr => arr[Math.floor(Math.random()*arr.length)],
  weightedPick: (arr, weights) => {
    let total = 0;
    for (const w of weights) total += w;
    let r = Math.random() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= weights[i];
      if (r <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  },
  circleCollide: (a,b,ra,rb) => (a.x-b.x)**2+(a.y-b.y)**2 < (ra+rb)**2,
  pointInRect: (px, py, r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h,
  shuffle: arr => { for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; },
};
