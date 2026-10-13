
/* ===== config.js ===== */
/* ================================================================
   ICE RUN â€” game.js v14 COMPLETO
   - âš–ï¸ XP mÃ¡s dura por nivel (curva 20 Ã— 1.45^n)
   - âœ¨ AnimaciÃ³n clara de foco (scale + pulse + glow)
   - ðŸ—ºï¸ Reto aleatorio por piso con efectos reales
   - ðŸŽ® Gamepad completo (HUD adaptativo, navegaciÃ³n, back)
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
  common: { key:'common', label:'ComÃºn',      color:'#7a9ab0', priceMul:1.0, statMul:1.0 },
  rare:   { key:'rare',   label:'Raro',       color:'#00e5ff', priceMul:1.5, statMul:1.35 },
  epic:   { key:'epic',   label:'Ã‰pico',      color:'#7b61ff', priceMul:2.3, statMul:1.7 },
  legend: { key:'legend', label:'Legendario', color:'#ff9b3d', priceMul:3.5, statMul:2.2 },
};

const ITEMS_DB = [
  { id:'neonSword',    icon:'âš”ï¸', name:'Espada NeÃ³n',       desc:'+8 ATK',                  baseCost:40,  rarity:'common', stats:{atk:8} },
  { id:'glacialBlade', icon:'ðŸ—¡ï¸', name:'Filo Glacial',      desc:'+14 ATK',                 baseCost:80,  rarity:'rare',   stats:{atk:14} },
  { id:'frostAxe',     icon:'ðŸª“', name:'Hacha Escarcha',    desc:'+20 ATK, -5% VEL',        baseCost:110, rarity:'rare',   stats:{atk:20, speed:-0.15} },
  { id:'iceWand',      icon:'ðŸª„', name:'Cetro de Hielo',    desc:'+12 ATK, +80 Rango',      baseCost:100, rarity:'rare',   stats:{atk:12, range:80} },
  { id:'daggerFrozen', icon:'ðŸ”ª', name:'Daga Congelada',    desc:'+6 ATK, +25% ATK SPD',    baseCost:90,  rarity:'rare',   stats:{atk:6, atkSpeed:0.25} },
  { id:'iceShield',    icon:'ðŸ›¡ï¸', name:'Escudo de Hielo',   desc:'+5 DEF',                  baseCost:40,  rarity:'common', stats:{def:5} },
  { id:'glacialArmor', icon:'ðŸ¥‹', name:'Armadura Glacial',  desc:'+10 DEF, +8 HP',          baseCost:130, rarity:'rare',   stats:{def:10, maxHp:8} },
  { id:'frostCloak',   icon:'ðŸ§¥', name:'Capa Escarcha',     desc:'+6 DEF, +8% CRIT',        baseCost:90,  rarity:'rare',   stats:{def:6, crit:0.08} },
  { id:'iceHelm',      icon:'â›‘ï¸', name:'Yelmo Ãrtico',      desc:'+4 DEF, +6 HP',           baseCost:75,  rarity:'common', stats:{def:4, maxHp:6} },
  { id:'frozenHeart',  icon:'ðŸ’™', name:'CorazÃ³n Congelado', desc:'+18 HP',                  baseCost:80,  rarity:'common', stats:{maxHp:18} },
  { id:'crystalHeart', icon:'ðŸ’Ž', name:'CorazÃ³n de Cristal',desc:'+30 HP',                  baseCost:160, rarity:'rare',   stats:{maxHp:30} },
  { id:'titanHeart',   icon:'â¤ï¸â€ðŸ”¥', name:'CorazÃ³n de TitÃ¡n', desc:'+45 HP, -10% VEL',        baseCost:220, rarity:'epic',   stats:{maxHp:45, speed:-0.10} },
  { id:'iceBoots',     icon:'ðŸ¥¾', name:'Botas de Hielo',    desc:'+25% VEL',                baseCost:50,  rarity:'common', stats:{speed:0.25} },
  { id:'windBoots',    icon:'ðŸ‘Ÿ', name:'Botas del Viento',  desc:'+50% VEL',                baseCost:120, rarity:'rare',   stats:{speed:0.50} },
  { id:'phantomBoots', icon:'ðŸ‘¢', name:'Botas Fantasma',    desc:'+40% VEL, +10% CRIT',     baseCost:150, rarity:'epic',   stats:{speed:0.40, crit:0.10} },
  { id:'glacialRing',  icon:'ðŸ’', name:'Anillo Glacial',    desc:'+10% CRIT',               baseCost:70,  rarity:'common', stats:{crit:0.10} },
  { id:'critAmulet',   icon:'ðŸ§¿', name:'Amuleto CrÃ­tico',   desc:'+18% CRIT',               baseCost:140, rarity:'rare',   stats:{crit:0.18} },
  { id:'assassinMask', icon:'ðŸŽ­', name:'MÃ¡scara Asesina',   desc:'+25% CRIT, +5 ATK',       baseCost:200, rarity:'epic',   stats:{crit:0.25, atk:5} },
  { id:'quickGloves',  icon:'ðŸ§¤', name:'Guantes RÃ¡pidos',   desc:'+20% ATK SPD',            baseCost:60,  rarity:'common', stats:{atkSpeed:0.20} },
  { id:'hasteRing',    icon:'ðŸ’«', name:'Anillo de Prisa',   desc:'+40% ATK SPD',            baseCost:150, rarity:'epic',   stats:{atkSpeed:0.40} },
];

const CONSUMABLES_DB = [
  { id:'potion_hp',     icon:'ðŸ§ª', name:'PociÃ³n de Vida',     desc:'Restaura 25 HP.',              baseCost:55,  rarity:'common', maxStack:2, effect:'heal',     value:25 },
  { id:'potion_hp_big', icon:'ðŸ·', name:'Elixir Glacial',     desc:'Restaura 55 HP.',              baseCost:120, rarity:'rare',   maxStack:1, effect:'heal',     value:55 },
  { id:'bomb_frost',    icon:'ðŸ’£', name:'Bomba de Escarcha',  desc:'60 daÃ±o en Ã¡rea + slow 3s.',   baseCost:40,  rarity:'rare',   maxStack:3, effect:'bomb',     value:60, radius:140, slowDuration:3000 },
  { id:'shield_temp',   icon:'ðŸ›¡ï¸', name:'Escudo Temporal',   desc:'Inmunidad total durante 4s.',  baseCost:50,  rarity:'rare',   maxStack:2, effect:'shield',   value:4000 },
  { id:'rage_temp',     icon:'ðŸ”¥', name:'Furia CarmesÃ­',      desc:'+60% ATK y +30% VEL 6s.',      baseCost:60,  rarity:'epic',   maxStack:2, effect:'rage',     value:6000 },
  { id:'time_slow',     icon:'â³', name:'Reloj de Hielo',     desc:'Ralentiza todo durante 5s.',   baseCost:70,  rarity:'epic',   maxStack:2, effect:'timeslow', value:5000 },
  { id:'blink_scroll',  icon:'ðŸ“œ', name:'Pergamino de Blink', desc:'Teletransporta 200 px.',       baseCost:35,  rarity:'common', maxStack:4, effect:'blink',    value:200 },
  { id:'magnet',        icon:'ðŸ§²', name:'ImÃ¡n Arcano',        desc:'Atrae monedas del mapa.',      baseCost:30,  rarity:'common', maxStack:3, effect:'magnet',   value:0 },
];

const SHOP_STALLS = [
  { id:'potions',  icon:'ðŸ§ª', color:'#7bff9f', name:'Botica',              desc:'Pociones y elixires',   stock:['potion_hp','magnet','blink_scroll'] },
  { id:'bombs',    icon:'ðŸ’£', color:'#ff9b3d', name:'ArmerÃ­a',             desc:'Bombas y explosivos',   stock:['bomb_frost','time_slow','rage_temp','shield_temp'] },
  { id:'swords',   icon:'âš”ï¸', color:'#00e5ff', name:'HerrerÃ­a',            desc:'Espadas y filos',       stock:['neonSword','glacialBlade','frostAxe','iceWand','daggerFrozen'] },
  { id:'armor',    icon:'ðŸ›¡ï¸', color:'#7dffff', name:'ArmerÃ­a de placas',   desc:'Defensas y escudos',    stock:['iceShield','glacialArmor','frostCloak','iceHelm','frozenHeart','crystalHeart','titanHeart'] },
  { id:'boots',    icon:'ðŸ¥¾', color:'#b48aff', name:'ZapaterÃ­a',           desc:'Botas y velocidad',     stock:['iceBoots','windBoots','phantomBoots'] },
  { id:'trinkets', icon:'ðŸ’', color:'#ffd54f', name:'Reliquias',           desc:'Anillos y amuletos',    stock:['glacialRing','critAmulet','assassinMask','quickGloves','hasteRing'] },
];

const GACHA_POOL = [
  { id:'g_atk1',   icon:'âš”ï¸', name:'+3 ATK',            rarity:'common', weight:35, apply:{atk:3} },
  { id:'g_def1',   icon:'ðŸ›¡ï¸', name:'+2 DEF',            rarity:'common', weight:30, apply:{def:2} },
  { id:'g_hp1',    icon:'â¤ï¸', name:'+8 HP',             rarity:'common', weight:20, apply:{maxHp:8} },
  { id:'g_spd1',   icon:'ðŸ’¨', name:'+0.15 VEL',         rarity:'common', weight:25, apply:{speed:0.15} },
  { id:'g_crit1',  icon:'ðŸŽ¯', name:'+3% CRIT',          rarity:'common', weight:25, apply:{crit:0.03} },
  { id:'g_atk2',   icon:'ðŸ—¡ï¸', name:'+7 ATK',            rarity:'rare',   weight:15, apply:{atk:7} },
  { id:'g_def2',   icon:'ðŸ¥‹', name:'+5 DEF',            rarity:'rare',   weight:15, apply:{def:5} },
  { id:'g_hp2',    icon:'ðŸ’™', name:'+18 HP',            rarity:'rare',   weight:10, apply:{maxHp:18} },
  { id:'g_spd2',   icon:'ðŸ‘Ÿ', name:'+0.35 VEL',         rarity:'rare',   weight:12, apply:{speed:0.35} },
  { id:'g_crit2',  icon:'ðŸ§¿', name:'+8% CRIT',          rarity:'rare',   weight:12, apply:{crit:0.08} },
  { id:'g_aspd1',  icon:'ðŸ§¤', name:'+20% ATK SPD',      rarity:'rare',   weight:12, apply:{atkSpeed:0.20} },
  { id:'g_atk3',   icon:'ðŸ”¥', name:'+15 ATK',           rarity:'epic',   weight:5,  apply:{atk:15} },
  { id:'g_hp3',    icon:'ðŸ’Ž', name:'+35 HP',            rarity:'epic',   weight:3,  apply:{maxHp:35} },
  { id:'g_crit3',  icon:'ðŸŽ­', name:'+15% CRIT',         rarity:'epic',   weight:5,  apply:{crit:0.15} },
  { id:'g_spd3',   icon:'ðŸ’«', name:'+0.6 VEL, +5 DEF',  rarity:'epic',   weight:4,  apply:{speed:0.6, def:5} },
  { id:'g_legend1',icon:'ðŸ‘‘', name:'+25 ATK, +10 DEF',  rarity:'legend', weight:2,  apply:{atk:25, def:10} },
  { id:'g_legend2',icon:'ðŸ’ ', name:'+60 HP, +0.4 VEL',  rarity:'legend', weight:1,  apply:{maxHp:60, speed:0.4} },
  { id:'g_legend3',icon:'ðŸŒŸ', name:'+30% CRIT, +10 ATK',rarity:'legend', weight:1,  apply:{crit:0.30, atk:10} },
];

const LEVELUP_POOL = [
  { id:'lu_atk',    icon:'âš”ï¸', name:'Filo Afilado',   desc:'+4 ATK',                    rarity:'common', apply:{atk:4} },
  { id:'lu_hp',     icon:'â¤ï¸', name:'Vitalidad',      desc:'+12 HP mÃ¡x',                rarity:'common', apply:{maxHp:12} },
  { id:'lu_def',    icon:'ðŸ›¡ï¸', name:'Piel de Hielo',  desc:'+3 DEF',                    rarity:'common', apply:{def:3} },
  { id:'lu_spd',    icon:'ðŸ’¨', name:'Pies Ligeros',   desc:'+0.2 VEL',                  rarity:'common', apply:{speed:0.2} },
  { id:'lu_crit',   icon:'ðŸŽ¯', name:'Ojo Preciso',    desc:'+4% CRIT',                  rarity:'common', apply:{crit:0.04} },
  { id:'lu_aspd',   icon:'ðŸ§¤', name:'Manos RÃ¡pidas',  desc:'+12% ATK SPD',              rarity:'common', apply:{atkSpeed:0.12} },
  { id:'lu_range',  icon:'ðŸ“¡', name:'Alcance',        desc:'+50 Rango',                 rarity:'common', apply:{range:50} },
  { id:'lu_heal',   icon:'ðŸ§ª', name:'Vendaje',        desc:'Cura 20% de HP',            rarity:'common', healPct:0.20 },
  { id:'lu_atk2',   icon:'ðŸ—¡ï¸', name:'Filo Mayor',     desc:'+9 ATK',                    rarity:'rare', minLevel:3, apply:{atk:9} },
  { id:'lu_hp2',    icon:'ðŸ’™', name:'CorazÃ³n Firme',  desc:'+25 HP mÃ¡x',                rarity:'rare', minLevel:3, apply:{maxHp:25} },
  { id:'lu_def2',   icon:'ðŸ¥‹', name:'Armadura',       desc:'+6 DEF',                    rarity:'rare', minLevel:3, apply:{def:6} },
  { id:'lu_spd2',   icon:'ðŸ‘Ÿ', name:'Viento',         desc:'+0.4 VEL',                  rarity:'rare', minLevel:3, apply:{speed:0.4} },
  { id:'lu_crit2',  icon:'ðŸ§¿', name:'Foco Letal',     desc:'+9% CRIT',                  rarity:'rare', minLevel:3, apply:{crit:0.09} },
  { id:'lu_aspd2',  icon:'âš¡', name:'Sobrecarga',     desc:'+25% ATK SPD',              rarity:'rare', minLevel:3, apply:{atkSpeed:0.25} },
  { id:'lu_lifestl',icon:'ðŸ©¸', name:'Sanguijuela',    desc:'+4% robo de vida',          rarity:'rare', minLevel:3, lifesteal:0.04 },
  { id:'lu_cd',     icon:'â™»ï¸', name:'Recarga',        desc:'-15% cooldown dash/melee',  rarity:'rare', minLevel:3, cooldownMul:0.85 },
  { id:'lu_atk3',   icon:'ðŸ”¥', name:'Furia',          desc:'+18 ATK',                   rarity:'epic', minLevel:6, apply:{atk:18} },
  { id:'lu_hp3',    icon:'ðŸ’Ž', name:'Coloso',         desc:'+40 HP mÃ¡x + cura 8%',      rarity:'epic', minLevel:6, apply:{maxHp:40}, healPct:0.08 },
  { id:'lu_crit3',  icon:'ðŸŽ­', name:'Asesino',        desc:'+18% CRIT',                 rarity:'epic', minLevel:6, apply:{crit:0.18} },
  { id:'lu_cleave', icon:'ðŸŒªï¸', name:'Torbellino',     desc:'+40% Ã¡rea de melee',        rarity:'epic', minLevel:6, meleeArcBonus:0.4 },
  { id:'lu_multi',  icon:'ðŸŒŸ', name:'Multidisparo',   desc:'+1 proyectil bÃ¡sico',       rarity:'epic', minLevel:6, extraBasicProj:1 },
  { id:'lu_exec',   icon:'ðŸ’€', name:'Ejecutor',       desc:'+30% daÃ±o a enemigos <30% HP', rarity:'epic', minLevel:6, executeThreshold:0.3 },
  { id:'lu_legend1',icon:'ðŸ‘‘', name:'Avatar Glacial', desc:'+30 ATK, +15 DEF, +0.5 VEL',rarity:'legend', minLevel:10, apply:{atk:30, def:15, speed:0.5} },
  { id:'lu_legend2',icon:'ðŸ’ ', name:'Inmortal',       desc:'+80 HP y revives 1 vez al 30%', rarity:'legend', minLevel:10, apply:{maxHp:80}, revive:true, revivePct:0.3 },
  { id:'lu_legend3',icon:'ðŸŒŸ', name:'Dios del Hielo', desc:'+40% CRIT, +25% ATK SPD',   rarity:'legend', minLevel:10, apply:{crit:0.4, atkSpeed:0.25} },
  { id:'lu_legend4',icon:'ðŸŒŠ', name:'Marea',          desc:'Dispara 3 proyectiles en abanico', rarity:'legend', minLevel:10, fanBasic:3 },
];

const SYNERGIES = [
  { ids:['neonSword','glacialBlade'],   name:'Filos Gemelos',    bonus:{atk:15} },
  { ids:['windBoots','phantomBoots'],   name:'Paso Veloz',       bonus:{speed:0.30} },
  { ids:['critAmulet','assassinMask'],  name:'PrecisiÃ³n Letal',  bonus:{crit:0.15} },
  { ids:['crystalHeart','titanHeart'],  name:'CorazÃ³n TitÃ¡nico', bonus:{maxHp:20} },
  { ids:['quickGloves','hasteRing'],    name:'RÃ¡faga Glacial',   bonus:{atkSpeed:0.25} },
];

const ENEMY_TYPES = {
  melee_basic: { icon:'ðŸ‘¹', size:14, baseHp:10, speed:1.4, damage:4, color:'#ff5577', behavior:'melee_spin', attackRate:3000, attackRadius:72, elite:false },
  melee_elite: { icon:'ðŸ‘º', size:22, baseHp:45, speed:0.75, damage:8, color:'#ff3d71', behavior:'melee_spin', attackRate:3000, attackRadius:100, elite:true },
  ranged_basic: { icon:'ðŸ‘»', size:14, baseHp:14, speed:1.1, damage:4, color:'#b48aff', behavior:'shoot_slow', shootRate:1600, shootSpeed:3, shootDamage:5, keepDist:220, elite:false },
  ranged_elite: { icon:'ðŸ§™', size:20, baseHp:38, speed:1.0, damage:6, color:'#7dffff', behavior:'shoot_burst', shootRate:2000, burstCount:3, burstDelay:140, shootSpeed:4, shootDamage:8, slowDuration:1800, keepDist:260, repositionRate:1400, elite:true },
  frostling: { icon:'ðŸ§Š', name:'Frostling', size:13, baseHp:16, speed:1.8, damage:4, color:'#7dffff', behavior:'melee_aggressive', attackRate:3000, attackRadius:72, elite:false },
  frostling_elite: { icon:'â„ï¸', name:'Frostling Ã‰lite', size:19, baseHp:58, speed:1.15, damage:6, color:'#00e5ff', behavior:'melee_aggressive', attackRate:3000, attackRadius:98, elite:true, pulseCount:2 },
  ice_hound: { icon:'ðŸº', name:'Sabueso de Hielo', size:14, baseHp:20, speed:2.1, damage:4, color:'#8ce8ff', behavior:'melee_assassin', attackRate:3000, attackRadius:62, elite:false, lunge:true },
  ice_hound_elite: { icon:'ðŸº', name:'Sabueso Alfa', size:21, baseHp:68, speed:1.45, damage:7, color:'#39bde8', behavior:'melee_assassin', attackRate:3000, attackRadius:88, elite:true, lunge:true, lungeDistance:54 },
  shard_knight: { icon:'ðŸ—¡ï¸', name:'Caballero de Fragmentos', size:16, baseHp:28, speed:1.25, damage:5, color:'#b48aff', behavior:'melee_charge', attackRate:3000, attackRadius:82, elite:false, chargeDistance:28 },
  shard_knight_elite: { icon:'âš”ï¸', name:'Caballero Glacial', size:23, baseHp:82, speed:0.95, damage:8, color:'#9c7cff', behavior:'melee_charge', attackRate:3000, attackRadius:112, elite:true, pulseCount:3, chargeDistance:70 },
  rime_brute: { icon:'ðŸ—¿', name:'Bruto de Escarcha', size:19, baseHp:42, speed:0.9, damage:6, color:'#7a9ab0', behavior:'melee_tank', attackRate:3000, attackRadius:92, elite:false },
  rime_brute_elite: { icon:'ðŸ—¿', name:'Bruto RÃºnico', size:27, baseHp:115, speed:0.7, damage:9, color:'#547d9b', behavior:'melee_tank', attackRate:3000, attackRadius:128, elite:true, pulseCount:3 },
  void_reaver: { icon:'ðŸ‘¾', name:'Segador del VacÃ­o', size:15, baseHp:25, speed:1.65, damage:5, color:'#d86cff', behavior:'melee_berserk', attackRate:3000, attackRadius:76, elite:false, berserkSpeed:1.35 },
  void_reaver_elite: { icon:'ðŸ‘¾', name:'Segador Abisal', size:24, baseHp:96, speed:1.1, damage:8, color:'#a12eff', behavior:'melee_berserk', attackRate:3000, attackRadius:118, elite:true, lunge:true, pulseCount:2, berserkSpeed:1.6 },
  frost_archer: { icon:'ðŸ¹', name:'Arquero de Escarcha', size:13, baseHp:18, speed:1.05, damage:3, color:'#a9a0ff', behavior:'ranged_single', shootRate:3000, shootSpeed:4.5, shootDamage:4, keepDist:250, elite:false },
  frost_archer_elite: { icon:'ðŸ¹', name:'Arquero Boreal', size:19, baseHp:62, speed:0.95, damage:5, color:'#67e6ff', behavior:'ranged_fan', shootRate:3000, volleyCount:5, volleySpread:0.16, shootSpeed:5, shootDamage:7, keepDist:290, elite:true },
  crystal_sentinel: { icon:'ðŸ”·', name:'Centinela de Cristal', size:15, baseHp:24, speed:0.8, damage:4, color:'#68d9ff', behavior:'ranged_homing', shootRate:3000, shootSpeed:3.2, shootDamage:5, keepDist:270, elite:false },
  crystal_sentinel_elite: { icon:'ðŸ’ ', name:'Centinela PrismÃ¡tico', size:22, baseHp:78, speed:0.75, damage:5, color:'#00c8ff', behavior:'ranged_homing', shootRate:3000, orbCount:3, shootSpeed:3.4, shootDamage:8, keepDist:310, elite:true },
  dusk_witch: { icon:'ðŸ§™', name:'Bruja del CrepÃºsculo', size:14, baseHp:22, speed:1.0, damage:4, color:'#c47dff', behavior:'ranged_slow', shootRate:3000, shootSpeed:3.8, shootDamage:5, slowDuration:1800, keepDist:230, elite:false },
  dusk_witch_elite: { icon:'ðŸ§™â€â™€ï¸', name:'Bruja del Eclipse', size:21, baseHp:72, speed:0.9, damage:6, color:'#8b42d6', behavior:'ranged_slow', shootRate:3000, orbCount:5, shootSpeed:4.2, shootDamage:8, slowDuration:2600, keepDist:280, elite:true },
  storm_ranger: { icon:'ðŸ¹', name:'Explorador de Tormenta', size:14, baseHp:26, speed:1.35, damage:4, color:'#9fe8ff', behavior:'ranged_burst', shootRate:3000, burstCount:3, burstDelay:140, shootSpeed:5.2, shootDamage:5, keepDist:210, elite:false },
  storm_ranger_elite: { icon:'âš¡', name:'Ranger de la Tormenta', size:21, baseHp:88, speed:1.1, damage:6, color:'#ffe45e', behavior:'ranged_burst', shootRate:3000, burstCount:5, burstDelay:120, shootSpeed:5.8, shootDamage:9, keepDist:260, elite:true },
  bone_sniper: { icon:'ðŸ’€', name:'Francotirador Ã“seo', size:14, baseHp:30, speed:0.7, damage:5, color:'#d6d0bd', behavior:'ranged_single', shootRate:3000, shootSpeed:5, shootDamage:6, keepDist:340, elite:false },
  bone_sniper_elite: { icon:'â˜ ï¸', name:'Ojo de la Cripta', size:22, baseHp:100, speed:0.65, damage:7, color:'#fff0b2', behavior:'ranged_homing', shootRate:3000, orbCount:4, shootSpeed:5.5, shootDamage:10, keepDist:370, elite:true },
};

const CHALLENGE_ROOMS = [
  { id:'swarm', icon:'ðŸ', name:'CÃ¡mara del Enjambre', desc:'MÃ¡s enemigos, pero cada baja otorga monedas extra.', enemyCountMul:1.6, rewardCoins:20 },
  { id:'crossfire', icon:'ðŸŽ¯', name:'CÃ¡mara del Fuego Cruzado', desc:'Los arqueros aparecen reforzados.', rangedEliteBias:true, rewardCoins:24 },
  { id:'gauntlet', icon:'âš”ï¸', name:'CÃ¡mara del Duelista', desc:'Solo criaturas cuerpo a cuerpo Ã©lite.', meleeEliteBias:true, rewardCoins:28 },
  { id:'survival', icon:'â³', name:'CÃ¡mara de Supervivencia', desc:'Enemigos mÃ¡s rÃ¡pidos durante la sala.', enemySpeedMul:1.3, rewardCoins:30 },
];
const BOSS_TYPES = [
  { name:'Escarcha Menor',   icon:'â„',  hp:300,  speed:1.0, atkRate:1100, minionCount:3, patterns:['fan','charge','circle'] },
  { name:'Golem de Hielo',   icon:'â›°',  hp:450,  speed:0.8, atkRate:1050, minionCount:3, patterns:['fan','slam','ring'] },
  { name:'Espectro GÃ©lido',  icon:'ðŸ‘»', hp:600,  speed:1.4, atkRate:950,  minionCount:4, patterns:['spiral','charge','homing'] },
  { name:'Serpiente Ãrtica', icon:'ðŸ', hp:800,  speed:1.2, atkRate:900,  minionCount:4, patterns:['fan','wall','charge'] },
  { name:'TitÃ¡n Congelado',  icon:'ðŸ—¿', hp:1050, speed:0.7, atkRate:850,  minionCount:5, patterns:['ring','slam','spiral'] },
  { name:'Reina del Hielo',  icon:'ðŸ‘‘', hp:1300, speed:1.3, atkRate:800,  minionCount:5, patterns:['fan','spiral','homing'] },
  { name:'DragÃ³n Boreal',    icon:'ðŸ²', hp:1600, speed:1.1, atkRate:720,  minionCount:6, patterns:['wall','charge','circle'] },
  { name:'Nigromante FrÃ­o',  icon:'ðŸ’€', hp:1900, speed:1.0, atkRate:680,  minionCount:6, patterns:['homing','ring','spiral'] },
  { name:'Avatar Glacial',   icon:'ðŸ”·', hp:2300, speed:1.2, atkRate:600,  minionCount:7, patterns:['spiral','fan','charge'] },
  { name:'ICE CORE Î©',       icon:'ðŸ’Ž', hp:3000, speed:1.5, atkRate:500,  minionCount:8, patterns:['spiral','circle','fan'] },
];

const ACHIEVEMENTS_DB = [
  { id:'kill_10',      icon:'âš”ï¸', name:'Primer Sangre',    desc:'Mata 10 enemigos totales.',           goal:10,   stat:'totalKills' },
  { id:'kill_100',     icon:'ðŸ—¡ï¸', name:'Cazador',          desc:'Mata 100 enemigos totales.',          goal:100,  stat:'totalKills' },
  { id:'kill_500',     icon:'ðŸ’€', name:'Verdugo',          desc:'Mata 500 enemigos totales.',          goal:500,  stat:'totalKills' },
  { id:'kill_2000',    icon:'â˜ ï¸', name:'Segador',          desc:'Mata 2000 enemigos totales.',         goal:2000, stat:'totalKills' },
  { id:'floor_1',      icon:'â„ï¸', name:'Escalador',        desc:'Llega al piso 2.',                    goal:2,    stat:'bestFloor' },
  { id:'floor_3',      icon:'ðŸ”ï¸', name:'Alpinista',        desc:'Llega al piso 4.',                    goal:4,    stat:'bestFloor' },
  { id:'floor_5',      icon:'ðŸ§—', name:'Conquistador',     desc:'Llega al piso 6.',                    goal:6,    stat:'bestFloor' },
  { id:'floor_10',     icon:'ðŸ‘‘', name:'Rey del Hielo',    desc:'Llega al piso 10.',                   goal:10,   stat:'bestFloor' },
  { id:'run_1',        icon:'ðŸš€', name:'Primera Run',      desc:'Completa tu primera partida.',        goal:1,    stat:'totalRuns' },
  { id:'run_10',       icon:'ðŸŽ¯', name:'Veterano',         desc:'Juega 10 runs.',                      goal:10,   stat:'totalRuns' },
  { id:'run_50',       icon:'ðŸ…', name:'Adicto',           desc:'Juega 50 runs.',                      goal:50,   stat:'totalRuns' },
  { id:'win_1',        icon:'ðŸ†', name:'Vencedor',         desc:'Gana 1 run completa.',                goal:1,    stat:'totalWins' },
  { id:'win_5',        icon:'ðŸŒŸ', name:'Leyenda',          desc:'Gana 5 runs completas.',              goal:5,    stat:'totalWins' },
  { id:'coins_100',    icon:'ðŸª™', name:'Ahorrador',        desc:'Acumula 100 monedas meta.',           goal:100,  stat:'metaCoins' },
  { id:'coins_1000',   icon:'ðŸ’°', name:'Magnate',          desc:'Acumula 1000 monedas meta.',          goal:1000, stat:'metaCoins' },
  { id:'upgrade_5',    icon:'â¬†ï¸', name:'Aprendiz',         desc:'Compra 5 mejoras permanentes.',       goal:5,    stat:'totalUpgradesBought' },
  { id:'upgrade_20',   icon:'ðŸ“ˆ', name:'Inversor',         desc:'Compra 20 mejoras permanentes.',      goal:20,   stat:'totalUpgradesBought' },
  { id:'level_5',      icon:'â­', name:'Ascendido',        desc:'Alcanza el nivel 5 en una run.',      goal:5,    stat:'bestLevelReached' },
  { id:'level_10',     icon:'âœ¨', name:'Trascendido',      desc:'Alcanza el nivel 10 en una run.',     goal:10,   stat:'bestLevelReached' },
  { id:'level_20',     icon:'ðŸŒ ', name:'Iluminado',        desc:'Alcanza el nivel 20 en una run.',     goal:20,   stat:'bestLevelReached' },
  { id:'gacha_10',     icon:'ðŸŽ°', name:'Jugador',          desc:'Gira el gacha 10 veces.',             goal:10,   stat:'totalGachaRolls' },
  { id:'gacha_100',    icon:'ðŸŽ²', name:'Dados Cargados',   desc:'Gira el gacha 100 veces.',            goal:100,  stat:'totalGachaRolls' },
  { id:'items_10',     icon:'ðŸ“¦', name:'Coleccionista',    desc:'Recoge 10 items en una run.',         goal:10,   stat:'bestItemsInRun' },
  { id:'items_20',     icon:'ðŸŽ', name:'Acaparador',       desc:'Recoge 20 items en una run.',         goal:20,   stat:'bestItemsInRun' },
  { id:'syn_1',        icon:'ðŸ”—', name:'Sinergia',         desc:'Activa 1 sinergia en una run.',       goal:1,    stat:'bestSynergiesInRun' },
  { id:'syn_3',        icon:'ðŸ•¸ï¸', name:'Malla Perfecta',   desc:'Activa 3 sinergias en una run.',      goal:3,    stat:'bestSynergiesInRun' },
  { id:'obstacles_50', icon:'ðŸª¨', name:'Demoledor',        desc:'Destruye 50 obstÃ¡culos.',             goal:50,   stat:'totalObstaclesDestroyed' },
  { id:'obstacles_200',icon:'ðŸ§¨', name:'Triturador',       desc:'Destruye 200 obstÃ¡culos.',            goal:200,  stat:'totalObstaclesDestroyed' },
  { id:'consume_10',   icon:'ðŸ§ª', name:'Boticario',        desc:'Usa 10 consumibles.',                 goal:10,   stat:'totalConsumablesUsed' },
  { id:'consume_50',   icon:'âš—ï¸', name:'Alquimista',       desc:'Usa 50 consumibles.',                 goal:50,   stat:'totalConsumablesUsed' },
];

/* ================================================================
   ðŸ—ºï¸ RETOS DEL PISO â€” se elige uno aleatorio por cada piso nuevo
   Cada reto tiene un modificador real (afecta al gameplay) y uno visual.
   ================================================================ */
const FLOOR_CHALLENGES = [
  {
    id:'no_heal',
    icon:'ðŸš«',
    name:'Sin CuraciÃ³n',
    desc:'Las pociones y curas no funcionan durante este piso.',
    severity:'extreme',
    apply: { blockHeal: true },
  },
  {
    id:'fast_enemies',
    icon:'ðŸ’¨',
    name:'Vientos Helados',
    desc:'Los enemigos son un 25% mÃ¡s rÃ¡pidos.',
    severity:'hard',
    apply: { enemySpeedMul: 1.25 },
  },
  {
    id:'double_damage_half_hp',
    icon:'âš¡',
    name:'Pacto de Sangre',
    desc:'Tu daÃ±o Ã—2 pero tu vida mÃ¡xima se reduce un 30%.',
    severity:'extreme',
    apply: { playerDmgMul: 2.0, playerMaxHpMul: 0.7, onceOnStart: true },
  },
  {
    id:'glass_cannon',
    icon:'ðŸ’¥',
    name:'CaÃ±Ã³n de Cristal',
    desc:'Infliges +60% de daÃ±o pero recibes +50% de daÃ±o.',
    severity:'hard',
    apply: { playerDmgMul: 1.6, playerDamageTakenMul: 1.5 },
  },
  {
    id:'tank_mode',
    icon:'ðŸ›¡ï¸',
    name:'Piel de Hierro',
    desc:'+50% vida mÃ¡xima pero -25% velocidad.',
    severity:'medium',
    apply: { playerMaxHpMul: 1.5, playerSpeedMul: 0.75, onceOnStart: true },
  },
  {
    id:'sniper',
    icon:'ðŸŽ¯',
    name:'Ojo de HalcÃ³n',
    desc:'+30% CRIT pero -20% cadencia de disparo.',
    severity:'medium',
    apply: { playerCritBonus: 0.30, playerFireRateMul: 1.2 },
  },
  {
    id:'swarm',
    icon:'ðŸ',
    name:'Enjambre',
    desc:'Aparecen 50% mÃ¡s enemigos pero cada uno tiene 30% menos vida.',
    severity:'hard',
    apply: { enemyCountMul: 1.5, enemyHpMul: 0.7, onceOnStart: true },
  },
  {
    id:'tanky_enemies',
    icon:'ðŸ¢',
    name:'Escudos Glaciales',
    desc:'Los enemigos tienen +40% de vida pero son 15% mÃ¡s lentos.',
    severity:'medium',
    apply: { enemyHpMul: 1.4, enemySpeedMul: 0.85 },
  },
  {
    id:'no_shield',
    icon:'ðŸ”“',
    name:'Fragilidad',
    desc:'Los escudos temporales no funcionan.',
    severity:'medium',
    apply: { blockShield: true },
  },
  {
    id:'double_gold',
    icon:'ðŸ’°',
    name:'Fiebre del Oro',
    desc:'+80% monedas de todo tipo pero los enemigos hacen +20% daÃ±o.',
    severity:'medium',
    apply: { goldMul: 1.8, enemyDmgMul: 1.2 },
  },
  {
    id:'crit_hell',
    icon:'ðŸ—¡ï¸',
    name:'Golpes Certeros',
    desc:'Los crÃ­ticos hacen Ã—3 daÃ±o pero tu vida se reduce un 20%.',
    severity:'hard',
    apply: { critDamageMul: 3, playerMaxHpMul: 0.8, onceOnStart: true },
  },
  {
    id:'slow_burn',
    icon:'ðŸŒ',
    name:'Hielo Espeso',
    desc:'+100% daÃ±o de ralentizaciÃ³n pero -15% velocidad propia.',
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


/* ===== save.js ===== */
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


/* ===== customization.js ===== */
const PLAYER_SPRITES = [
  { id:'default', name:'Mago Glacial', src:null },
  ...Array.from({ length: 14 }, (_, index) => ({
    id: `personaje-${index + 1}`,
    name: `Personaje ${index + 1}`,
    src: `player.customize/personaje.${index + 1}.png`,
  })),
];

const PlayerCustomization = {
  images: new Map(),

  init() {
    for (const sprite of PLAYER_SPRITES) {
      if (!sprite.src) continue;
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        this.images.set(sprite.id, image);
        if (typeof UI !== 'undefined' && UI.screens && UI.screens.customize &&
            !UI.screens.customize.classList.contains('is-hidden')) {
          UI.refreshCustomization();
        }
      };
      image.onerror = () => console.warn(`Sprite no encontrado: ${sprite.src}`);
      image.src = sprite.src;
    }
  },

  selected(playerId = null) {
    const id = playerId ? save.customization[playerId] : save.customization.sprite;
    return PLAYER_SPRITES.find(sprite => sprite.id === id) || PLAYER_SPRITES[0];
  },

  select(id, playerId = null) {
    if (!PLAYER_SPRITES.some(sprite => sprite.id === id)) {
      throw new Error(`Sprite de jugador desconocido: ${id}`);
    }
    if (playerId) save.customization[playerId] = id;
    else {
      save.customization.sprite = id;
      save.customization.p1 = id;
    }
    Save.write();
    UI.refreshCustomization();
  },

  renderPreview(ctx, sprite, size = 64) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#071a2e';
    ctx.fillRect(0, 0, size, size);
    const image = this.images.get(sprite.id);
    if (image && image.complete && image.naturalWidth) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 8, 8, size - 16, size - 16);
      return;
    }
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath(); ctx.arc(size / 2, size / 2, size * 0.23, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath(); ctx.arc(size / 2, size / 2, size * 0.11, 0, Math.PI * 2); ctx.fill();
  },

  draw(ctx, player) {
    const sprite = this.selected(player.controlId);
    const image = this.images.get(sprite.id);
    if (!image || !image.complete || !image.naturalWidth) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = player.hitFlash > 0 ? 0.7 : 1;
    const side = player.size * 2.6;
    ctx.drawImage(image, player.x - side / 2, player.y - side / 2, side, side);
    ctx.restore();
    return true;
  },
};


/* ===== audio.js ===== */
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
  floorChallenge: null, // ðŸ—ºï¸ Reto activo del piso

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
    UI.toast(this.survivalMode ? 'âš” Modo Supervivencia iniciado' : endless ? 'âˆž Endless iniciado' : 'â„ Piso 1 iniciado', 'gold');
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
    UI.toast(`âš” Horda ${this.survivalHorde} Â· ${count} enemigos`, 'danger');
  },

  /* ðŸ—ºï¸ Elige un reto aleatorio para el piso actual */
  _rollFloorChallenge() {
    // No repetir el mismo reto que el piso anterior
    const previousId = this.floorChallenge ? this.floorChallenge.id : null;
    let pool = FLOOR_CHALLENGES.filter(c => c.id !== previousId);
    if (pool.length === 0) pool = FLOOR_CHALLENGES;
    this.floorChallenge = Util.pick(pool);
    console.log(`ðŸ—ºï¸ Reto del piso ${this.floor}:`, this.floorChallenge.name);
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
      UI.toast('âš” Â¡JEFE!', 'danger');
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
        UI.toast(`${r.challenge.icon} CÃ¡mara superada: +${r.challenge.rewardCoins || 0} monedas`, 'gold');
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
      UI.toast('ðŸ”“ Â¡La cÃ¡mara del JEFE se ha desbloqueado!', 'gold');
      Gamepad.rumble(0.6, 200);
    }
  },

  grantXp(amount) {
    const r = this.run;
    // ðŸ”¥ XP reducida en pisos altos para hacer el farmeo mÃ¡s duro
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
    // ðŸ”¥ Curva mÃ¡s agresiva: 20 Ã— 1.45^(nivel-1)
    r.xpToNext = Math.round((this.coop ? 28 : 20) * Math.pow(1.45, r.level - 1));
    UI.toast(`â­ Â¡NIVEL ${r.level}!`, 'gold');
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
    UI.toast(`â­ ${perk.name}`, 'gold');
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
        value: `â—† +${coins}`,
        crit: true,
        life: 1100, maxLife: 1100,
        color: '#ffd54f',
      });
      Audio2.explosion();
      Audio2.beep(1200, 0.08, 0.1);
      Gamepad.rumble(0.5, 130);
      UI.toast(`â—† +${coins} monedas`, 'gold');
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
    UI.toast(`${player.controlId === 'p2' ? 'P2' : 'P1'} ha caÃ­do â€” acÃ©rcate y pulsa E/9 para revivir`, 'danger');
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
      UI.toast(`ðŸ“¦ ${item.name}`, 'gold');
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

    // Reto del piso: bloqueo de curaciÃ³n
    const blockHeal = Game.floorChallenge?.apply?.blockHeal;
    if (def.effect === 'heal' && blockHeal) {
      UI.toast('ðŸš« CuraciÃ³n bloqueada por el reto del piso', 'danger');
      return false;
    }

    const now = performance.now();
    switch (def.effect) {
      case 'heal': {
        const healed = Math.min(def.value, p.maxHp - p.hp);
        if (healed <= 0) { UI.toast('â¤ Vida ya al mÃ¡ximo', 'danger'); return false; }
        p.hp = Math.min(p.maxHp, p.hp + def.value);
        this.damageNumbers.push({ x:p.x, y:p.y - 20, value:'+'+Math.round(healed), crit:false, life:900, maxLife:900, color:'#7bff9f' });
        UI.toast(`ðŸ§ª +${Math.round(healed)} HP`, 'gold');
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
        UI.toast('ðŸ’£ Â¡ExplosiÃ³n!', 'gold');
        break;
      }
      case 'shield': {
        if (Game.floorChallenge?.apply?.blockShield) {
          UI.toast('ðŸš« Escudos bloqueados por el reto del piso', 'danger');
          return false;
        }
        p.shieldUntil = now + def.value;
        UI.toast('ðŸ›¡ Escudo activo', 'gold');
        Audio2.consume();
        break;
      }
      case 'rage': {
        p.rageUntil = now + def.value;
        UI.toast('ðŸ”¥ Furia desatada', 'epic');
        Audio2.consume();
        break;
      }
      case 'timeslow': {
        for (const e of this.enemies) e.slowUntil = Math.max(e.slowUntil, now + def.value);
        if (this.boss) this.boss.slowUntil = Math.max(this.boss.slowUntil, now + def.value);
        UI.toast('â³ Tiempo ralentizado', 'epic');
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
        UI.toast('ðŸ“œ Blink', 'gold');
        Audio2.consume();
        break;
      }
      case 'magnet': {
        const bonus = 8 + this.floor * 2;
        const goldMul = (Game.floorChallenge?.apply?.goldMul) || 1;
        this.run.coins += Math.round(bonus * goldMul);
        UI.toast(`ðŸ§² +${Math.round(bonus * goldMul)} monedas atraÃ­das`, 'gold');
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
          UI.toast('ðŸ›’ Descanso: tienda abierta durante 18 s', 'gold');
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
        UI.toast('âœ“ Sala limpia â€” Puertas abiertas', 'gold');
        if (this.currentRoom.type === 'challenge' && !this.currentRoom.challengeRewarded) {
          this.currentRoom.challengeRewarded = true;
          const reward = this.currentRoom.challenge ? this.currentRoom.challenge.rewardCoins : 0;
          this.run.coins += reward || 0;
          UI.toast(`${this.currentRoom.challenge.icon} Recompensa de cÃ¡mara: +${reward || 0} monedas`, 'gold');
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
    ctx.fillText('ðŸª MERCADILLO GLACIAL', CFG.W/2, 40);
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
        ctx.fillText('âœ¨', 0, -30);
      } else if (locked) {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('ðŸ”’', 0, -30);
      } else {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('â“', 0, -30);
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
    ctx.fillText('ðŸ“¦ SALA DE COFRES', CFG.W/2, 40);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#b2ebf2';
    ctx.shadowBlur = 6;
    ctx.fillText('Elige sabiamente â€” solo puedes abrir UNO', CFG.W/2, 62);
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
    ctx.fillText('ðŸŽ° GACHA', m.x, m.y + 42);
    ctx.shadowBlur = 0;

    const baseCost = 50 + Game.floor * 12;
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffd54f';
    ctx.fillText(`â—† ${baseCost} por tirada`, m.x, m.y + 58);

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
    ctx.fillText('ðŸŽ° CÃMARA GACHA', CFG.W/2, 40);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#b2ebf2';
    ctx.shadowBlur = 6;
    ctx.fillText(`Pity: ${r.gachaPity || 0}/10 â€” Ã©pico garantizado al llegar a 10`, CFG.W/2, 62);
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
          ctx.fillText('ðŸ”’', cx, cy);
        }
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    if (r.type === 'boss')    ctx.fillText('âš” JEFE', 40, 40);
    if (this.survivalMode) {
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(`âš” SUPERVIVENCIA Â· HORDA ${this.survivalHorde}`, 40, 40);
      if (this.survivalBreak) {
        ctx.fillStyle = '#7bff9f';
        ctx.fillText(`DESCANSO Â· ${Math.max(0, Math.ceil((this.survivalBreakUntil - now) / 1000))} s`, 40, 62);
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
      const icon = o.kind === 'rock' ? 'ðŸª¨' : o.kind === 'ice_block' ? 'ðŸ§Š' : 'ðŸ’Ž';
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

    // ðŸ—ºï¸ Nuevo reto por piso
    this._rollFloorChallenge();

    this.rebuildPlayers(true);
    for (const p of this.activePlayers()) p.downed = false;
    this.generateFloor();
    UI.toast(`â„ Piso ${this.floor}`, 'gold');
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
      if (confirm('Â¿Borrar TODO el progreso?')) {
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
      if (title) title.innerHTML = 'ðŸª MERCADILLO DEL PISO <span id="shopFloor">1</span>';
      const subtitle = document.querySelector('#screen-shop p');
      if (subtitle) subtitle.textContent = 'Bienes perecederos y reliquias. Los consumibles se acumulan (mÃ¡x. por tipo).';
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
      (Game.boss && !Game.boss.dead) ? Game.boss.name : 'â€”';

    // Reto del piso
    const cEl = document.getElementById('invModalChallenge');
    if (cEl) {
      if (Game.floorChallenge) {
        cEl.innerHTML = `<span style="font-size:18px;">${Game.floorChallenge.icon}</span> <strong style="color:#ff8aa3;letter-spacing:2px;">RETO DEL PISO:</strong> ${Game.floorChallenge.name} â€” <em>${Game.floorChallenge.desc}</em>`;
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
        tag.textContent = `${s.name} Â· ${bonusText}`;
        synEl.appendChild(tag);
      }
    }

    const grid = document.getElementById('invModalItems');
    grid.innerHTML = '';
    if (Game.run.items.length === 0) {
      grid.innerHTML = '<span class="synergy-empty">AÃºn no tienes items esta run.</span>';
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
            <div class="inv-modal-rarity" style="color:${rar.color};">x${count} Â· ${rar.label}</div>
          `;
          consGrid.appendChild(div);
        }
      }
    }
  },

  /* ðŸ—ºï¸ Actualiza el badge del reto del piso en el HUD */
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
    // Quitar clases previas y aÃ±adir la actual
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
      btn.textContent = save.bestFloor >= CFG.ENDLESS_UNLOCK ? 'âˆž Modo Endless' : `âˆž Endless (Piso ${CFG.ENDLESS_UNLOCK})`;
    }
  },

  refreshCustomization() {
    const grid = document.getElementById('customizationGrid');
    const preview = document.getElementById('customizationPreview');
    const selectedLabel = document.getElementById('customizationSelected');
    if (!grid || !preview || !selectedLabel) return;

    const selected = PlayerCustomization.selected(this.customizationPlayer);
    selectedLabel.textContent = `${this.customizationPlayer ? this.customizationPlayer.toUpperCase() + ' Â· ' : ''}Seleccionado: ${selected.name}`;
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
      <div class="stat-row"><span class="label">ObstÃ¡culos destruidos</span><span class="value">${save.totalObstaclesDestroyed || 0}</span></div>
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
        ${unlocked ? '<div class="ach-card-badge">âœ“</div>' : ''}
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
    el.innerHTML = `ðŸ† <strong>LOGRO:</strong> ${ach.icon} ${ach.name}`;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  },

  refreshPermShop() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('permShopCoins', save.metaCoins || 0);
    const grid = document.getElementById('permShopGrid');
    if (!grid) return;
    const ups = [
      { id:'atk',   icon:'âš”ï¸', name:'+2 ATK',    cost:75 },
      { id:'def',   icon:'ðŸ›¡ï¸', name:'+2 DEF',    cost:75 },
      { id:'maxHp', icon:'â¤ï¸', name:'+5 HP',     cost:100 },
      { id:'speed', icon:'ðŸ’¨', name:'+0.15 VEL', cost:85 },
      { id:'crit',  icon:'ðŸŽ¯', name:'+2% CRIT',  cost:110 },
    ];
    grid.innerHTML = '';
    for (const u of ups) {
      const lvl = save.upgrades[u.id] || 0;
      const cost = u.cost + lvl * 45;
      const canBuy = save.metaCoins >= cost && lvl < 10;
      const div = document.createElement('div');
      div.className = 'stat-row';
      div.innerHTML = `
        <span class="label">${u.icon} ${u.name} Â· Nv.${lvl}/10</span>
        <span class="value">â—† ${cost}
          <button class="btn small" style="display:inline-block; margin-left:8px; min-width:auto; padding:4px 10px; font-size:10px;"
            ${canBuy ? '' : 'disabled'}>${lvl >= 10 ? 'MÃX' : 'COMPRAR'}</button>
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
      basic:'Ataque BÃ¡sico', melee:'Melee', long:'RÃ¡faga Larga', dash:'Dash', inventory:'Inventario',
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
    this.toast('â†» Controles restaurados', 'gold');
  },

  updateHud() {
    const p = Game.player;
    if (p) {
      document.getElementById('hpFill').style.width = (p.hp / p.maxHp * 100) + '%';
      document.getElementById('hpText').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
      document.getElementById('statsText').textContent =
        `${p.atk.toFixed(0)} Â· ${p.def.toFixed(0)} Â· ${p.speed.toFixed(1)} Â· ${(p.crit*100).toFixed(0)}%`;
    }
    const p2 = Game.coop ? Game.players[1] : null;
    const p2Hud = document.getElementById('hud-p2');
    if (p2Hud) {
      p2Hud.classList.toggle('is-hidden', !p2);
      if (p2) {
        document.getElementById('p2HpFill').style.width = Math.max(0, p2.hp / p2.maxHp * 100) + '%';
        document.getElementById('p2HpText').textContent = p2.downed
          ? 'CAÃDO â€” acÃ©rcate para revivir'
          : `${Math.ceil(p2.hp)} / ${p2.maxHp}${p2.shieldUntil > performance.now() ? ' Â· ðŸ›¡' : ''}`;
      }
    }
    document.getElementById('floorText').textContent = Game.floor;
    const cleared = Game.rooms ? Game.rooms.flat().filter(r => r && r.cleared).length : 0;
    const total = Game.rooms ? Game.rooms.flat().filter(r => r).length : 0;
    document.getElementById('roomsText').textContent = `${cleared} / ${total}`;
    const coinsEl = document.getElementById('runCoinsText');
    if (coinsEl) coinsEl.textContent = `â—† ${Game.run.coins}`;
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
        div.innerHTML = `<div class="cs-icon" style="opacity:0.3;">Â·</div><div class="cs-key">${i+1}</div>`;
      } else {
        const def = CONSUMABLES_DB.find(c => c.id === slot.id);
        div.innerHTML = `
          <div class="cs-icon">${def ? def.icon : '?'}</div>
          <div class="cs-count">${slot.count}</div>
          <div class="cs-key">${i+1}</div>
        `;
        div.title = def ? `${def.name} â€” ${def.desc}` : '';
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
        <div class="shop-item-price ${canBuy ? '' : 'cant'}">â—† ${cost}</div>
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
      <div style="font-size:20px;">ðŸ“¦ COFRE MISTERIOSO</div>
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
      <div style="font-size:14px;color:#7b61ff;font-weight:bold;letter-spacing:2px;margin-bottom:6px;">ðŸŽ° GACHA GLACIAL</div>
      <div>ObtÃ©n mejoras permanentes aleatorias para esta run.</div>
      <div style="color:#ffd54f;">Rarezas: ComÃºn Â· Rara Â· Ã‰pica Â· Legendaria</div>
      <div>Pity: <strong>${pity}/10</strong> â€” Ã©pico+ garantizado al llegar a 10.</div>
      <div style="margin-top:8px;">Monedas: <strong style="color:#ffd54f;">â—† ${coins}</strong></div>
    `;
    grid.appendChild(info);

    const singleCost = baseCost;
    const canSingle = coins >= singleCost;
    const divSingle = document.createElement('div');
    divSingle.className = 'shop-item rarity-rare';
    divSingle.innerHTML = `
      <div class="shop-item-icon" style="filter:drop-shadow(0 0 8px #00e5ff);">ðŸŽ²</div>
      <div class="shop-item-name">Tirada simple</div>
      <div class="shop-item-desc">1 mejora aleatoria.</div>
      <div class="shop-item-price ${canSingle ? '' : 'cant'}">â—† ${singleCost}</div>
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
      <div class="shop-item-icon" style="filter:drop-shadow(0 0 8px #7b61ff);">ðŸŽ²ðŸŽ²ðŸŽ²</div>
      <div class="shop-item-name">Tirada triple</div>
      <div class="shop-item-desc">3 mejoras. <strong style="color:#7bff9f;">-10% descuento</strong></div>
      <div class="shop-item-price ${canTriple ? '' : 'cant'}">â—† ${tripleCost}</div>
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
      <div class="shop-item-icon">ðŸšª</div>
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
    header.innerHTML = `<div style="font-size:20px;color:#ffd54f;font-weight:bold;letter-spacing:3px;">âœ¦ RESULTADOS âœ¦</div>`;
    grid.appendChild(header);

    for (const roll of results) {
      const rar = RARITY[roll.rarity];
      const div = document.createElement('div');
      div.className = `shop-item rarity-${roll.rarity}`;
      div.style.borderWidth = '3px';
      div.innerHTML = `
        <div class="shop-item-icon" style="font-size:42px;filter:drop-shadow(0 0 12px ${rar.color});">${roll.icon}</div>
        <div class="shop-item-name" style="font-size:13px;color:${rar.color};">${roll.name}</div>
        <div class="shop-item-desc">${rar.label === 'Legendario' ? 'â­ Â¡LEGENDARIO!' : rar.label === 'Ã‰pico' ? 'ðŸ’œ Ã‰pico' : rar.label === 'Raro' ? 'ðŸ’™ Raro' : 'ComÃºn'}</div>
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
      title.textContent = 'ðŸ† Â¡VICTORIA FINAL!';
      title.style.color = '#4dffff';
    } else {
      title.textContent = 'ðŸ’€ DERROTA';
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
     NAVEGACIÃ“N CON MANDO + ANIMACIÃ“N DE FOCO
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
      // Una tarjeta con botÃ³n debe ser un solo elemento navegable.
      // AsÃ­ el mando no se detiene en la tarjeta antes de llegar a CERRAR.
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

    // âœ¨ Aplicar .focused con auto-scroll
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
  console.log('â„ ICE RUN v14 â€” XP dura + AnimaciÃ³n foco + Reto por piso');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && Game.battleActive && !Game.paused) Game.togglePause();
});


/* ===== install.js ===== */
(() => {
  let installPrompt = null;
  const apkPath = 'downloads/los-magos-del-tiempo.apk';

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    if (typeof UI !== 'undefined') UI.toast('ðŸ“± AplicaciÃ³n instalada', 'gold');
  });

  window.downloadGameApk = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      installPrompt = null;
      if (result.outcome === 'accepted' && typeof UI !== 'undefined') {
        UI.toast('ðŸ“± InstalaciÃ³n iniciada', 'gold');
      }
      return;
    }

    try {
      const response = await fetch(apkPath, { method: 'HEAD' });
      if (!response.ok) throw new Error(`APK no disponible (${response.status})`);
      const link = document.createElement('a');
      link.href = apkPath;
      link.download = 'los-magos-del-tiempo.apk';
      link.click();
    } catch (error) {
      console.error('No se pudo descargar la APK:', error);
      if (typeof UI !== 'undefined') {
        UI.toast('La APK aÃºn no estÃ¡ publicada. Usa la instalaciÃ³n de Android o genera el APK.', 'danger');
      }
    }
  };

  const downloadButton = document.getElementById('btn-download-apk');
  if (downloadButton) {
    downloadButton.addEventListener('click', () => window.downloadGameApk());
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(error => {
      console.warn('No se pudo activar el modo instalable:', error);
    });
  }
})();

