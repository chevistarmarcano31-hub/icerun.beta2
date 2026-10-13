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

