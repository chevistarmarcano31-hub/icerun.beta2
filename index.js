/*javascript/*
/* ═══════════════════════════════════════════════════════════
   ARTE EN MADERA · Lógica principal (versión final)
   ═══════════════════════════════════════════════════════════ */
(() => {
'use strict';

/* ══════ ⚙️ CONFIGURACIÓN ══════ */
const CFG = {
  WA:      '584269899285',
  SYNC_MS: 30000
};

/* ══════ 👑 USUARIOS ADMIN ══════ */
const ADMIN_USERS = [
  { user: 'ROOT',            pass: 'root2024',   name: 'ROOT' },
  { user: 'ADMIN',           pass: 'admin2024',  name: 'admin' },
  { user: 'JOSE_MARCANO_48', pass: 'jose2024',   name: 'José Marcano' }
];

/* ══════ Utilidades ══════ */
const $   = id  => document.getElementById(id);
const $$  = sel => document.querySelectorAll(sel);
const ROOT = document.documentElement;

const ESC_RE  = /[&<>"']/g;
const ESC_MAP = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
const esc = v => String(v ?? '').replace(ESC_RE, c => ESC_MAP[c]);

const cap = s => {
  s = String(s ?? '').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const PRICE_NF = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});
const fp = p => '$' + PRICE_NF.format(Number(p) || 0);

const hash = s => { let h = 0; for (let i = 0; i < s.length; i++){ h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return Math.abs(h).toString(36); };

const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="#e9e1d7" width="400" height="400"/><text x="50%" y="50%" fill="#8b7d6b" font-size="20" text-anchor="middle" dy=".3em">Sin imagen</text></svg>'
);

function normalizeProducts(arr) {
  if (!Array.isArray(arr)) return [];
  let changed = false;
  arr.forEach(p => {
    if (p && p.title) {
      const fixed = cap(p.title);
      if (fixed !== p.title) { p.title = fixed; changed = true; }
    }
  });
  return changed;
}

const hasDiscount = p => p.oldPrice && +p.oldPrice > +p.price;
const calcDiscount = p => hasDiscount(p)
  ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;

const effectiveTags = p => {
  const t = [...(p.tags || [])];
  const i = t.indexOf('oferta');
  if (hasDiscount(p)) {
    if (i === -1) t.push('oferta');
  } else if (i > -1) {
    t.splice(i, 1);
  }
  return t;
};

const DEMO = [
    {
    id: 'demo-1',
    title: 'Mesa de Playa Plegable',
    category: 'decoracion',
    price: 45,
    oldPrice: 60,
    material: 'Pino tratado',
    measures: '60 × 40 × 25 cm',
    shipping: 'Envío a todo el país',
    description: 'Mesa plegable ideal para la playa, camping o el hogar. Con porta-vasos integrado para 2 bebidas. Fácil de transportar.',
    tags: ['nuevo', 'oferta', 'destacado'],
    available: true,
    image: 'mesa-playa.jpg',
    images: ['mesa-playa.jpg']
  },

];

const loadCropper = () => new Promise((resolve, reject) => {
  if (window.Cropper) return resolve(window.Cropper);
  if (!document.querySelector('link[data-cropper]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/cropperjs@1.6.2/dist/cropper.min.css';
    css.dataset.cropper = '1';
    document.head.appendChild(css);
  }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/cropperjs@1.6.2/dist/cropper.min.js';
  s.onload = () => resolve(window.Cropper);
  s.onerror = reject;
  document.head.appendChild(s);
});

const St = {
  prod: [], cart: [], imgs: [],
  cropper: null, files: [], editId: null,
  cat: 'all', tag: null, q: '',
  _cb: null, _lastRenderKey: '',
  _lastRecentKey: '', _lastFavKey: '',
  recent: [],
  favs: [],
  reviews: {}
};

const LS = {
  get: k => { try { const d = JSON.parse(localStorage.getItem(k)); return Array.isArray(d) ? d : []; } catch { return []; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return 1; } catch { return 0; } },
  has: k => localStorage.getItem(k) !== null
};

/* ══════ 🔐 Admin ══════ */
const Admin = {
  isAdmin() {
    try { return sessionStorage.getItem('aem_admin') === '1'; }
    catch { return false; }
  },
  login(user, pass) {
    const u = ADMIN_USERS.find(x =>
      x.user.toLowerCase() === String(user).toLowerCase().trim()
      && x.pass === String(pass)
    );
    if (!u) return { ok: false };
    sessionStorage.setItem('aem_admin', '1');
    sessionStorage.setItem('aem_admin_name', u.name);
    return { ok: true, user: u };
  },
  logout() {
    sessionStorage.removeItem('aem_admin');
    sessionStorage.removeItem('aem_admin_name');
  },
  name() {
    try { return sessionStorage.getItem('aem_admin_name') || 'Admin'; }
    catch { return 'Admin'; }
  }
};

/* ══════ Cloud sync ══════ */
const Cloud = {
  config: window.SUPABASE_CONFIG,
  on: Boolean(window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey),
  busy: false,
  _lastKey: '',
  async pull() {
    if (!this.on || this.busy || !navigator.onLine) return;
    this.busy = true;
    try {
      const r = await fetch(`${this.config.url}/rest/v1/products?select=id,data&order=created_at.asc`, {
        headers: {
          apikey: this.config.anonKey,
          Authorization: `Bearer ${this.config.anonKey}`
        }
      });
      if (!r.ok) {
        const txt = await r.text();
        console.error('☁️ PULL falló:', r.status, txt);
        throw new Error('HTTP ' + r.status);
      }
      const rows = await r.json();
      const remote = Array.isArray(rows)
        ? rows.map(row => ({ ...(row.data || {}), id: row.id }))
        : [];

      const key = JSON.stringify(remote);
      if (key !== this._lastKey) {
        this._lastKey = key;
        normalizeProducts(remote);
        St.prod = remote;
        LS.set('aem_products', St.prod);
        St._lastRenderKey = '';
        render();
        renderRecent();
        console.log('☁️ Productos actualizados desde la nube:', remote.length);
      }
    } catch (e) { console.warn('☁️ pull:', e.message); }
    finally { this.busy = false; }
  },
  push(products) {
    console.warn('☁️ Los productos se administran desde el panel de Supabase.', products.length);
  }
};

const Save = {
  products() { LS.set('aem_products', St.prod); Cloud.push(St.prod); St._lastRenderKey = ''; },
  cart()     { LS.set('aem_cart', St.cart); }
};

const D = {
  grid: $('productsGrid'), form: $('productForm'), modal: $('productModal'), prev: $('imagePreview'),
  cart: $('cartPanel'), cartItems: $('cartItems'), cartTotal: $('cartTotal'),
  cropM: $('cropModal'), cropImg: $('cropImage'),
  confirm: $('confirmModal'), confirmMsg: $('confirmMsg'),
  nav: $('nav'), menu: $('menuToggle'), navOv: $('navOverlay'),
  loginM: $('loginModal'), recoverM: $('recoverModal'), detailM: $('detailModal'),
  themeBtn: $('themeBtn'), toast: $('toast'), toastMsg: $('toastMsg')
};

const UI = {
  toast(m, t) {
    D.toastMsg.textContent = m;
    const i = D.toast.querySelector('i');
    i.className = t === 'err' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
    D.toast.style.background = t === 'err' ? '#c0392b' : '';
    D.toast.classList.add('on');
    clearTimeout(this._t);
    this._t = setTimeout(() => D.toast.classList.remove('on'), 2200);
  },
  mo(el, o) {
    if (!el) return;
    el.classList.toggle('open', o);
    el.setAttribute('aria-hidden', !o);
    document.body.style.overflow = o ? 'hidden' : '';
  },
  ask(msg, cb) {
    D.confirmMsg.textContent = msg;
    St._cb = cb;
    this.mo(D.confirm, 1);
  }
};

const imgs = p => Array.isArray(p.images) && p.images.length ? p.images : (p.image ? [p.image] : []);
const isOut = p => p.available === false;

/* ══════ Historial ══════ */
const RECENT_KEY = 'aem_recent';
const RECENT_MAX = 8;

const Recent = {
  load() {
    try {
      const arr = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  },
  save() {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(St.recent)); } catch {}
    const c1 = $('histCount');
    if (c1) c1.textContent = St.recent.length;
    const c2 = $('histCountM');
    if (c2) c2.textContent = St.recent.length;
    const c3 = $('udHistCount');
    if (c3) c3.textContent = St.recent.length;
  },
  add(id) {
    St.recent = St.recent.filter(x => String(x) !== String(id));
    St.recent.unshift(String(id));
    if (St.recent.length > RECENT_MAX) St.recent.length = RECENT_MAX;
    this.save();
    renderRecent();
    render();
  },
  clear() {
    St.recent = [];
    this.save();
    renderRecent();
    render();
  },
  has(id) { return St.recent.some(x => String(x) === String(id)); }
};

/* ══════ Favoritos ══════ */
const FAV_KEY = 'aem_favs';

const Favs = {
  load() {
    try {
      const arr = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  },
  save() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(St.favs)); } catch {}
    const c1 = $('favCount');
    const c2 = $('favCountM');
    const c3 = $('udFavCount');
    if (c1) c1.textContent = St.favs.length;
    if (c2) c2.textContent = St.favs.length;
    if (c3) c3.textContent = St.favs.length;
  },
  has(id) { return St.favs.some(x => String(x) === String(id)); },
  toggle(id) {
    const sid = String(id);
    if (this.has(sid)) {
      St.favs = St.favs.filter(x => String(x) !== sid);
      this.save();
      return false;
    }
    St.favs.unshift(sid);
    this.save();
    return true;
  },
  clear() {
    St.favs = [];
    this.save();
    renderFavs();
  }
};

/* ══════ Reseñas ══════ */
const REVIEW_KEY = 'aem_reviews';

const Reviews = {
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}');
      return (typeof d === 'object' && d) ? d : {};
    } catch { return {}; }
  },
  save() {
    try { localStorage.setItem(REVIEW_KEY, JSON.stringify(St.reviews)); } catch {}
  },
  forProduct(id) { return St.reviews[String(id)] || []; },
  add(id, name, stars, text) {
    const sid = String(id);
    if (!St.reviews[sid]) St.reviews[sid] = [];
    St.reviews[sid].unshift({
      id: 'r-' + Date.now(),
      name: String(name).trim().slice(0, 40),
      stars: Math.min(5, Math.max(1, +stars || 5)),
      text: String(text).trim().slice(0, 300),
      date: new Date().toISOString()
    });
    this.save();
  },
  remove(productId, reviewId) {
    const sid = String(productId);
    if (!St.reviews[sid]) return;
    St.reviews[sid] = St.reviews[sid].filter(r => r.id !== reviewId);
    if (!St.reviews[sid].length) delete St.reviews[sid];
    this.save();
  },
  avg(id) {
    const list = this.forProduct(id);
    if (!list.length) return 0;
    const sum = list.reduce((s, r) => s + (+r.stars || 0), 0);
    return Math.round((sum / list.length) * 10) / 10;
  },
  count(id) { return this.forProduct(id).length; },
  starsHTML(avg) {
    const full = Math.floor(avg);
    const half = (avg - full) >= 0.5;
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= full) html += '★';
      else if (i === full + 1 && half) html += '★';
      else html += '<span class="empty">★</span>';
    }
    return html;
  }
};

const WA = {
  pending: { phone: '', msg: '' },
  open(phone, message) {
    this.pending.phone = phone;
    this.pending.msg = message;
    const enc = encodeURIComponent(message);
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    let appHref;
    if (isAndroid) {
      appHref = `intent://send?phone=${phone}&text=${enc}#Intent;scheme=whatsapp;package=com.whatsapp;end`;
    } else if (isIOS) {
      appHref = `whatsapp://send?phone=${phone}&text=${enc}`;
    } else {
      appHref = `https://web.whatsapp.com/send?phone=${phone}&text=${enc}`;
    }
    $('waAppBtn').href = appHref;
    $('waWebBtn').href = `https://web.whatsapp.com/send?phone=${phone}&text=${enc}`;
    UI.mo($('waModal'), 1);
  }
};

/* ══════ Botón de usuario + dropdown ══════ */
function updateUserButton() {
  const btn = $('userBtn');
  const drop = $('userDrop');
  const header = $('udHeader');
  if (!btn || !drop || !header) return;

  const isAdmin = Admin.isAdmin();
  const s = Auth.session();

  if (isAdmin) {
    btn.innerHTML = '<i class="fas fa-user-shield"></i>';
    btn.classList.add('has-session');
    btn.setAttribute('aria-label', 'Admin');
  } else if (s) {
    btn.innerHTML = '<i class="fas fa-user-check"></i>';
    btn.classList.add('has-session');
    btn.setAttribute('aria-label', s.name);
  } else {
    btn.innerHTML = '<i class="fas fa-user"></i>';
    btn.classList.remove('has-session');
    btn.setAttribute('aria-label', 'Iniciar sesión');
  }

  if (isAdmin) {
    const adminName = Admin.name() || 'Admin';
    header.innerHTML = `
      <div class="ud-avatar">${adminName.charAt(0).toUpperCase()}</div>
      <div class="ud-user-info">
        <b>${esc(adminName)} <span class="admin-badge">ADMIN</span></b>
        <small>Panel de administrador</small>
      </div>`;
  } else if (s) {
    header.innerHTML = `
      <div class="ud-avatar">${(s.name || '?').charAt(0).toUpperCase()}</div>
      <div class="ud-user-info">
        <b>${esc(s.name)}</b>
        <small>${esc(s.email)}</small>
      </div>`;
  } else {
    header.innerHTML = `
      <div class="ud-avatar">?</div>
      <div class="ud-user-info">
        <b>Invitado</b>
        <small>Inicia sesión para más opciones</small>
      </div>`;
  }

  const favC = $('udFavCount');
  const histC = $('udHistCount');
  if (favC) favC.textContent = St.favs.length;
  if (histC) histC.textContent = St.recent.length;
}

function openUserDrop() {
  const drop = $('userDrop');
  const btn = $('userBtn');
  if (!drop || !btn) return;
  updateUserButton();
  drop.classList.add('open');
  btn.setAttribute('aria-expanded', 'true');
}

function closeUserDrop() {
  const drop = $('userDrop');
  const btn = $('userBtn');
  if (!drop || !btn) return;
  drop.classList.remove('open');
  btn.setAttribute('aria-expanded', 'false');
}

/* ══════ Actualizar toda la UI según admin ══════ */
function updateAdminUI() {
  const isAdmin = Admin.isAdmin();
  document.body.classList.toggle('admin-mode', isAdmin);

  const addBtn = $('openAddProductBtn');
  if (addBtn) addBtn.style.display = isAdmin ? 'inline-flex' : 'none';

  const btn = $('openLoginBtn');
  if (btn) {
    if (isAdmin) {
      btn.innerHTML = `<i class="fas fa-user-shield"></i> ${Admin.name()} <span class="admin-badge">ADMIN</span>`;
    } else {
      const s = Auth.session();
      btn.innerHTML = s
        ? `<i class="fas fa-user-check"></i> ${s.name.split(' ')[0]}`
        : `<i class="fas fa-user"></i> Iniciar sesión`;
    }
  }

  render();
  renderRecent();
  updateUserButton();
}

/* ══════ Render ══════ */
function render() {
  const isAdmin = Admin.isAdmin();
  const list = St.prod.filter(p => {
    const c = St.cat === 'all' || p.category === St.cat;
    const t = !St.tag
      || (St.tag === 'agotado' ? isOut(p) : effectiveTags(p).includes(St.tag));
    const x = !St.q || [p.title, p.category, p.material, p.measures, p.description]
      .join(' ').toLowerCase().includes(St.q);
    return c && t && x;
  }).sort((a, b) => {
    const ao = isOut(a) ? 1 : 0, bo = isOut(b) ? 1 : 0;
    if (ao !== bo) return ao - bo;
    return ((b.tags || []).includes('destacado') ? 1 : 0) -
           ((a.tags || []).includes('destacado') ? 1 : 0);
  });

  const key = St.cat + '|' + St.tag + '|' + St.q + '|' + (isAdmin ? 'A' : 'U') + '|' +
              list.map(p => [
                p.id, p.title, p.category, p.price, p.oldPrice || '',
                p.available !== false, (p.tags || []).join(',')
              ].join(':')).join(',');
  if (key === St._lastRenderKey) return;
  St._lastRenderKey = key;

  if (!St.prod.length) {
    D.grid.innerHTML = '<div class="emp"><i class="fas fa-box-open"></i><h3>No hay productos</h3><p>Agrega el primero.</p></div>';
    return;
  }
  if (!list.length) {
    D.grid.innerHTML = '<div class="emp"><i class="fas fa-search"></i><h3>Sin resultados</h3><p>Prueba otra búsqueda</p></div>';
    return;
  }

  const frag = document.createDocumentFragment();
  list.forEach(p => frag.appendChild(buildCard(p, false)));
  D.grid.replaceChildren(frag);
}

function buildCard(p, isRecent) {
  const isAdmin = Admin.isAdmin();
  const im = imgs(p), main = im[0] || PH, multi = im.length > 1;
  const tg = effectiveTags(p);
  const dsc = calcDiscount(p);
  const title = cap(p.title);
  const out = isOut(p);
  const faved = Favs.has(p.id);
  const seen = Recent.has(p.id);
  const revCount = Reviews.count(p.id);
  const revAvg = Reviews.avg(p.id);

  const c = document.createElement('article');
  c.className = 'card' + (out ? ' unavailable' : '');
  c.dataset.id = p.id;

  c.innerHTML = `
    <div class="ci">
      <img src="${esc(main)}" loading="lazy" decoding="async" onerror="this.src='${PH}'" alt="${esc(title)}">
      ${out ? `<span class="badge-out">Agotado</span>` : ''}
      ${!out && tg.length ? `<div class="tt">${tg.map(t => `<span class="tg2 ${t}">${t}</span>`).join('')}</div>` : ''}
      ${!out && dsc > 0 ? `<span class="bds">-${dsc}%</span>` : ''}
      ${multi ? `<span class="imn"><i class="fas fa-images"></i> ${im.length}</span>` : ''}

      <div class="card-actions">
        <button type="button" class="card-action fav ${faved ? 'on' : ''}" data-a="fav" aria-label="${faved ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
          <i class="fas fa-heart"></i>
        </button>
        <button type="button" class="card-action hist ${seen ? 'on' : ''}" data-a="hist" aria-label="Marcar como visto" style="${seen ? 'color:#c99b5b' : ''}">
          <i class="fas fa-history"></i>
        </button>
      </div>

      ${isAdmin && !isRecent ? `
      <div class="cac">
        <button type="button" data-a="toggle" class="${out ? 'toggle-out' : 'toggle-in'}" aria-label="${out ? 'Marcar disponible' : 'Marcar agotado'}"><i class="fas ${out ? 'fa-eye' : 'fa-eye-slash'}"></i></button>
        <button type="button" data-a="edit" aria-label="Editar"><i class="fas fa-pen"></i></button>
        <button type="button" data-a="del" aria-label="Eliminar"><i class="fas fa-trash"></i></button>
      </div>` : ''}
    </div>
    <div class="cb2">
      <h3>${esc(title)}</h3>
      <div class="card-rating" data-a="openReviews" data-id="${esc(p.id)}">
        <span class="stars">${Reviews.starsHTML(revAvg)}</span>
        <span class="rating-count">
          ${revCount > 0
            ? revAvg.toFixed(1) + ' · ' + revCount + ' reseña' + (revCount !== 1 ? 's' : '')
            : 'Sin reseñas'}
        </span>
      </div>
      <p>${esc(p.description || '')}</p>
      ${dsc > 0 && !out
        ? `<div class="pr"><span class="prc">${fp(p.price)}</span><span class="old">${fp(p.oldPrice)}</span></div>`
        : `<span class="prc">${fp(p.price)}</span>`}
      ${isRecent
        ? ''
        : out
          ? `<button type="button" class="btn out" disabled><i class="fas fa-ban"></i> Agotado</button>`
          : `<button type="button" class="btn p" data-a="cart"><i class="fas fa-cart-plus"></i> Agregar</button>`}
    </div>`;
  c.dataset.imgs = JSON.stringify(im);
  return c;
}

function renderRecent() {
  const sec = $('recientes');
  const grid = $('recentGrid');
  if (!sec || !grid) return;

  const items = St.recent
    .map(id => St.prod.find(p => String(p.id) === String(id)))
    .filter(Boolean);
  const key = St.recent.join(',') + '|' + St.favs.join(',') + '|' +
    (Admin.isAdmin() ? 'A' : 'U') + '|' +
    St.prod.map(p => `${p.id}:${p.available !== false}:${p.price}:${p.oldPrice || ''}`).join(',');
  if (key === St._lastRecentKey) return;
  St._lastRecentKey = key;

  if (!items.length) {
    sec.style.display = 'none';
    return;
  }
  sec.style.display = 'block';
  const frag = document.createDocumentFragment();
  items.forEach(p => frag.appendChild(buildCard(p, true)));
  grid.replaceChildren(frag);
}

function renderFavs() {
  const grid = $('favGrid');
  if (!grid) return;
  const items = St.favs
    .map(id => St.prod.find(p => String(p.id) === String(id)))
    .filter(Boolean);
  const key = St.favs.join(',') + '|' + St.recent.join(',') + '|' +
    (Admin.isAdmin() ? 'A' : 'U') + '|' +
    St.prod.map(p => `${p.id}:${p.available !== false}:${p.price}:${p.oldPrice || ''}`).join(',');
  if (key === St._lastFavKey) return;
  St._lastFavKey = key;

  if (!items.length) {
    grid.innerHTML = `
      <div class="fav-empty">
        <i class="fas fa-heart-broken"></i>
        <h3>Sin favoritos aún</h3>
        <p style="margin:0;font-size:.85rem">Toca el corazón en cualquier producto</p>
      </div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach(p => frag.appendChild(buildCard(p, true)));
  grid.replaceChildren(frag);
}

const Detail = {
  p: null, idx: 0,
  open(id) {
    const p = St.prod.find(x => +x.id === +id || String(x.id) === String(id));
    if (!p) return;
    this.p = p; this.idx = 0;
    Recent.add(p.id);
    this.render();
    UI.mo(D.detailM, 1);
  },
  close() { UI.mo(D.detailM, 0); this.p = null; },
  render() {
    const p = this.p; if (!p) return;
    const isAdmin = Admin.isAdmin();
    const im = imgs(p), tg = effectiveTags(p);
    const dsc = calcDiscount(p);
    const title = cap(p.title);
    const out = isOut(p);
    const faved = Favs.has(p.id);
    const revCount = Reviews.count(p.id);
    const revAvg = Reviews.avg(p.id);
    const ICONS = { nuevo: 'fa-certificate', oferta: 'fa-tag', destacado: 'fa-star' };
    const tagsHTML = tg.map(t => `<span class="tg2 ${t}"><i class="fas ${ICONS[t] || 'fa-tag'}"></i> ${t}</span>`).join('');
    const thumbsHTML = im.length > 1
      ? `<div class="detail-thumbs">${im.map((x, i) => `<button class="detail-thumb ${i === this.idx ? 'on' : ''}" data-i="${i}"><img src="${esc(x)}" loading="lazy" decoding="async" alt=""></button>`).join('')}</div>`
      : '';

    $('detailContent').innerHTML = `
      <div class="detail-gallery">
        ${thumbsHTML}
        <div class="detail-main"><img src="${esc(im[this.idx] || PH)}" id="detailMain" alt="${esc(title)}" onerror="this.src='${PH}'"></div>
      </div>
      <div class="detail-info">
        <div class="detail-meta"><span>${esc(p.category)}</span></div>
        <h2 class="detail-title">${esc(title)}</h2>
        ${tagsHTML && !out ? `<div class="detail-tags">${tagsHTML}</div>` : ''}
        <div class="card-rating" data-a="openReviews" data-id="${esc(p.id)}" style="padding:.4rem 0">
          <span class="stars" style="font-size:1rem">${Reviews.starsHTML(revAvg)}</span>
          <span class="rating-count" style="font-size:.85rem">
            ${revCount > 0
              ? revAvg.toFixed(1) + ' · ' + revCount + ' reseña' + (revCount !== 1 ? 's' : '')
              : 'Sin reseñas · ¡Sé el primero!'}
          </span>
        </div>
        <div class="detail-price-box">
          <span class="detail-price">${fp(p.price)}</span>
          ${p.oldPrice && dsc > 0 && !out ? `<span class="detail-old">${fp(p.oldPrice)}</span>` : ''}
          ${dsc > 0 && !out ? `<span class="detail-discount">-${dsc}%</span>` : ''}
        </div>
        <div class="detail-feats">
          ${p.material ? `<div><i class="fas fa-tree"></i> Material: <strong>${esc(p.material)}</strong></div>` : ''}
          ${p.measures ? `<div><i class="fas fa-ruler-combined"></i> Medidas: <strong>${esc(p.measures)}</strong></div>` : ''}
          ${p.shipping ? `<div><i class="fas fa-truck"></i> ${esc(p.shipping)}</div>` : ''}
          <div><i class="fas fa-map-marker-alt"></i> El Manglillo, Península de Macanao</div>
        </div>
        <span class="sold-inline ${out ? 'out' : ''}"><i class="fas ${out ? 'fa-ban' : 'fa-fire'}"></i> ${out ? 'Agotado' : 'Disponible'}</span>
        ${p.description ? `<p class="detail-desc">${esc(p.description)}</p>` : ''}
        <div class="detail-actions">
          ${out
            ? `<button class="btn out" disabled><i class="fas fa-ban"></i> Producto agotado</button>`
            : `<button class="btn p" id="detailAddBtn"><i class="fas fa-cart-plus"></i> Agregar al carrito</button>`}
          <div class="detail-share">
            <button id="detailFavBtn" class="detail-fav ${faved ? 'on' : ''}">
              <i class="fas fa-heart"></i> <span>${faved ? 'En favoritos' : 'Favorito'}</span>
            </button>
            <button id="detailRevBtn"><i class="fas fa-star"></i> Reseñas (${revCount})</button>
            <button id="detailWaBtn"><i class="fab fa-whatsapp"></i> Consultar</button>
            ${isAdmin ? `<button id="detailEditBtn"><i class="fas fa-pen"></i> Editar</button>` : ''}
          </div>
        </div>
      </div>`;

    $('detailMain').addEventListener('click', () => { this.idx = (this.idx + 1) % im.length; this.render(); });
    $$('.detail-thumb').forEach(t => t.addEventListener('click', () => { this.idx = +t.dataset.i; this.render(); }));
    const btnAdd = $('detailAddBtn');
    if (btnAdd) btnAdd.addEventListener('click', () => addCart(p.id));
    $('detailWaBtn').addEventListener('click', () => {
      WA.open(CFG.WA, `Hola, me interesa: ${title}\nPrecio: ${fp(p.price)}\n📍 El Manglillo, Península de Macanao`);
    });
    const editBtn = $('detailEditBtn');
    if (editBtn) editBtn.addEventListener('click', () => { this.close(); openModal(p); });
    $('detailFavBtn').addEventListener('click', () => {
      const now = Favs.toggle(p.id);
      UI.toast(now ? '❤️ Agregado a favoritos' : '💔 Quitado de favoritos');
      renderFavs(); render(); renderRecent(); this.render();
    });
    $('detailRevBtn').addEventListener('click', () => {
      this.close();
      openReviewModal(p.id);
    });
    const ratingBox = $('detailContent').querySelector('[data-a="openReviews"]');
    if (ratingBox) ratingBox.addEventListener('click', () => {
      this.close();
      openReviewModal(p.id);
    });
  }
};

function openModal(p = null) {
  if (!Admin.isAdmin()) { UI.toast('Solo administradores', 'err'); return; }
  St.editId = p?.id ?? null;
  D.form.reset();
  St.imgs = p ? imgs(p) : [];
  if (p) {
    $('pTitle').textContent = 'Editar producto';
    const map = { pName: 'title', pCat: 'category', pPrice: 'price', pOld: 'oldPrice', pMat: 'material', pMed: 'measures', pShip: 'shipping', pDesc: 'description' };
    Object.entries(map).forEach(([el, key]) => { $(el).value = p[key] ?? ''; });
    const t = effectiveTags(p);
    $('tN').checked = t.includes('nuevo');
    $('tO').checked = t.includes('oferta');
    $('tD').checked = t.includes('destacado');
    $('tA').checked = p.available !== false;
  } else {
    $('pTitle').textContent = 'Nuevo producto';
    $('tA').checked = true;
    setTimeout(() => { $('tA').checked = true; }, 0);
  }
  renderPrev();
  UI.mo(D.modal, 1);
  setTimeout(() => $('pName').focus(), 300);
}

function renderPrev() {
  D.prev.innerHTML = St.imgs.map((x, i) =>
    `<div class="pvi"><img src="${esc(x)}" loading="lazy" decoding="async" alt=""><button type="button" data-i="${i}">&times;</button>${i ? '' : '<span class="lbl">Principal</span>'}</div>`
  ).join('');
}

async function processImg() {
  if (!St.files.length) return;
  const f = St.files.shift();
  const r = new FileReader();
  r.onload = e => {
    D.cropImg.src = e.target.result;
    D.cropImg.onload = async () => {
      if (typeof Cropper === 'undefined') {
        try { await loadCropper(); }
        catch { UI.toast('No se pudo cargar el editor', 'err'); return; }
      }
      if (St.cropper) St.cropper.destroy();
      St.cropper = new Cropper(D.cropImg, { viewMode: 1, autoCropArea: 0.9, background: false });
      UI.mo(D.cropM, 1);
    };
  };
  r.readAsDataURL(f);
}

let _reviewProductId = null;
let _reviewStars = 5;

function openReviewModal(id) {
  const p = St.prod.find(x => String(x.id) === String(id));
  if (!p) return;
  _reviewProductId = String(id);
  _reviewStars = 5;

  $('revTitle').innerHTML = `<i class="fas fa-star" style="color:#f5b301"></i> ${esc(cap(p.title))}`;

  renderReviewSummary();
  renderReviewList();
  updateStarInput();

  $('revName').value = '';
  $('revText').value = '';
  $('revStarsInput').querySelectorAll('button').forEach(b => b.classList.remove('on'));

  UI.mo($('reviewModal'), 1);
}

function renderReviewSummary() {
  const id = _reviewProductId;
  const avg = Reviews.avg(id);
  const count = Reviews.count(id);
  const el = $('revSummary');

  if (count === 0) {
    el.innerHTML = `
      <div class="big-num">—</div>
      <div class="info">
        <span class="stars">${Reviews.starsHTML(0)}</span>
        <small>Aún sin reseñas</small>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="big-num">${avg.toFixed(1)}</div>
    <div class="info">
      <span class="stars">${Reviews.starsHTML(avg)}</span>
      <small>${count} reseña${count !== 1 ? 's' : ''}</small>
    </div>`;
}

function renderReviewList() {
  const list = Reviews.forProduct(_reviewProductId);
  const el = $('revList');
  const isAdmin = Admin.isAdmin();

  if (!list.length) {
    el.innerHTML = `
      <div class="rev-empty">
        <i class="fas fa-comments"></i>
        <p style="margin:0;font-size:.85rem">Sé el primero en opinar</p>
      </div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  list.forEach(r => {
    const d = new Date(r.date);
    const fecha = d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
    const item = document.createElement('div');
    item.className = 'rev-item';
    item.innerHTML = `
      <div class="rev-item-header">
        <div>
          <b>${esc(r.name)}</b>
          <div class="rev-item-stars">${Reviews.starsHTML(r.stars)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem">
          <small>${fecha}</small>
          ${isAdmin ? `<button type="button" class="rev-item-del" data-rev-del="${esc(r.id)}" aria-label="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </div>
      <p class="rev-item-text">${esc(r.text)}</p>`;
    frag.appendChild(item);
  });
  el.replaceChildren(frag);
}

function updateStarInput() {
  const btns = $('revStarsInput').querySelectorAll('button');
  btns.forEach(b => {
    const v = +b.dataset.v;
    b.classList.toggle('on', v <= _reviewStars);
  });
}

function useDemoIfEmpty() {
  if (St.prod.length > 0) return;
  St.prod = DEMO.slice();
  LS.set('aem_products', St.prod);
  St._lastRenderKey = '';
  render();
}

function init() {
  try {
    Theme.init();

    if (!LS.has('aem_products')) {
      St.prod = [];
      LS.set('aem_products', St.prod);
    } else {
      St.prod = LS.get('aem_products');
      normalizeProducts(St.prod);
    }

    St.cart = LS.get('aem_cart');
    St.recent = Recent.load();
    St.favs = Favs.load();
    St.reviews = Reviews.load();
    Favs.save();
    Recent.save();

    render();
    renderCart();
    renderRecent();
    renderFavs();
    updateAdminUI();
    updateUserButton();

    const syncOferta = () => {
      const price = +$('pPrice').value || 0;
      const old = +$('pOld').value || 0;
      $('tO').checked = old > 0 && old > price;
    };
    $('pPrice').addEventListener('input', syncOferta);
    $('pOld').addEventListener('input', syncOferta);

    const heroRecentBtn = $('heroRecentBtn');
    if (heroRecentBtn) {
      heroRecentBtn.addEventListener('click', e => {
        e.preventDefault();
        const sec = $('recientes');
        if (sec && sec.style.display !== 'none') {
          sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          UI.toast('Aún no has visto ningún producto', 'err');
        }
      });
    }

    if (Cloud.on) {
      Cloud.pull().then(() => {
        if (St.prod.length === 0) useDemoIfEmpty();
      });
      setInterval(() => {
        if (document.visibilityState === 'visible') Cloud.pull();
      }, CFG.SYNC_MS);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) Cloud.pull();
      }, { passive: true });
    } else {
      useDemoIfEmpty();
    }
  } catch (err) {
    console.error('❌ Error en init:', err);
  }
}

D.form.addEventListener('submit', e => {
  e.preventDefault();
  if (!Admin.isAdmin()) { UI.toast('Solo administradores', 'err'); return; }

  const wasEdit = St.editId !== null;
  const t  = $('pName').value.trim();
  const c  = $('pCat').value;
  const p  = +$('pPrice').value;
  const op = $('pOld').value ? +$('pOld').value : null;
  const url = $('pUrl').value.trim();
  const im = St.imgs.length ? [...St.imgs] : (url ? [url] : []);
  let tg = [$('tN'), $('tO'), $('tD')].filter(x => x.checked).map(x => x.value);

  if (!t || !c || !Number.isFinite(p) || p < 0) { UI.toast('Completa los campos', 'err'); return; }
  if (!im.length) { UI.toast('Sube una imagen o pega una URL', 'err'); return; }
  if (op && op <= p) { UI.toast('Precio anterior debe ser mayor', 'err'); return; }

  const ofertaIdx = tg.indexOf('oferta');
  if (op && op > p) {
    if (ofertaIdx === -1) tg.push('oferta');
  } else if (ofertaIdx > -1) {
    tg = tg.filter(x => x !== 'oferta');
  }

  const data = {
    id: St.editId ?? ('p-' + Date.now()),
    title: cap(t), category: c, price: p, oldPrice: op,
    images: im, image: im[0], tags: tg,
    available: $('tA').checked,
    material: $('pMat').value.trim(),
    measures: $('pMed').value.trim(),
    shipping: $('pShip').value.trim(),
    description: $('pDesc').value.trim()
  };

  if (wasEdit) {
    const i = St.prod.findIndex(x => String(x.id) === String(St.editId));
    if (i > -1) St.prod[i] = data;
  } else {
    const onlyDemo = St.prod.every(x => String(x.id).startsWith('demo-'));
    if (onlyDemo) St.prod = [];
    St.prod.push(data);
  }

  Save.products();
  render();
  UI.mo(D.modal, 0);
  St.imgs = []; St.editId = null;
  UI.toast(wasEdit ? 'Actualizado' : 'Agregado');
});

function addCart(id) {
  const p = St.prod.find(x => String(x.id) === String(id));
  if (!p) return;
  if (isOut(p)) { UI.toast('Producto agotado', 'err'); return; }
  const i = St.cart.find(x => String(x.id) === String(id));
  if (i) i.quantity++;
  else St.cart.push({
    id: p.id, title: cap(p.title), price: +p.price || 0,
    image: imgs(p)[0] || PH, quantity: 1
  });
  Save.cart(); renderCart(); openCart();
  UI.toast(`${cap(p.title)} agregado`);
}

function renderCart() {
  const qty = St.cart.reduce((s, i) => s + i.quantity, 0);
  const c1 = $('cartCount'), c2 = $('cartCountM');
  if (c1) c1.textContent = qty;
  if (c2) c2.textContent = qty;
  const statCartEl = $('statCart');
  if (statCartEl) statCartEl.textContent = qty;

  if (!St.cart.length) {
    D.cartItems.innerHTML = '<div class="ce"><i class="fas fa-shopping-cart"></i><p>Tu carrito está vacío</p></div>';
    D.cartTotal.textContent = '$0';
    return;
  }
  const hasOut = St.cart.some(i => {
    const p = St.prod.find(x => String(x.id) === String(i.id));
    return p && isOut(p);
  });
  let tot = 0;
  const frag = document.createDocumentFragment();
  if (hasOut) {
    const warn = document.createElement('div');
    warn.className = 'cart-warn';
    warn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Algunos productos están agotados.';
    frag.appendChild(warn);
  }
  St.cart.forEach(i => {
    const s = i.price * i.quantity; tot += s;
    const prod = St.prod.find(x => String(x.id) === String(i.id));
    const out = prod && isOut(prod);
    const el = document.createElement('div');
    el.className = 'cit';
    el.dataset.id = i.id;
    el.innerHTML = `
      <img src="${esc(i.image)}" loading="lazy" decoding="async" onerror="this.src='${PH}'" alt="" style="${out ? 'filter:grayscale(.85)' : ''}">
      <div><b>${esc(cap(i.title))}</b><small>${fp(i.price)}</small>
        <div class="a3">
          <button class="qb" data-a="dec" aria-label="Menos">−</button><span>${i.quantity}</span>
          <button class="qb" data-a="inc" aria-label="Más">+</button>
          <button class="rm" data-a="rm" aria-label="Eliminar"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
      <div class="cs">${fp(s)}</div>`;
    frag.appendChild(el);
  });
  D.cartItems.replaceChildren(frag);
  D.cartTotal.textContent = fp(tot);
}

const openCart  = () => { D.cart.classList.add('open'); $('cartBackdrop').classList.add('on'); document.body.style.overflow = 'hidden'; };
const closeCart = () => { D.cart.classList.remove('open'); $('cartBackdrop').classList.remove('on'); document.body.style.overflow = ''; };

D.grid.addEventListener('click', e => {
  const card = e.target.closest('.card'); if (!card) return;
  const id = card.dataset.id;
  const b = e.target.closest('[data-a]');
  if (b) {
    const a = b.dataset.a;

    if (a === 'openReviews') {
      e.stopPropagation();
      openReviewModal(b.dataset.id || id);
      return;
    }
    if (a === 'fav') {
      const now = Favs.toggle(id);
      b.classList.toggle('on', now);
      UI.toast(now ? '❤️ Añadido' : '💔 Quitado');
      renderFavs(); renderRecent();
      return;
    }
    if (a === 'hist') {
      if (Recent.has(id)) {
        St.recent = St.recent.filter(x => String(x) !== String(id));
        Recent.save();
        UI.toast('🕐 Quitado');
      } else {
        Recent.add(id);
        UI.toast('🕐 Añadido');
      }
      render(); renderRecent();
      return;
    }
    if (!Admin.isAdmin()) { UI.toast('Solo administradores', 'err'); return; }
    if (a === 'toggle') {
      const p = St.prod.find(x => String(x.id) === String(id));
      if (!p) return;
      p.available = isOut(p);
      Save.products(); render();
      UI.toast(p.available === false ? '🚫 Agotado' : '✅ Disponible');
      return;
    }
    if (a === 'edit') { const p = St.prod.find(x => String(x.id) === String(id)); if (p) openModal(p); return; }
    if (a === 'del') {
      const p = St.prod.find(x => String(x.id) === String(id));
      if (!p) return;
      UI.ask(`¿Eliminar "${cap(p.title)}"?`, () => {
        St.prod = St.prod.filter(x => String(x.id) !== String(id));
        St.favs = St.favs.filter(x => String(x) !== String(id));
        St.recent = St.recent.filter(x => String(x) !== String(id));
        delete St.reviews[String(id)];
        Reviews.save(); Favs.save(); Recent.save(); Save.products();
        render(); renderRecent(); renderFavs();
        UI.toast('Eliminado', 'err');
      });
      return;
    }
    if (a === 'cart') { addCart(id); return; }
  }
  if (e.target.closest('.ci') || e.target.closest('.cb2 h3')) Detail.open(id);
});

const recentGrid = $('recentGrid');
if (recentGrid) {
  recentGrid.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    const id = card.dataset.id;
    const b = e.target.closest('[data-a]');
    if (b) {
      const a = b.dataset.a;
      if (a === 'openReviews') {
        e.stopPropagation();
        openReviewModal(b.dataset.id || id);
        return;
      }
      if (a === 'fav') {
        const now = Favs.toggle(id);
        b.classList.toggle('on', now);
        UI.toast(now ? '❤️ Añadido' : '💔 Quitado');
        renderFavs(); render();
        return;
      }
      if (a === 'hist') {
        St.recent = St.recent.filter(x => String(x) !== String(id));
        Recent.save(); renderRecent(); render();
        return;
      }
    }
    Detail.open(id);
  });
}

const favGrid = $('favGrid');
if (favGrid) {
  favGrid.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    const id = card.dataset.id;
    const b = e.target.closest('[data-a]');
    if (b) {
      const a = b.dataset.a;
      if (a === 'openReviews') {
        e.stopPropagation();
        openReviewModal(b.dataset.id || id);
        return;
      }
      if (a === 'fav') {
        const now = Favs.toggle(id);
        b.classList.toggle('on', now);
        UI.toast(now ? '❤️ Añadido' : '💔 Quitado');
        renderFavs(); render(); renderRecent();
        return;
      }
      if (a === 'hist') {
        if (Recent.has(id)) {
          St.recent = St.recent.filter(x => String(x) !== String(id));
          Recent.save();
        } else {
          Recent.add(id);
        }
        render(); renderRecent();
        return;
      }
      if (a === 'cart') { addCart(id); return; }
    }
    Detail.open(id);
  });
}

D.cartItems.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const id = b.closest('.cit').dataset.id, a = b.dataset.a;
  const it = St.cart.find(x => String(x.id) === String(id)); if (!it) return;
  if (a === 'rm') { St.cart = St.cart.filter(x => String(x.id) !== String(id)); UI.toast('Eliminado', 'err'); }
  else if (a === 'inc') it.quantity++;
  else if (a === 'dec') { it.quantity--; if (it.quantity <= 0) St.cart = St.cart.filter(x => String(x.id) !== String(id)); }
  Save.cart(); renderCart();
});

D.prev.addEventListener('click', e => {
  const b = e.target.closest('button[data-i]'); if (!b) return;
  St.imgs.splice(+b.dataset.i, 1); renderPrev();
});

$('pImages').addEventListener('change', e => {
  const files = [...e.target.files].filter(f => f.type.startsWith('image/'));
  e.target.value = '';
  if (!files.length) return;
  if (St.imgs.length + files.length > 5) { UI.toast('Máx 5 imágenes', 'err'); return; }
  St.files = files;
  processImg();
});

$('applyCropBtn').addEventListener('click', () => {
  if (!St.cropper) return;
  const c = St.cropper.getCroppedCanvas({ maxWidth: 1200, maxHeight: 1200, imageSmoothingQuality: 'high' });
  if (!c) return;
  St.imgs.push(c.toDataURL('image/jpeg', 0.85));
  renderPrev();
  St.cropper.destroy(); St.cropper = null;
  UI.mo(D.cropM, 0);
  if (St.files.length) setTimeout(processImg, 150);
  else UI.toast(`${St.imgs.length} imagen(es) lista(s)`);
});

['cancelCropBtn', 'cancelCropAction'].forEach(id =>
  $(id).addEventListener('click', () => {
    St.files = [];
    if (St.cropper) { St.cropper.destroy(); St.cropper = null; }
    UI.mo(D.cropM, 0);
  })
);

$('openAddProductBtn').addEventListener('click', () => openModal());
['closeProductModal', 'cancelProductBtn'].forEach(id => $(id).addEventListener('click', () => UI.mo(D.modal, 0)));
D.modal.addEventListener('click', e => { if (e.target === D.modal) UI.mo(D.modal, 0); });

['closeConfirmModal', 'cancelConfirmBtn'].forEach(id => $(id).addEventListener('click', () => UI.mo(D.confirm, 0)));
$('confirmActionBtn').addEventListener('click', () => {
  const cb = St._cb; St._cb = null;
  UI.mo(D.confirm, 0);
  if (typeof cb === 'function') cb();
});
D.confirm.addEventListener('click', e => { if (e.target === D.confirm) UI.mo(D.confirm, 0); });

/* ══════ Dropdown de usuario ══════ */
$('userBtn')?.addEventListener('click', e => {
  e.stopPropagation();
  const drop = $('userDrop');
  if (drop?.classList.contains('open')) closeUserDrop();
  else openUserDrop();
});

document.addEventListener('click', e => {
  const wrap = $('userDropWrap');
  if (wrap && !wrap.contains(e.target)) closeUserDrop();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeUserDrop();
});

$('udProfileBtn')?.addEventListener('click', () => {
  closeUserDrop();
  if (Admin.isAdmin() || Auth.session()) Profile.open();
  else { switchAuthTab('login'); UI.mo(D.loginM, 1); }
});

$('udOrdersBtn')?.addEventListener('click', () => {
  closeUserDrop();
  if (Admin.isAdmin() || Auth.session()) Profile.orders();
  else { switchAuthTab('login'); UI.mo(D.loginM, 1); }
});

$('udFavBtn')?.addEventListener('click', () => {
  closeUserDrop();
  renderFavs();
  UI.mo($('favModal'), 1);
});

$('udHistBtn')?.addEventListener('click', () => {
  closeUserDrop();
  const sec = $('recientes');
  if (sec && sec.style.display !== 'none') {
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    UI.toast('Aún no has visto ningún producto', 'err');
  }
});

$('udLogoutBtn')?.addEventListener('click', () => {
  closeUserDrop();
  const isAdmin = Admin.isAdmin();
  const s = Auth.session();
  if (!isAdmin && !s) {
    UI.toast('No hay sesión activa', 'err');
    return;
  }
  UI.ask('¿Cerrar sesión?', () => {
    sessionStorage.removeItem('aem_session');
    Admin.logout();
    updateUserButton();
    updateAdminUI();
    UI.toast('Sesión cerrada');
  });
});

/* ══════ Botones en header ══════ */
$('histBtn')?.addEventListener('click', () => {
  const sec = $('recientes');
  if (sec && sec.style.display !== 'none') {
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    UI.toast('Aún no has visto ningún producto', 'err');
  }
});

$('favBtn')?.addEventListener('click', () => {
  renderFavs();
  UI.mo($('favModal'), 1);
});
$('closeFavModal')?.addEventListener('click', () => UI.mo($('favModal'), 0));
$('favModal')?.addEventListener('click', e => { if (e.target === $('favModal')) UI.mo($('favModal'), 0); });
$('clearFavBtn')?.addEventListener('click', () => {
  if (!St.favs.length) { UI.toast('No hay favoritos', 'err'); return; }
  UI.ask('¿Vaciar todos los favoritos?', () => {
    Favs.clear(); renderFavs(); render(); renderRecent();
    UI.toast('Favoritos vaciados');
  });
});

/* ══════ Botón del menú móvil ══════ */
$('histBtnM')?.addEventListener('click', () => {
  closeMenu();
  setTimeout(() => {
    const sec = $('recientes');
    if (sec && sec.style.display !== 'none') {
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      UI.toast('Aún no has visto ningún producto', 'err');
    }
  }, 200);
});

$('favBtnM')?.addEventListener('click', () => {
  closeMenu();
  setTimeout(() => {
    renderFavs();
    UI.mo($('favModal'), 1);
  }, 200);
});

$('closeReviewModal')?.addEventListener('click', () => UI.mo($('reviewModal'), 0));
$('reviewModal')?.addEventListener('click', e => {
  if (e.target === $('reviewModal')) UI.mo($('reviewModal'), 0);
});

$('revStarsInput')?.addEventListener('click', e => {
  const b = e.target.closest('button[data-v]');
  if (!b) return;
  _reviewStars = +b.dataset.v;
  updateStarInput();
});

$('revStarsInput')?.addEventListener('mouseover', e => {
  const b = e.target.closest('button[data-v]');
  if (!b) return;
  const v = +b.dataset.v;
  $('revStarsInput').querySelectorAll('button').forEach(x => {
    x.classList.toggle('on', +x.dataset.v <= v);
  });
});

$('revStarsInput')?.addEventListener('mouseleave', () => {
  updateStarInput();
});

$('reviewForm')?.addEventListener('submit', e => {
  e.preventDefault();
  if (!_reviewProductId) return;
  const name = $('revName').value.trim();
  const text = $('revText').value.trim();
  if (!name || !text) { UI.toast('Completa nombre y comentario', 'err'); return; }

  Reviews.add(_reviewProductId, name, _reviewStars, text);
  $('revName').value = '';
  $('revText').value = '';
  _reviewStars = 5;
  updateStarInput();

  renderReviewSummary();
  renderReviewList();
  render();
  renderRecent();
  UI.toast('⭐ ¡Gracias por tu reseña!');
});

$('revList')?.addEventListener('click', e => {
  const b = e.target.closest('[data-rev-del]');
  if (!b) return;
  if (!Admin.isAdmin()) { UI.toast('Solo administradores', 'err'); return; }
  const revId = b.dataset.revDel;
  UI.ask('¿Eliminar esta reseña?', () => {
    Reviews.remove(_reviewProductId, revId);
    renderReviewSummary();
    renderReviewList();
    render();
    renderRecent();
    UI.toast('Reseña eliminada', 'err');
  });
});

$('filters').addEventListener('click', e => {
  const b = e.target.closest('.f'); if (!b) return;
  $$('.f').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  St.cat = b.dataset.cat || 'all';
  St.tag = b.dataset.tag || null;
  render();
});

let sT;
$('searchInput').addEventListener('input', e => {
  St.q = e.target.value.toLowerCase().trim();
  $('searchClear').classList.toggle('visible', e.target.value.length > 0);
  clearTimeout(sT);
  sT = setTimeout(render, 200);
}, { passive: true });

$('searchClear').addEventListener('click', () => {
  St.q = ''; $('searchInput').value = '';
  $('searchClear').classList.remove('visible');
  render();
});

$('cartBtn').addEventListener('click', openCart);
$('closeCartBtn').addEventListener('click', closeCart);
$('cartBackdrop').addEventListener('click', closeCart);

$('checkoutBtn').addEventListener('click', () => {
  if (!St.cart.length) { UI.toast('Carrito vacío', 'err'); return; }
  const hasOut = St.cart.some(i => {
    const p = St.prod.find(x => String(x.id) === String(i.id));
    return p && isOut(p);
  });
  if (hasOut) { UI.toast('Quita los productos agotados', 'err'); return; }

  const tot = St.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const s = Auth.session();
  const orders = LS.get('aem_orders');
  orders.push({
    id: Date.now(),
    date: new Date().toISOString(),
    userEmail: s ? s.email : null,
    items: [...St.cart]
  });
  LS.set('aem_orders', orders);

  const txt = St.cart.map(i => `• ${cap(i.title)} x${i.quantity} = ${fp(i.price * i.quantity)}`).join('\n');
  const cliente = s ? `\n\nCliente: ${s.name}` : '';
  const msg = `¡Hola! Quiero hacer un pedido:\n\n${txt}\n\nTOTAL: ${fp(tot)}${cliente}\n\n📍 Entrega en El Manglillo, Península de Macanao`;

  WA.open(CFG.WA, msg);
  St.cart = [];
  Save.cart(); renderCart(); closeCart();
});

$('closeWaModal').addEventListener('click', () => UI.mo($('waModal'), 0));
$('waModal').addEventListener('click', e => { if (e.target === $('waModal')) UI.mo($('waModal'), 0); });
$('waCopyBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(WA.pending.msg);
    const b = $('waCopyBtn');
    b.classList.add('ok');
    $('waCopyTxt').textContent = '¡Copiado!';
    setTimeout(() => { b.classList.remove('ok'); $('waCopyTxt').textContent = 'Copiar mensaje'; }, 1800);
  } catch { UI.toast('No se pudo copiar', 'err'); }
});
$('waAppBtn').addEventListener('click', () => setTimeout(() => UI.mo($('waModal'), 0), 300));
$('waWebBtn').addEventListener('click', () => setTimeout(() => UI.mo($('waModal'), 0), 300));

$('clearRecentBtn')?.addEventListener('click', () => {
  Recent.clear();
  UI.toast('Historial limpiado');
});

const Theme = {
  init() {
    this.apply(localStorage.getItem('aem_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    D.themeBtn.addEventListener('click', () => this.toggle());
  },
  apply(t) {
    ROOT.setAttribute('data-theme', t);
    D.themeBtn.querySelector('i').className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  },
  toggle() {
    const next = ROOT.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    this.apply(next);
    localStorage.setItem('aem_theme', next);
    UI.toast(next === 'dark' ? '🌙 Modo oscuro' : '☀️ Modo claro');
  }
};

const Auth = {
  users: () => LS.get('aem_users'),
  save: u => LS.set('aem_users', u),
  session: () => { try { return JSON.parse(sessionStorage.getItem('aem_session')); } catch { return null; } },
  set: u => sessionStorage.setItem('aem_session', JSON.stringify(u)),
  register(name, email, pass) {
    email = email.toLowerCase().trim();
    if (name.length < 2) return { error: 'Ingresa tu nombre completo' };
    if (!email) return { error: 'Ingresa un correo o teléfono' };
    if (ADMIN_USERS.find(x => x.user.toLowerCase() === email)) return { error: 'Ese correo ya está en uso' };
    const users = this.users();
    if (users.find(u => u.email === email)) return { error: 'Ese correo ya está registrado' };
    const u = { id: Date.now(), name, email, password: hash(pass), role: 'user', createdAt: new Date().toISOString() };
    users.push(u); this.save(users);
    return { ok: true, user: u };
  },
  login(email, pass) {
    email = email.toLowerCase().trim();
    const adm = ADMIN_USERS.find(x => x.user.toLowerCase() === email && x.pass === pass);
    if (adm) {
      Admin.login(adm.user, pass);
      return { ok: true, user: { name: adm.name, email: adm.user, role: 'admin', createdAt: new Date().toISOString() }, isAdmin: true };
    }
    const u = this.users().find(x => x.email === email);
    if (!u) return { error: 'No existe una cuenta con ese correo' };
    if (u.password !== hash(pass)) return { error: 'Contraseña incorrecta' };
    return { ok: true, user: u };
  }
};

function switchAuthTab(tab) {
  $$('.auth-form').forEach(f => f.classList.toggle('active', f.dataset.form === tab));
  $('authTitle').textContent = tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
  $('loginError').classList.remove('on');
  $('regError').classList.remove('on');
}

$$('[data-goto]').forEach(b => b.addEventListener('click', () => switchAuthTab(b.dataset.goto)));

$('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const r = Auth.login($('loginEmail').value, $('loginPassword').value);
  if (r.ok) {
    Auth.set(r.user); UI.mo(D.loginM, 0);
    updateAdminUI();
    if (r.isAdmin) UI.toast(`👑 Bienvenido ${r.user.name}`);
    else UI.toast(`¡Bienvenido, ${r.user.name.split(' ')[0]}!`);
  } else {
    $('loginError').textContent = r.error;
    $('loginError').classList.add('on');
  }
});

$('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('regName').value.trim();
  const email = $('regEmail').value.trim();
  const pass = $('regPassword').value;
  const pass2 = $('regPassword2').value;
  if (pass !== pass2) {
    $('regError').textContent = 'Las contraseñas no coinciden';
    $('regError').classList.add('on'); return;
  }
  const r = Auth.register(name, email, pass);
  if (r.ok) {
    Auth.set(r.user); UI.mo(D.loginM, 0); updateAdminUI();
    $('registerForm').reset();
    UI.toast(`¡Cuenta creada! ${r.user.name.split(' ')[0]}`);
  } else {
    $('regError').textContent = r.error;
    $('regError').classList.add('on');
  }
});

$('openLoginBtn').addEventListener('click', () => {
  closeMenu();
  if (Admin.isAdmin()) {
    Profile.open();
  } else {
    switchAuthTab('login');
    UI.mo(D.loginM, 1);
  }
});
$('closeLoginBtn').addEventListener('click', () => UI.mo(D.loginM, 0));
D.loginM.addEventListener('click', e => { if (e.target === D.loginM) UI.mo(D.loginM, 0); });

const Recover = {
  data: { email: '', code: '', exp: 0 },
  gen() { return String(Math.floor(100000 + Math.random() * 900000)); },
  step(n) {
    $$('.rec').forEach(f => f.classList.toggle('active', f.id === 'recStep' + n));
    $('recTitle').textContent = ['Recuperar contraseña', 'Verificar código', 'Nueva contraseña'][n - 1];
    [1, 2, 3].forEach(i => $('recErr' + i)?.classList.remove('on'));
  },
  err(n, msg) { $('recErr' + n).textContent = msg; $('recErr' + n).classList.add('on'); },
  send(email) {
    email = email.toLowerCase().trim();
    if (!email) return this.err(1, 'Ingresa tu correo o teléfono');
    const user = Auth.users().find(u => u.email === email);
    if (!user) return this.err(1, 'No existe una cuenta con ese correo');
    const code = this.gen();
    this.data = { email, code, exp: Date.now() + 600000 };
    const txt = `🔐 Recuperar contraseña\n\nUsuario: ${user.name}\nCorreo: ${email}\nCódigo: *${code}*\n\nVálido 10 min.`;
    WA.open(CFG.WA, txt);
    this.step(2);
    $('recCode').value = '';
    setTimeout(() => $('recCode').focus(), 200);
  },
  verify(input) {
    if (!this.data.code) return this.err(2, 'Solicita un código primero');
    if (Date.now() > this.data.exp) return this.err(2, 'El código expiró');
    if (input.trim() !== this.data.code) return this.err(2, 'Código incorrecto');
    this.step(3);
    $('recNewPass').value = ''; $('recNewPass2').value = '';
    setTimeout(() => $('recNewPass').focus(), 200);
  },
  save(pass, pass2) {
    if (pass.length < 6) return this.err(3, 'Mínimo 6 caracteres');
    if (pass !== pass2) return this.err(3, 'Las contraseñas no coinciden');
    const users = Auth.users();
    const u = users.find(x => x.email === this.data.email);
    if (!u) return this.err(3, 'Usuario no encontrado');
    u.password = hash(pass); Auth.save(users);
    this.data = { email: '', code: '', exp: 0 };
    UI.mo(D.recoverM, 0);
    UI.toast('✅ Contraseña actualizada');
    this.step(1);
    $('recStep1').reset();
  }
};

$('forgotBtn').addEventListener('click', () => {
  UI.mo(D.loginM, 0);
  Recover.step(1);
  UI.mo(D.recoverM, 1);
  setTimeout(() => $('recEmail').focus(), 300);
});
$('closeRecoverBtn').addEventListener('click', () => UI.mo(D.recoverM, 0));
D.recoverM.addEventListener('click', e => { if (e.target === D.recoverM) UI.mo(D.recoverM, 0); });
$('recStep1').addEventListener('submit', e => { e.preventDefault(); Recover.send($('recEmail').value); });
$('recStep2').addEventListener('submit', e => { e.preventDefault(); Recover.verify($('recCode').value); });
$('recStep3').addEventListener('submit', e => { e.preventDefault(); Recover.save($('recNewPass').value, $('recNewPass2').value); });
$('recResend').addEventListener('click', () => Recover.data.email ? Recover.send(Recover.data.email) : Recover.step(1));

const Profile = {
  open() {
    const isAdmin = Admin.isAdmin();
    const s = Auth.session();
    if (!isAdmin && !s) { switchAuthTab('login'); UI.mo(D.loginM, 1); return; }

    const name = isAdmin ? Admin.name() : s.name;
    const email = isAdmin ? '(admin)' : s.email;

    $('profileAvatar').textContent = (name || '?').charAt(0).toUpperCase();
    $('profileName').textContent = name || 'Usuario';
    $('profileEmail').textContent = email || '—';

    const orders = LS.get('aem_orders');
    $('statOrders').textContent = orders.length;
    $('statCart').textContent = St.cart.reduce((sum, i) => sum + i.quantity, 0);
    $('statSince').textContent = isAdmin ? 'ADMIN' : (s.createdAt ? new Date(s.createdAt).toLocaleDateString('es-VE', { month: 'short', year: '2-digit' }) : '—');

    UI.mo($('profileModal'), 1);
  },
  close() { UI.mo($('profileModal'), 0); },

  edit() {
    if (Admin.isAdmin()) { UI.toast('Admin no editable aquí', 'err'); return; }
    const s = Auth.session(); if (!s) return;
    $('editName').value = s.name || '';
    UI.mo($('profileModal'), 0);
    setTimeout(() => UI.mo($('editProfileModal'), 1), 200);
  },

  save(name) {
    name = name.trim();
    if (name.length < 2) { UI.toast('Nombre muy corto', 'err'); return; }
    const s = Auth.session(); if (!s) return;
    s.name = name;
    Auth.set(s);
    const users = Auth.users();
    const u = users.find(x => x.email === s.email);
    if (u) { u.name = name; Auth.save(users); }
    UI.mo($('editProfileModal'), 0);
    updateAdminUI();
    UI.toast('✅ Nombre actualizado');
  },

  orders() {
    UI.mo($('profileModal'), 0);
    const s = Auth.session();
    let orders = LS.get('aem_orders').slice().reverse();
    if (s && !Admin.isAdmin()) {
      orders = orders.filter(o => !o.userEmail || o.userEmail === s.email);
    }
    const body = $('ordersBody');
    if (!orders.length) {
      body.innerHTML = `
        <div class="orders-empty">
          <i class="fas fa-receipt"></i>
          <h3>Aún no tienes pedidos</h3>
          <p style="margin:0;font-size:.85rem">Cuando hagas uno, aparecerá aquí</p>
        </div>`;
    } else {
      body.innerHTML = orders.map(o => {
        const date = new Date(o.date);
        const fecha = date.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
        const items = (o.items || []).map(i =>
          `<div class="order-item"><span>${esc(cap(i.title))} × ${i.quantity}</span><span>${fp(i.price * i.quantity)}</span></div>`
        ).join('');
        const tot = (o.items || []).reduce((s, i) => s + i.price * i.quantity, 0);
        return `<div class="order-card">
          <div class="order-card-header">
            <b>Pedido #${String(o.id).slice(-6)}</b>
            <small>${fecha}</small>
          </div>
          ${items}
          <div class="order-total"><span>Total</span><strong>${fp(tot)}</strong></div>
        </div>`;
      }).join('');
    }
    setTimeout(() => UI.mo($('ordersModal'), 1), 200);
  },

  logout() {
    UI.ask('¿Cerrar sesión?', () => {
      sessionStorage.removeItem('aem_session');
      Admin.logout();
      UI.mo($('profileModal'), 0);
      updateAdminUI();
      updateUserButton();
      UI.toast('Sesión cerrada');
    });
  }
};

$('closeProfileBtn').addEventListener('click', () => Profile.close());
$('profileModal').addEventListener('click', e => { if (e.target === $('profileModal')) Profile.close(); });
$('editProfileBtn').addEventListener('click', () => Profile.edit());
$('logoutBtn').addEventListener('click', () => Profile.logout());
$('viewOrdersBtn').addEventListener('click', () => Profile.orders());

$('closeEditProfileBtn').addEventListener('click', () => UI.mo($('editProfileModal'), 0));
$('cancelEditProfileBtn').addEventListener('click', () => UI.mo($('editProfileModal'), 0));
$('editProfileModal').addEventListener('click', e => { if (e.target === $('editProfileModal')) UI.mo($('editProfileModal'), 0); });
$('editProfileForm').addEventListener('submit', e => {
  e.preventDefault();
  Profile.save($('editName').value);
});

$('closeOrdersBtn').addEventListener('click', () => UI.mo($('ordersModal'), 0));
$('ordersModal').addEventListener('click', e => { if (e.target === $('ordersModal')) UI.mo($('ordersModal'), 0); });

const openMenu  = () => { D.nav.classList.add('open'); D.navOv.classList.add('on'); D.nav.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; };
const closeMenu = () => { D.nav.classList.remove('open'); D.navOv.classList.remove('on'); D.nav.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };

D.menu.addEventListener('click', openMenu);
$('closeMenu').addEventListener('click', closeMenu);
D.navOv.addEventListener('click', closeMenu);

$$('.hs > .st').forEach(t => t.addEventListener('click', () => t.closest('.hs').classList.toggle('open')));

$$('#nav .sub a').forEach(a => {
  a.addEventListener('click', () => {
    const tag = a.dataset.tag; if (!tag) return;
    St.cat = 'all'; St.tag = tag;
    $$('.f').forEach(b => b.classList.remove('on'));
    const btn = document.querySelector(`.f[data-tag="${tag}"]`);
    if (btn) btn.classList.add('on');
    render();
    closeMenu();
  });
});

$('cartBtnM').addEventListener('click', () => { closeMenu(); setTimeout(openCart, 200); });

$$('#nav .dr-menu a[href^="#"]').forEach(a => a.addEventListener('click', () => setTimeout(closeMenu, 150)));

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeCart(); closeMenu(); closeUserDrop();
    [D.modal, D.confirm, D.cropM, D.loginM, D.recoverM, D.detailM,
     $('waModal'), $('profileModal'), $('editProfileModal'), $('ordersModal'),
     $('favModal'), $('reviewModal')]
      .forEach(m => UI.mo(m, 0));
  }
});

$('closeDetailModal').addEventListener('click', () => Detail.close());
D.detailM.addEventListener('click', e => { if (e.target === D.detailM) Detail.close(); });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();