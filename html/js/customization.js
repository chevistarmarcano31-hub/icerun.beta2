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
