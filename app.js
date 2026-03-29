/* ══════════════════════════════════════════════════════
   SUR — Fusión Latinoamericana | app.js
   ══════════════════════════════════════════════════════ */

/* ── CONFIG ── */
const CONFIG = {
  restaurantName: "SUR Fusión Latinoamericana",
  whatsappNumber: "573046164560",
  currency: "$",
  branches: [
    { id: 1, name: "Sede Principal", desc: "Armenia, Quindío", icon: "🏪" }
  ],
  deliveryZones: [
    { id: 1, name: "Zona Centro",    cost: 3000 },
    { id: 2, name: "Zona Norte",     cost: 4000 },
    { id: 3, name: "Zona Sur",       cost: 4000 },
    { id: 4, name: "Zona Occidente", cost: 5000 }
  ]
};

/* ── ESTADO ── */
let menuData  = [];
let cart      = [];
let activeCat = null;
let VIEW_MODE = false;

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initCursor();
  initScrollWatcher();
  applyViewMode();
  loadMenu();
  loadCartFromStorage();
  initCartEvents();
  initScrollAnimations();
});

/* ══════════════════════════════════════════════════════
   LOADER / SPLASH
══════════════════════════════════════════════════════ */
function initLoader() {
  const loader = document.getElementById('loader');
  const fill   = document.getElementById('loaderProgress');

  let prog = 0;
  const tick = setInterval(() => {
    prog = Math.min(prog + 1.4 + Math.random() * 1.2, 100);
    fill.style.width = prog + '%';
    if (prog >= 100) { clearInterval(tick); setTimeout(hideLoader, 280); }
  }, 35);

  setTimeout(hideLoader, 3000);

  function hideLoader() {
    loader.classList.add('exit');
    setTimeout(() => { loader.style.display = 'none'; }, 700);
  }
}

/* ══════════════════════════════════════════════════════
   CURSOR
══════════════════════════════════════════════════════ */
function initCursor() {
  const cursor   = document.getElementById('cursor');
  const follower = document.getElementById('cursorFollower');
  if (!cursor || !follower) return;

  let mx = 0, my = 0, fx = 0, fy = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  const hoverEls = 'a, button, .sidebar-cat-item, .accord-header, .radio-option';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(hoverEls)) document.body.classList.add('cursor-hover');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(hoverEls)) document.body.classList.remove('cursor-hover');
  });

  (function animFollower() {
    fx += (mx - fx) * 0.12;
    fy += (my - fy) * 0.12;
    follower.style.left = fx + 'px';
    follower.style.top  = fy + 'px';
    requestAnimationFrame(animFollower);
  })();
}

/* ══════════════════════════════════════════════════════
   SCROLL WATCHER
══════════════════════════════════════════════════════ */
function initScrollWatcher() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });
}

/* ══════════════════════════════════════════════════════
   VIEW MODE (QR Mesa)
══════════════════════════════════════════════════════ */
function applyViewMode() {
  const params = new URLSearchParams(window.location.search);
  const mesa   = params.get('mesa');
  const modo   = params.get('modo');

  if (mesa || modo === 'vista') {
    VIEW_MODE = true;
    const badge = document.getElementById('mesaBadge');
    if (mesa && badge) {
      badge.textContent = `Mesa ${mesa}`;
      badge.classList.remove('hidden');
    }
    document.getElementById('floatingCart')?.classList.add('hidden');
    document.getElementById('navCartBtn')?.classList.add('hidden');
  }
}

/* ══════════════════════════════════════════════════════
   LOAD MENU
══════════════════════════════════════════════════════ */
async function loadMenu() {
  try {
    const res = await fetch('menu.json');
    menuData  = await res.json();
    if (menuData.length) {
      activeCat = menuData[0].id;
      renderAll();
    }
  } catch (e) {
    console.error('Error cargando menu.json', e);
  }
}

/* ══════════════════════════════════════════════════════
   RENDER ALL
══════════════════════════════════════════════════════ */
function renderAll() {
  renderHeroBadges();
  renderSidebarCategories();
  renderProducts(activeCat);
  initSidebar();
  initScrollAnimations();
}

/* ── Hero Badges ── */
function renderHeroBadges() {
  const wrap = document.getElementById('heroBadgesSection');
  if (!wrap) return;
  wrap.innerHTML = menuData.map(cat => `
    <div class="hero-badge" onclick="switchCategory(${cat.id}, true)">${cat.name}</div>
  `).join('');
}

/* ══════════════════════════════════════════════════════
   SIDEBAR — Categorías
══════════════════════════════════════════════════════ */
function renderSidebarCategories() {
  const list = document.getElementById('sidebarCats');
  if (!list) return;
  list.innerHTML = menuData.map(cat => `
    <li class="sidebar-cat-item ${cat.id === activeCat ? 'active' : ''}"
        role="listitem"
        onclick="switchCategory(${cat.id})">
      <span class="sidebar-cat-icon" aria-hidden="true">${cat.icon}</span>
      <span class="sidebar-cat-name">${cat.name}</span>
      <span class="sidebar-cat-count">${cat.products.length}</span>
    </li>
  `).join('');
}

/* ══════════════════════════════════════════════════════
   SIDEBAR — Lógica abrir/cerrar
══════════════════════════════════════════════════════ */
function initSidebar() {
  const tab     = document.getElementById('sidebarTab');
  const sidebar = document.getElementById('menuSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const menuApp = document.getElementById('menuApp');
  if (!tab || !sidebar || !overlay) return;

  tab.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('open', isOpen);
    tab.classList.toggle('sidebar-open', isOpen);
    tab.setAttribute('aria-expanded', isOpen);
    if (navigator.vibrate) navigator.vibrate(15);
  });

  overlay.addEventListener('click', closeSidebar);

  // Mostrar el botón sólo en móvil y cuando #menuApp está en pantalla
  if (menuApp) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const isMobile = window.innerWidth <= 900;
        tab.style.display = (entry.isIntersecting && isMobile) ? 'flex' : 'none';
        if (!entry.isIntersecting) closeSidebar();
      });
    }, { threshold: 0.05 });
    observer.observe(menuApp);

    // Re-evaluar al cambiar tamaño de ventana
    window.addEventListener('resize', () => {
      const isMobile = window.innerWidth <= 900;
      if (!isMobile) {
        tab.style.display = 'none';
        closeSidebar();
      }
    }, { passive: true });
  }
}

function closeSidebar() {
  document.getElementById('menuSidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('open');
  const tab = document.getElementById('sidebarTab');
  if (tab) {
    tab.classList.remove('sidebar-open');
    tab.setAttribute('aria-expanded', 'false');
  }
}

/* ══════════════════════════════════════════════════════
   SWITCH CATEGORY
══════════════════════════════════════════════════════ */
function switchCategory(catId, scrollToMenu = false) {
  activeCat = catId;

  // Actualizar items activos en sidebar
  document.querySelectorAll('.sidebar-cat-item').forEach((el, i) => {
    el.classList.toggle('active', menuData[i]?.id === catId);
  });

  renderProducts(catId);

  // En móvil: cerrar sidebar al seleccionar
  if (window.innerWidth <= 900) {
    closeSidebar();
  }

  // Scroll al panel de productos
  if (scrollToMenu) {
    document.getElementById('menuApp')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ══════════════════════════════════════════════════════
   PRODUCTOS — Renderizado tipo acordeón
══════════════════════════════════════════════════════ */
function renderProducts(catId) {
  const cat = menuData.find(c => c.id === catId);
  if (!cat) return;

  // Actualizar encabezado de contenido
  const titleEl = document.getElementById('contentCatTitle');
  const subEl   = document.getElementById('contentCatSub');
  if (titleEl) titleEl.innerHTML = `<span aria-hidden="true">${cat.icon}</span> ${cat.name}`;
  if (subEl)   subEl.textContent = `${cat.products.length} platillo${cat.products.length !== 1 ? 's' : ''}`;

  // Renderizar acordeón
  const list = document.getElementById('accordionList');
  if (!list) return;

  list.innerHTML = cat.products.map(p => {
    const agotado = p.agotado === true;
    const desc    = p.description || '';

    const actionBlock = VIEW_MODE
      ? ''
      : agotado
        ? `<span class="accord-agotado">Agotado</span>`
        : p.price === 0
          ? `<span class="accord-agotado">Pregúntanos el precio</span>`
          : `<button class="accord-add-btn"
              onclick="quickAddToCart('${p.id}'); event.stopPropagation();"
              aria-label="Agregar ${p.name} al carrito">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
             Agregar
           </button>`;

    return `
      <div class="accord-card ${agotado ? 'agotado' : ''}" id="accord-${p.id}" role="listitem">
        <div class="accord-header" onclick="toggleAccordion('${p.id}')" role="button" tabindex="0"
             aria-expanded="false" aria-controls="body-${p.id}">
          <span class="accord-icon" aria-hidden="true">${p.icon}</span>
          <div class="accord-info">
            <div class="accord-name">${p.name}</div>
          </div>
          <span class="accord-price">${p.price === 0 ? 'Pregúntanos' : CONFIG.currency + p.price.toLocaleString('es-CO')}</span>
          <svg class="accord-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="accord-body" id="body-${p.id}" aria-hidden="true">
          <div class="accord-body-inner">
            <p class="accord-desc" id="desc-${p.id}">${desc}</p>
            <button class="accord-see-more" id="more-${p.id}"
                    onclick="toggleAccordDesc('${p.id}'); event.stopPropagation();"
                    aria-label="Ver descripción completa">Ver más</button>
            ${!VIEW_MODE ? `<div class="accord-footer">${actionBlock}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Tecla Enter en encabezados de acordeón
  list.querySelectorAll('.accord-header').forEach(header => {
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        header.click();
      }
    });
  });
}

/* ══════════════════════════════════════════════════════
   ACORDEÓN — Toggle producto
══════════════════════════════════════════════════════ */
function toggleAccordion(productId) {
  const card   = document.getElementById(`accord-${productId}`);
  const body   = document.getElementById(`body-${productId}`);
  const header = card?.querySelector('.accord-header');
  if (!card || !body) return;

  const isOpen = card.classList.contains('open');

  // Cerrar todos los demás
  document.querySelectorAll('.accord-card.open').forEach(c => {
    if (c.id !== `accord-${productId}`) {
      c.classList.remove('open');
      const b = c.querySelector('.accord-body');
      const h = c.querySelector('.accord-header');
      if (b) { b.style.maxHeight = '0'; b.setAttribute('aria-hidden', 'true'); }
      if (h)   h.setAttribute('aria-expanded', 'false');
    }
  });

  if (!isOpen) {
    card.classList.add('open');
    header?.setAttribute('aria-expanded', 'true');
    body.setAttribute('aria-hidden', 'false');

    // Abrir con altura grande para poder medir
    body.style.maxHeight = '2000px';

    if (navigator.vibrate) navigator.vibrate(8);

    // Medir descripción en primer frame
    requestAnimationFrame(() => {
      const descEl  = document.getElementById(`desc-${productId}`);
      const moreBtn = document.getElementById(`more-${productId}`);

      if (descEl && moreBtn && !descEl.dataset.checked) {
        descEl.dataset.checked = '1';
        const lh      = parseFloat(getComputedStyle(descEl).lineHeight) || 21;
        const maxLH   = lh * 3 + 4;

        if (descEl.scrollHeight > maxLH) {
          descEl.classList.add('clamped');
          moreBtn.classList.add('visible');
        }
      }

      // Segundo frame: ajustar altura real tras posible clampeo
      requestAnimationFrame(() => {
        body.style.maxHeight = body.scrollHeight + 'px';
      });
    });

  } else {
    card.classList.remove('open');
    header?.setAttribute('aria-expanded', 'false');
    body.style.maxHeight = '0';
    body.setAttribute('aria-hidden', 'true');
  }
}

/* ══════════════════════════════════════════════════════
   ACORDEÓN — Ver más / Ver menos descripción
══════════════════════════════════════════════════════ */
function toggleAccordDesc(productId) {
  const descEl  = document.getElementById(`desc-${productId}`);
  const moreBtn = document.getElementById(`more-${productId}`);
  const body    = document.getElementById(`body-${productId}`);
  if (!descEl || !moreBtn) return;

  const isClamped = descEl.classList.contains('clamped');
  if (isClamped) {
    descEl.classList.remove('clamped');
    moreBtn.textContent = 'Ver menos';
  } else {
    descEl.classList.add('clamped');
    moreBtn.textContent = 'Ver más';
  }

  // Recalcular altura del body
  if (body) {
    body.style.maxHeight = 'none';
    const h = body.scrollHeight;
    body.style.maxHeight = h + 'px';
  }
}

/* ══════════════════════════════════════════════════════
   CARRITO
══════════════════════════════════════════════════════ */
function getProduct(productId) {
  for (const cat of menuData) {
    const p = cat.products.find(p => p.id === productId);
    if (p) return p;
  }
  return null;
}

function loadCartFromStorage() {
  try { cart = JSON.parse(localStorage.getItem('sur_cart') || '[]'); } catch { cart = []; }
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('sur_cart', JSON.stringify(cart));
}

function quickAddToCart(productId) {
  const p = getProduct(productId);
  if (!p || p.agotado) return;

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id: productId, qty: 1 });
  }
  saveCart();
  updateCartUI();
  showToast(`${p.icon} ${p.name} agregado`, 'success');
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== productId);
  saveCart();
  updateCartUI();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  updateCartUI();
}

function updateCartUI() {
  const total   = cart.reduce((sum, i) => { const p = getProduct(i.id); return sum + (p ? p.price * i.qty : 0); }, 0);
  const count   = cart.reduce((sum, i) => sum + i.qty, 0);
  const isEmpty = cart.length === 0;

  // Badges
  const countStr = count.toString();
  ['navCartBadge', 'cartBadge'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = countStr;
    el.classList.toggle('hidden', count === 0);
  });

  // Cart count & total
  const cartCountEl = document.getElementById('cartCount');
  if (cartCountEl) cartCountEl.textContent = `${count} ${count === 1 ? 'producto' : 'productos'}`;
  const cartTotalEl = document.getElementById('cartTotal');
  if (cartTotalEl) cartTotalEl.textContent = `${CONFIG.currency}${total.toLocaleString('es-CO')}`;

  // Empty / items
  const cartEmptyEl  = document.getElementById('cartEmpty');
  const cartFooterEl = document.getElementById('cartFooter');
  if (cartEmptyEl)  cartEmptyEl.style.display  = isEmpty ? 'flex' : 'none';
  if (cartFooterEl) cartFooterEl.classList.toggle('hidden', isEmpty);

  // Cart body
  const cartBody = document.getElementById('cartBody');
  if (cartBody) {
    const itemsHTML = cart.map(i => {
      const p = getProduct(i.id);
      if (!p) return '';
      const subtotal = p.price * i.qty;
      return `
        <div class="cart-item">
          <span class="cart-item-icon">${p.icon}</span>
          <div class="cart-item-info">
            <div class="cart-item-name">${p.name}</div>
            <div class="cart-item-price">${CONFIG.currency}${subtotal.toLocaleString('es-CO')}</div>
            <div class="cart-item-controls">
              <button class="qty-btn" onclick="updateQty('${p.id}',-1)">−</button>
              <span class="qty-count">${i.qty}</span>
              <button class="qty-btn" onclick="updateQty('${p.id}',1)">+</button>
            </div>
          </div>
          <button class="cart-item-remove" onclick="removeFromCart('${p.id}')" aria-label="Eliminar">×</button>
        </div>
      `;
    }).join('');

    const emptyEl = document.getElementById('cartEmpty');
    cartBody.innerHTML = (isEmpty ? '' : itemsHTML);
    if (isEmpty && emptyEl) cartBody.appendChild(emptyEl);
    else if (!isEmpty && emptyEl) cartBody.insertAdjacentElement('afterbegin', emptyEl);
  }
}

/* ══════════════════════════════════════════════════════
   EVENTS (Carrito & Modal)
══════════════════════════════════════════════════════ */
function initCartEvents() {
  ['floatingCart', 'navCartBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', openCart);
  });

  document.getElementById('closeCart')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  document.getElementById('checkoutBtn')?.addEventListener('click', openCheckout);

  // Hero "Hacer un Pedido" → abrir carrito directamente
  document.getElementById('heroCartBtn')?.addEventListener('click', () => {
    openCart();
  });

  document.getElementById('closeModal')?.addEventListener('click', closeModal);
  document.getElementById('modalOverlay')?.addEventListener('click', closeModal);
  document.getElementById('checkoutForm')?.addEventListener('submit', handleCheckoutSubmit);
}

function openCart() {
  document.getElementById('cartPanel')?.classList.add('open');
  document.getElementById('cartOverlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartPanel')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function openCheckout() {
  if (cart.length === 0) { showToast('Tu carrito está vacío', 'warning'); return; }
  closeCart();
  renderCheckoutModal();
  document.getElementById('checkoutModal')?.classList.add('open');
  document.getElementById('modalOverlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('checkoutModal')?.classList.remove('open');
  document.getElementById('modalOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════════════════
   CHECKOUT MODAL RENDER
══════════════════════════════════════════════════════ */
function renderCheckoutModal() {
  const summary = document.getElementById('orderSummary');
  if (summary) {
    summary.innerHTML = cart.map(i => {
      const p = getProduct(i.id);
      if (!p) return '';
      return `<div class="order-summary-item">
        <span>${p.icon} ${p.name} × ${i.qty}</span>
        <span>${CONFIG.currency}${(p.price * i.qty).toLocaleString('es-CO')}</span>
      </div>`;
    }).join('');
  }

  const branchSel = document.getElementById('branchSelector');
  if (branchSel) {
    branchSel.innerHTML = CONFIG.branches.map((b, i) => `
      <label class="radio-option">
        <input type="radio" name="branch" value="${b.id}" ${i === 0 ? 'checked' : ''} />
        <span>${b.icon} ${b.name} — ${b.desc}</span>
      </label>
    `).join('');
  }

  const zones = document.getElementById('deliveryZones');
  if (zones) {
    zones.innerHTML = CONFIG.deliveryZones.map((z, i) => `
      <label class="radio-option">
        <input type="radio" name="deliveryZone" value="${z.id}" ${i === 0 ? 'checked' : ''}
               onchange="updateModalTotal()" />
        <span>${z.name}</span>
      </label>
    `).join('');
  }

  updateModalTotal();
}

function updateModalTotal() {
  const subtotal = cart.reduce((sum, i) => { const p = getProduct(i.id); return sum + (p ? p.price * i.qty : 0); }, 0);
  const zoneId   = parseInt(document.querySelector('input[name="deliveryZone"]:checked')?.value || 1);
  const zone     = CONFIG.deliveryZones.find(z => z.id === zoneId);
  const delivery = zone ? zone.cost : 0;
  const total    = subtotal + delivery;

  const fmt = n => `${CONFIG.currency}${n.toLocaleString('es-CO')}`;
  const el  = id => document.getElementById(id);
  if (el('modalSubtotal')) el('modalSubtotal').textContent = fmt(subtotal);
  if (el('modalDelivery')) el('modalDelivery').textContent = fmt(delivery);
  if (el('modalTotal'))    el('modalTotal').textContent    = fmt(total);
}

/* ══════════════════════════════════════════════════════
   CHECKOUT SUBMIT → WHATSAPP
══════════════════════════════════════════════════════ */
function handleCheckoutSubmit(e) {
  e.preventDefault();

  const name    = document.getElementById('customerName');
  const phone   = document.getElementById('customerPhone');
  const address = document.getElementById('customerAddress');

  let valid = true;
  [name, phone, address].forEach(el => {
    if (!el?.value.trim()) { el?.classList.add('error'); valid = false; }
    else el?.classList.remove('error');
  });
  if (!valid) { showToast('Completa los campos requeridos', 'error'); return; }

  const notes   = document.getElementById('orderNotes')?.value.trim() || '';
  const branch  = document.querySelector('input[name="branch"]:checked');
  const zone    = document.querySelector('input[name="deliveryZone"]:checked');
  const payment = document.querySelector('input[name="payMethod"]:checked');

  const branchObj = CONFIG.branches.find(b => b.id === parseInt(branch?.value));
  const zoneObj   = CONFIG.deliveryZones.find(z => z.id === parseInt(zone?.value));

  const subtotal  = cart.reduce((sum, i) => { const p = getProduct(i.id); return sum + (p ? p.price * i.qty : 0); }, 0);
  const delivery  = zoneObj ? zoneObj.cost : 0;
  const total     = subtotal + delivery;

  const msg = buildMessage({ name, phone, address, notes, branchObj, zoneObj, payment, subtotal, delivery, total });

  window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');

  cart = [];
  saveCart();
  updateCartUI();
  closeModal();
  showToast('¡Pedido enviado! Revisa WhatsApp 🎉', 'success');
}

function buildMessage({ name, phone, address, notes, branchObj, zoneObj, payment, subtotal, delivery, total }) {
  const fmt = n => `$${n.toLocaleString('es-CO')}`;
  const lines = [
    `🐓 *PEDIDO — ${CONFIG.restaurantName}*`,
    `━━━━━━━━━━━━━━━━━━━`,
    `👤 *Cliente:* ${name.value.trim()}`,
    `📱 *Teléfono:* ${phone.value.trim()}`,
    `📍 *Dirección:* ${address.value.trim()}`,
    branchObj ? `🏪 *Sede:* ${branchObj.name}` : '',
    ``,
    `🛒 *PRODUCTOS:*`,
    ...cart.map(i => {
      const p = getProduct(i.id);
      return p ? `• ${p.name} × ${i.qty} — ${fmt(p.price * i.qty)}` : '';
    }),
    ``,
    `🛵 *Zona de entrega:* ${zoneObj?.name || ''} — ${fmt(delivery)}`,
    `💳 *Pago:* ${payment?.value || ''}`,
    notes ? `📝 *Notas:* ${notes}` : '',
    ``,
    `━━━━━━━━━━━━━━━━━━━`,
    `Subtotal: ${fmt(subtotal)}`,
    `Domicilio: ${fmt(delivery)}`,
    `*TOTAL: ${fmt(total)}*`,
    `━━━━━━━━━━━━━━━━━━━`,
  ];
  return lines.filter(l => l !== null).join('\n');
}

/* ══════════════════════════════════════════════════════
   TOASTS
══════════════════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 320);
  }, 3000);
}

/* ══════════════════════════════════════════════════════
   SCROLL ANIMATIONS (data-aos)
══════════════════════════════════════════════════════ */
function initScrollAnimations() {
  const els = document.querySelectorAll('[data-aos]:not(.visible)');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.aosDelay || 0);
        setTimeout(() => entry.target.classList.add('visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => observer.observe(el));
}
