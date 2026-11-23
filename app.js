/* ==========================================================================
   FindIt — Complete Frontend Application (Website + Android PWA)
   Phase 1: Local Demo Edition
   ========================================================================== */

import {
  APP_CONFIG,
  CATEGORIES,
  dbApi,
  compressImageFile,
  makePlaceholderPhoto
} from './db.js';

const state = {
  currentUser: null,
  savedIds: new Set(),
  deferredInstallPrompt: null,
  isOnline: navigator.onLine,
  theme: localStorage.getItem('findit-theme') || 'light',
  browseFilters: {
    query: '',
    type: 'all',
    category: 'all',
    status: 'all',
    sort: 'newest'
  },
  dashboardTab: 'my-reports',
  draftPhotos: []
};

/* ---------- Utilities ---------- */

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initials(name) {
  return String(name || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase();
}

function fmtDate(isoOrYmd) {
  if (!isoOrYmd) return 'Unknown date';
  const d = new Date(isoOrYmd);
  if (Number.isNaN(d.getTime())) return isoOrYmd;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showToast(message, type = 'ok') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function openModal(title, bodyHtml) {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
        <h3 style="margin:0;">${esc(title)}</h3>
        <button type="button" class="icon-btn" id="close-modal-btn" aria-label="Close">✕</button>
      </div>
      <div>${bodyHtml}</div>
    </div>
  `;
  root.classList.add('open');
  root.setAttribute('aria-hidden', 'false');

  root.querySelector('#close-modal-btn')?.addEventListener('click', closeModal);
  root.onclick = (e) => {
    if (e.target === root) closeModal();
  };
}

function closeModal() {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.classList.remove('open');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '';
}

function applyTheme(theme) {
  state.theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('findit-theme', state.theme);
}

function parseRoute() {
  const rawHash = window.location.hash || '#/';
  const cleaned = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
  const [pathPart, queryPart] = cleaned.split('?');
  const path = pathPart || '/';
  const params = new URLSearchParams(queryPart || '');
  return { path, params };
}

function navigate(hash) {
  window.location.hash = hash;
}

/* ---------- Shell Rendering (Header, Status Bar, Footer, Mobile Nav) ---------- */

function renderShell(activePath) {
  const user = state.currentUser;
  const header = document.getElementById('site-header');
  const statusBar = document.getElementById('status-bar');
  const footer = document.getElementById('site-footer');
  const mobileNav = document.getElementById('mobile-nav');

  header.innerHTML = `
    <div class="container header-inner">
      <a href="#/" class="brand">
        <img src="./icon.svg" alt="FindIt Logo" />
        <span>
          ${esc(APP_CONFIG.APP_NAME)}
          <small class="hide-sm">${esc(APP_CONFIG.TAGLINE)}</small>
        </span>
      </a>

      <nav class="desktop-nav" aria-label="Desktop Navigation">
        <a href="#/" class="nav-link ${activePath === '/' ? 'active' : ''}">Home</a>
        <a href="#/browse" class="nav-link ${activePath.startsWith('/browse') ? 'active' : ''}">Browse Listings</a>
        <a href="#/report" class="nav-link ${activePath.startsWith('/report') ? 'active' : ''}">+ Report Item</a>
        <a href="#/dashboard" class="nav-link ${activePath.startsWith('/dashboard') ? 'active' : ''}">Dashboard</a>
      </nav>

      <div class="header-actions">
        ${state.deferredInstallPrompt ? `<button type="button" id="install-pwa-btn" class="btn btn-primary btn-sm">Install App</button>` : ''}
        <button type="button" id="theme-toggle-btn" class="icon-btn" title="Toggle Dark/Light Theme" aria-label="Toggle Theme">
          ${state.theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button type="button" id="profile-switch-btn" class="user-btn" title="Switch Demo Profile">
          <span class="avatar">${esc(initials(user?.name))}</span>
          <span class="hide-sm">${esc((user?.name || 'Demo').split(' ')[0])}</span>
        </button>
      </div>
    </div>
  `;

  statusBar.innerHTML = `
    <div class="status-inner">
      <div>
        <span class="dot ${state.isOnline ? 'online' : 'offline'}"></span>
        <strong>${state.isOnline ? 'Online' : 'Offline Mode'}</strong> ·
        <span>Phase 1 Local Demo (IndexedDB) — Sample items are labeled</span>
      </div>
      <div>
        <a href="#/dashboard?tab=settings">Demo Settings &amp; Reset</a>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="#/" class="brand" style="margin-bottom:8px;">
            <img src="./icon.svg" alt="FindIt Logo" />
            <span>${esc(APP_CONFIG.APP_NAME)}</span>
          </a>
          <p style="margin:6px 0 0;font-size:0.88rem;color:var(--muted);">
            ${esc(APP_CONFIG.TAGLINE)} A community Lost &amp; Found website and installable Android PWA built with offline-first IndexedDB storage.
          </p>
        </div>
        <div>
          <h4 style="margin:0 0 8px;">Explore</h4>
          <ul class="footer-links">
            <li><a href="#/">Home</a></li>
            <li><a href="#/browse?type=lost">Lost Items</a></li>
            <li><a href="#/browse?type=found">Found Items</a></li>
            <li><a href="#/report">Report an Item</a></li>
          </ul>
        </div>
        <div>
          <h4 style="margin:0 0 8px;">Account &amp; Storage</h4>
          <ul class="footer-links">
            <li><a href="#/dashboard">User Dashboard</a></li>
            <li><a href="#/dashboard?tab=saved">Saved Listings</a></li>
            <li><a href="#/dashboard?tab=settings">Reset Demo Data</a></li>
            <li><span style="color:var(--soft);">Mode: ${esc(APP_CONFIG.STORAGE_MODE)} (Supabase Ready)</span></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} FindIt — Phase 1 Local Demo Edition</span>
        <span>Works offline on Android Chrome &amp; Desktop</span>
      </div>
    </div>
  `;

  mobileNav.innerHTML = `
    <a href="#/" class="m-nav-link ${activePath === '/' ? 'active' : ''}">
      <span>🏠</span>Home
    </a>
    <a href="#/browse" class="m-nav-link ${activePath.startsWith('/browse') ? 'active' : ''}">
      <span>🔍</span>Browse
    </a>
    <a href="#/report" class="m-nav-link plus ${activePath.startsWith('/report') ? 'active' : ''}">
      <span>＋</span>Report
    </a>
    <a href="#/dashboard?tab=saved" class="m-nav-link ${activePath === '/dashboard' && state.dashboardTab === 'saved' ? 'active' : ''}">
      <span>♥</span>Saved
    </a>
    <a href="#/dashboard?tab=my-reports" class="m-nav-link ${activePath === '/dashboard' && state.dashboardTab !== 'saved' ? 'active' : ''}">
      <span>👤</span>Profile
    </a>
  `;

  header.querySelector('#theme-toggle-btn')?.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    renderShell(activePath);
  });

  header.querySelector('#profile-switch-btn')?.addEventListener('click', openProfileModal);

  header.querySelector('#install-pwa-btn')?.addEventListener('click', async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    const res = await state.deferredInstallPrompt.userChoice;
    if (res.outcome === 'accepted') {
      showToast('FindIt is installing on your device!', 'ok');
    }
    state.deferredInstallPrompt = null;
    renderShell(activePath);
  });
}

async function openProfileModal() {
  const users = await dbApi.listUsers();
  const currentId = state.currentUser?.id;

  const listHtml = users
    .map(
      (u) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;">
        <div>
          <strong>${esc(u.name)}</strong> ${u.isSample ? '<span class="badge badge-sample">Sample</span>' : ''}
          <div style="font-size:0.8rem;color:var(--soft);">${esc(u.city)} · ${esc(u.email)}</div>
        </div>
        ${
          u.id === currentId
            ? '<span class="badge badge-found">Active</span>'
            : `<button type="button" class="btn btn-secondary btn-sm switch-user-btn" data-uid="${esc(u.id)}">Switch</button>`
        }
      </div>
    `
    )
    .join('');

  openModal(
    'Demo Profiles (Local Only)',
    `
      <p style="margin-top:0;font-size:0.88rem;color:var(--muted);">
        Switch between local demo accounts to test reporting, claiming, and approving items without a server.
      </p>
      ${listHtml}
      <hr style="border:none;border-top:1px solid var(--border);margin:14px 0;" />
      <h4 style="margin:0 0 10px;">Create New Local Profile</h4>
      <form id="create-user-form">
        <div class="field">
          <label for="new-u-name">Full Name *</label>
          <input id="new-u-name" class="input" required placeholder="e.g. Meera Patel" />
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="new-u-city">City</label>
            <input id="new-u-city" class="input" placeholder="e.g. Pune" />
          </div>
          <div class="field">
            <label for="new-u-phone">Phone / Contact</label>
            <input id="new-u-phone" class="input" placeholder="+91 ..." />
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Create &amp; Switch Profile</button>
      </form>
    `
  );

  document.querySelectorAll('.switch-user-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.currentUser = await dbApi.switchUser(btn.dataset.uid);
      await refreshSavedIds();
      closeModal();
      showToast(`Switched to ${state.currentUser.name}`, 'ok');
      renderCurrentRoute();
    });
  });

  document.getElementById('create-user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-u-name').value.trim();
    const city = document.getElementById('new-u-city').value.trim();
    const phone = document.getElementById('new-u-phone').value.trim();
    if (!name) return;
    state.currentUser = await dbApi.createUser({ name, city, phone });
    await refreshSavedIds();
    closeModal();
    showToast(`Profile "${state.currentUser.name}" created!`, 'ok');
    renderCurrentRoute();
  });
}

/* ---------- Reusable Item Card Component ---------- */

function statusBadgeHtml(status) {
  if (status === 'recovered') return '<span class="badge badge-recovered">Recovered</span>';
  if (status === 'claimed') return '<span class="badge badge-claimed">Claimed</span>';
  return '<span class="badge badge-open">Open</span>';
}

function renderItemCard(item) {
  const photoUrl =
    item.photos && item.photos.length
      ? item.photos[0].dataUrl
      : makePlaceholderPhoto(item.title, `${item.category} • ${item.location}`);
  const isSaved = state.savedIds.has(item.id);

  return `
    <article class="item-card">
      <div class="item-media" data-open-item="${esc(item.id)}">
        <img src="${photoUrl}" alt="${esc(item.title)}" loading="lazy" />
        <div class="item-badges">
          <span class="badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}">${esc(item.type)}</span>
          ${statusBadgeHtml(item.status)}
          ${item.isSample ? '<span class="badge badge-sample">Sample</span>' : ''}
        </div>
        <button type="button" class="save-btn ${isSaved ? 'saved' : ''}" data-save-id="${esc(item.id)}" aria-label="${isSaved ? 'Remove from saved' : 'Save listing'}">
          ${isSaved ? '♥' : '♡'}
        </button>
      </div>

      <div class="item-body">
        <h3 class="item-title">
          <a href="#/item/${esc(item.id)}">${esc(item.title)}</a>
        </h3>
        <p class="item-desc">${esc(item.description)}</p>
        <div class="item-meta">
          <span>📍 ${esc(item.location)}</span>
          <span>🏷️ ${esc(item.category)} · 📅 ${esc(fmtDate(item.eventDate))}</span>
        </div>
        <div class="item-foot">
          <span style="font-size:0.78rem;color:var(--soft);">By ${esc(item.reporterName)}</span>
          <a href="#/item/${esc(item.id)}" class="btn btn-secondary btn-sm">Details →</a>
        </div>
      </div>
    </article>
  `;
}

function bindCardEvents(container) {
  container.querySelectorAll('[data-open-item]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-save-id]')) return;
      navigate(`#/item/${el.dataset.openItem}`);
    });
  });

  container.querySelectorAll('[data-save-id]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const reportId = btn.dataset.saveId;
      const saved = await dbApi.toggleSaved(state.currentUser.id, reportId);
      if (saved) state.savedIds.add(reportId);
      else state.savedIds.delete(reportId);
      btn.classList.toggle('saved', saved);
      btn.textContent = saved ? '♥' : '♡';
      showToast(saved ? 'Saved to your bookmarks.' : 'Removed from saved.', 'ok');
    });
  });
}

/* ---------- Page 1: Home / Landing Page ---------- */

async function renderHomePage(main) {
  const all = await dbApi.listReports();
  const lostCount = all.filter((r) => r.type === 'lost' && r.status !== 'recovered').length;
  const foundCount = all.filter((r) => r.type === 'found' && r.status !== 'recovered').length;
  const recoveredCount = all.filter((r) => r.status === 'recovered').length;
  const latest = all.slice(0, 6);

  main.innerHTML = `
    <section class="hero">
      <div class="container hero-grid">
        <div>
          <span class="badge" style="background:rgba(255,255,255,0.18);color:#fff;">Phase 1 · Offline-Ready Local Edition</span>
          <h1>Lost Something?<br/>Let's Find It.</h1>
          <p>Post lost belongings, report found items with photos from your Android phone, verify ownership claims, and track recoveries — even without internet.</p>

          <form id="hero-search-form" class="hero-search">
            <input id="hero-search-input" type="search" placeholder="Search headphones, wallet, keys, metro, park…" aria-label="Search listings" />
            <button type="submit" class="btn btn-primary">Search</button>
          </form>

          <div class="hero-actions">
            <a href="#/report?type=lost" class="btn hero-light">Report Lost Item</a>
            <a href="#/report?type=found" class="btn hero-outline">I Found Something</a>
          </div>
        </div>

        <div class="stats-box">
          <div class="stat-card">
            <div class="stat-num">${all.length}</div>
            <div class="stat-lbl">Total Reports</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">${lostCount}</div>
            <div class="stat-lbl">Active Lost</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">${foundCount}</div>
            <div class="stat-lbl">Active Found</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">${recoveredCount}</div>
            <div class="stat-lbl">Recovered</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2>Recent Lost &amp; Found Reports</h2>
          <a href="#/browse" class="btn btn-secondary btn-sm">View All (${all.length})</a>
        </div>
        ${
          latest.length
            ? `<div class="cards-grid">${latest.map(renderItemCard).join('')}</div>`
            : `<div class="empty"><p>No listings yet.</p><a href="#/report" class="btn btn-primary">Create First Report</a></div>`
        }
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2>How FindIt Works</h2>
        </div>
        <div class="grid-3">
          <div class="card">
            <span class="badge badge-lost">Step 1</span>
            <h3 style="margin:10px 0 6px;">Report in Seconds</h3>
            <p style="margin:0;color:var(--muted);font-size:0.9rem;">Post a lost or found item with location, date, verification hint, and photos directly from your phone camera or gallery.</p>
          </div>
          <div class="card">
            <span class="badge badge-found">Step 2</span>
            <h3 style="margin:10px 0 6px;">Verify Ownership</h3>
            <p style="margin:0;color:var(--muted);font-size:0.9rem;">Owners submit a claim with private proof details. The reporter reviews and approves or rejects claims securely.</p>
          </div>
          <div class="card">
            <span class="badge badge-recovered">Step 3</span>
            <h3 style="margin:10px 0 6px;">Mark Recovered</h3>
            <p style="margin:0;color:var(--muted);font-size:0.9rem;">Once reunited, mark the item as Recovered. Every update is tracked on the item's live status timeline.</p>
          </div>
        </div>
      </div>
    </section>
  `;

  bindCardEvents(main);

  main.querySelector('#hero-search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = main.querySelector('#hero-search-input').value.trim();
    navigate(`#/browse${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  });
}

/* ---------- Page 2: Browse & Filter Listings ---------- */

async function renderBrowsePage(main, params) {
  if (params.has('q')) state.browseFilters.query = params.get('q') || '';
  if (params.has('type')) state.browseFilters.type = params.get('type') || 'all';
  if (params.has('category')) state.browseFilters.category = params.get('category') || 'all';
  if (params.has('status')) state.browseFilters.status = params.get('status') || 'all';

  const items = await dbApi.listReports(state.browseFilters);

  main.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>Browse Lost &amp; Found</h2>
            <p style="margin:4px 0 0;color:var(--muted);font-size:0.9rem;">Showing ${items.length} matching listing${items.length === 1 ? '' : 's'}</p>
          </div>
          <a href="#/report" class="btn btn-primary btn-sm">+ Post Report</a>
        </div>

        <div class="filter-box">
          <div class="filter-grid">
            <input id="f-query" class="input" type="search" value="${esc(state.browseFilters.query)}" placeholder="Search title, location, description…" />
            <select id="f-category" class="select" aria-label="Category">
              <option value="all">All Categories</option>
              ${CATEGORIES.map((c) => `<option value="${esc(c)}" ${state.browseFilters.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            </select>
            <select id="f-status" class="select" aria-label="Status">
              <option value="all" ${state.browseFilters.status === 'all' ? 'selected' : ''}>All Statuses</option>
              <option value="open" ${state.browseFilters.status === 'open' ? 'selected' : ''}>Open</option>
              <option value="claimed" ${state.browseFilters.status === 'claimed' ? 'selected' : ''}>Claimed</option>
              <option value="recovered" ${state.browseFilters.status === 'recovered' ? 'selected' : ''}>Recovered</option>
            </select>
            <select id="f-sort" class="select" aria-label="Sort">
              <option value="newest" ${state.browseFilters.sort === 'newest' ? 'selected' : ''}>Newest First</option>
              <option value="oldest" ${state.browseFilters.sort === 'oldest' ? 'selected' : ''}>Oldest First</option>
            </select>
          </div>

          <div class="chips">
            <button type="button" class="chip ${state.browseFilters.type === 'all' ? 'active' : ''}" data-type="all">All Types</button>
            <button type="button" class="chip ${state.browseFilters.type === 'lost' ? 'active' : ''}" data-type="lost">Lost Only</button>
            <button type="button" class="chip ${state.browseFilters.type === 'found' ? 'active' : ''}" data-type="found">Found Only</button>
            <button type="button" id="reset-filters-btn" class="chip">Reset Filters</button>
          </div>
        </div>

        ${
          items.length
            ? `<div class="cards-grid">${items.map(renderItemCard).join('')}</div>`
            : `<div class="empty"><h3>No matching listings</h3><p>Try clearing filters or post a new report.</p><button type="button" id="empty-reset-btn" class="btn btn-secondary">Clear Filters</button></div>`
        }
      </div>
    </section>
  `;

  bindCardEvents(main);

  const rerender = () => renderBrowsePage(main, new URLSearchParams());

  let searchTimer = null;
  main.querySelector('#f-query')?.addEventListener('input', (e) => {
    state.browseFilters.query = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(rerender, 220);
  });

  main.querySelector('#f-category')?.addEventListener('change', (e) => {
    state.browseFilters.category = e.target.value;
    rerender();
  });

  main.querySelector('#f-status')?.addEventListener('change', (e) => {
    state.browseFilters.status = e.target.value;
    rerender();
  });

  main.querySelector('#f-sort')?.addEventListener('change', (e) => {
    state.browseFilters.sort = e.target.value;
    rerender();
  });

  main.querySelectorAll('[data-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.browseFilters.type = btn.dataset.type;
      rerender();
    });
  });

  const clearAll = () => {
    state.browseFilters = { query: '', type: 'all', category: 'all', status: 'all', sort: 'newest' };
    navigate('#/browse');
    rerender();
  };

  main.querySelector('#reset-filters-btn')?.addEventListener('click', clearAll);
  main.querySelector('#empty-reset-btn')?.addEventListener('click', clearAll);
}

/* ---------- Page 3: Item Detail & Claims ---------- */

async function renderItemDetailPage(main, itemId) {
  const item = await dbApi.getReportById(itemId);
  if (!item) {
    main.innerHTML = `
      <section class="section"><div class="container">
        <div class="empty">
          <h2>Listing Not Found</h2>
          <p>This report may have been deleted or reset.</p>
          <a href="#/browse" class="btn btn-primary">Back to Browse</a>
        </div>
      </div></section>
    `;
    return;
  }

  const photos = item.photos.length
    ? item.photos
    : [{ id: 'ph_fallback', dataUrl: makePlaceholderPhoto(item.title, item.location) }];
  const isOwner = state.currentUser && state.currentUser.id === item.userId;
  const isSaved = state.savedIds.has(item.id);

  main.innerHTML = `
    <section class="section">
      <div class="container">
        <div style="margin-bottom:14px;font-size:0.88rem;">
          <a href="#/browse">← Back to Listings</a>
        </div>

        <div class="detail-grid">
          <div>
            <div class="card" style="margin-bottom:16px;">
              <img id="main-detail-img" class="detail-img" src="${photos[0].dataUrl}" alt="${esc(item.title)}" />
              ${
                photos.length > 1
                  ? `<div class="thumbs">
                      ${photos
                        .map(
                          (p, idx) =>
                            `<img src="${p.dataUrl}" alt="Photo ${idx + 1}" class="thumb ${idx === 0 ? 'active' : ''}" data-thumb-idx="${idx}" />`
                        )
                        .join('')}
                    </div>`
                  : ''
              }
            </div>

            <div class="card" style="margin-bottom:16px;">
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
                <span class="badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}">${esc(item.type)}</span>
                ${statusBadgeHtml(item.status)}
                ${item.isSample ? '<span class="badge badge-sample">Sample Data</span>' : ''}
              </div>
              <h1 style="margin:0 0 10px;font-size:1.55rem;">${esc(item.title)}</h1>
              <p style="margin:0;color:var(--muted);white-space:pre-line;">${esc(item.description)}</p>

              <div class="meta-grid">
                <div class="meta-box"><small>Category</small><strong>${esc(item.category)}</strong></div>
                <div class="meta-box"><small>Date</small><strong>${esc(fmtDate(item.eventDate))}</strong></div>
                <div class="meta-box"><small>Location</small><strong>${esc(item.location)}</strong></div>
                <div class="meta-box"><small>Reported By</small><strong>${esc(item.reporterName)}</strong></div>
              </div>

              <div class="meta-box" style="margin-bottom:10px;">
                <small>Contact Details</small>
                <strong>${esc(item.contactInfo)}</strong>
              </div>

              ${
                item.verificationHint
                  ? `<div class="meta-box"><small>Verification Prompt</small><span>${esc(item.verificationHint)}</span></div>`
                  : ''
              }

              <div class="row-actions">
                <button type="button" id="detail-save-btn" class="btn btn-secondary btn-sm">${isSaved ? '♥ Saved' : '♡ Save Listing'}</button>
                <button type="button" id="detail-share-btn" class="btn btn-secondary btn-sm">Share Link</button>
              </div>
            </div>
          </div>

          <div>
            ${
              isOwner
                ? `
              <div class="card" style="margin-bottom:16px;">
                <h3 style="margin:0 0 8px;">Manage Your Listing</h3>
                <p style="margin:0 0 12px;font-size:0.86rem;color:var(--muted);">You are signed in as the reporter (${esc(state.currentUser.name)}).</p>
                <div class="row-actions">
                  <a href="#/report?edit=${esc(item.id)}" class="btn btn-secondary btn-sm">Edit</a>
                  ${
                    item.status !== 'recovered'
                      ? `<button type="button" id="mark-recovered-btn" class="btn btn-primary btn-sm">✓ Mark Recovered</button>`
                      : `<button type="button" id="reopen-item-btn" class="btn btn-secondary btn-sm">Reopen Listing</button>`
                  }
                  <button type="button" id="delete-item-btn" class="btn btn-danger btn-sm">Delete</button>
                </div>
              </div>
            `
                : `
              <div class="card" style="margin-bottom:16px;">
                <h3 style="margin:0 0 6px;">${item.type === 'found' ? 'Claim This Item' : 'Report a Sighting / Match'}</h3>
                <p style="margin:0 0 12px;font-size:0.86rem;color:var(--muted);">
                  ${
                    item.status === 'recovered'
                      ? 'This item has already been marked as recovered.'
                      : 'Submit ownership proof or contact details so the reporter can verify.'
                  }
                </p>
                ${
                  item.status !== 'recovered'
                    ? `
                  <form id="claim-form">
                    <div class="field">
                      <label for="clm-contact">Your Contact (Phone or Email) *</label>
                      <input id="clm-contact" class="input" required value="${esc(state.currentUser?.phone || state.currentUser?.email || '')}" />
                    </div>
                    <div class="field">
                      <label for="clm-proof">Verification Proof *</label>
                      <textarea id="clm-proof" class="textarea" required placeholder="${esc(item.verificationHint || 'Describe unique marks, serial numbers, or contents…')}"></textarea>
                    </div>
                    <div class="field">
                      <label for="clm-msg">Message *</label>
                      <input id="clm-msg" class="input" required placeholder="When and where can you connect?" />
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Submit Verification Claim</button>
                  </form>
                `
                    : ''
                }
              </div>
            `
            }

            <div class="card" style="margin-bottom:16px;">
              <h3 style="margin:0 0 10px;">Claims (${item.claims.length})</h3>
              ${
                item.claims.length
                  ? item.claims
                      .map(
                        (c) => `
                    <div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px;">
                      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
                        <strong>${esc(c.claimantName)}</strong>
                        <span class="badge ${c.status === 'approved' ? 'badge-found' : c.status === 'rejected' ? 'badge-lost' : 'badge-claimed'}">${esc(c.status)}</span>
                      </div>
                      <p style="margin:6px 0;font-size:0.86rem;">${esc(c.message)}</p>
                      <p style="margin:4px 0;font-size:0.82rem;color:var(--muted);"><strong>Proof:</strong> ${esc(c.proofDetails)}</p>
                      <p style="margin:4px 0 0;font-size:0.8rem;color:var(--soft);">Contact: ${esc(c.claimantContact)} · ${esc(fmtDateTime(c.createdAt))}</p>
                      ${
                        isOwner && c.status === 'pending'
                          ? `<div class="row-actions">
                              <button type="button" class="btn btn-primary btn-sm claim-act-btn" data-cid="${esc(c.id)}" data-act="approved">Approve Claim</button>
                              <button type="button" class="btn btn-danger btn-sm claim-act-btn" data-cid="${esc(c.id)}" data-act="rejected">Reject</button>
                            </div>`
                          : ''
                      }
                    </div>
                  `
                      )
                      .join('')
                  : '<p style="margin:0;font-size:0.88rem;color:var(--soft);">No claims submitted yet.</p>'
              }
            </div>

            <div class="card">
              <h3 style="margin:0 0 10px;">Status Timeline</h3>
              <ul class="timeline">
                ${item.statusUpdates
                  .map(
                    (u) => `
                  <li>
                    <strong>${esc(u.note)}</strong>
                    <small>${esc(u.actorName)} · ${esc(fmtDateTime(u.createdAt))}</small>
                  </li>
                `
                  )
                  .join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  main.querySelectorAll('[data-thumb-idx]').forEach((img) => {
    img.addEventListener('click', () => {
      const idx = Number(img.dataset.thumbIdx);
      main.querySelector('#main-detail-img').src = photos[idx].dataUrl;
      main.querySelectorAll('.thumb').forEach((t) => t.classList.remove('active'));
      img.classList.add('active');
    });
  });

  main.querySelector('#detail-save-btn')?.addEventListener('click', async () => {
    const saved = await dbApi.toggleSaved(state.currentUser.id, item.id);
    if (saved) state.savedIds.add(item.id);
    else state.savedIds.delete(item.id);
    showToast(saved ? 'Listing saved.' : 'Removed from saved.', 'ok');
    renderItemDetailPage(main, item.id);
  });

  main.querySelector('#detail-share-btn')?.addEventListener('click', async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `FindIt: ${item.title}`, text: item.description, url });
        return;
      } catch {
        /* fallback to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Listing link copied!', 'ok');
    } catch {
      showToast('Copy the URL from your browser address bar.', 'ok');
    }
  });

  main.querySelector('#mark-recovered-btn')?.addEventListener('click', async () => {
    await dbApi.updateReportStatus(item.id, 'recovered', 'Item marked as recovered and reunited!');
    showToast('Marked as Recovered!', 'ok');
    renderItemDetailPage(main, item.id);
  });

  main.querySelector('#reopen-item-btn')?.addEventListener('click', async () => {
    await dbApi.updateReportStatus(item.id, 'open', 'Listing reopened by reporter.');
    showToast('Listing reopened.', 'ok');
    renderItemDetailPage(main, item.id);
  });

  main.querySelector('#delete-item-btn')?.addEventListener('click', async () => {
    if (!window.confirm('Delete this report permanently from your local database?')) return;
    await dbApi.deleteReport(item.id);
    showToast('Listing deleted.', 'ok');
    navigate('#/browse');
  });

  main.querySelector('#claim-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const claimantContact = main.querySelector('#clm-contact').value.trim();
    const proofDetails = main.querySelector('#clm-proof').value.trim();
    const message = main.querySelector('#clm-msg').value.trim();
    if (!claimantContact || !proofDetails || !message) return;
    await dbApi.createClaim({ reportId: item.id, claimantContact, proofDetails, message });
    showToast('Claim submitted! Switch to the reporter profile to approve/reject it.', 'ok');
    renderItemDetailPage(main, item.id);
  });

  main.querySelectorAll('.claim-act-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await dbApi.updateClaimStatus(btn.dataset.cid, btn.dataset.act);
      showToast(`Claim ${btn.dataset.act}.`, 'ok');
      renderItemDetailPage(main, item.id);
    });
  });
}

/* ---------- Page 4: Create / Edit Report Form ---------- */

async function renderReportPage(main, params) {
  const editId = params.get('edit');
  let editingItem = null;
  if (editId) {
    editingItem = await dbApi.getReportById(editId);
  }

  let reportType = editingItem ? editingItem.type : params.get('type') === 'found' ? 'found' : 'lost';
  state.draftPhotos = editingItem ? [...editingItem.photos] : [];

  const today = new Date().toISOString().slice(0, 10);

  main.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="form-box">
          <h2 style="margin:0 0 6px;">${editingItem ? 'Edit Report' : 'Post a Lost or Found Item'}</h2>
          <p style="margin:0 0 16px;font-size:0.88rem;color:var(--muted);">
            Posting as <strong>${esc(state.currentUser?.name)}</strong> · Stored locally in IndexedDB.
          </p>

          <form id="report-form">
            <div class="field">
              <label>Report Type *</label>
              <div class="seg-toggle">
                <button type="button" id="seg-lost" class="seg-btn ${reportType === 'lost' ? 'lost-on' : ''}">I Lost Something</button>
                <button type="button" id="seg-found" class="seg-btn ${reportType === 'found' ? 'found-on' : ''}">I Found Something</button>
              </div>
            </div>

            <div class="field">
              <label for="rep-title">Item Title *</label>
              <input id="rep-title" class="input" required maxlength="90" value="${esc(editingItem?.title || '')}" placeholder="e.g. Samsung Galaxy Buds in Black Case" />
            </div>

            <div class="form-grid">
              <div class="field">
                <label for="rep-category">Category *</label>
                <select id="rep-category" class="select" required>
                  ${CATEGORIES.map((c) => `<option value="${esc(c)}" ${(editingItem?.category || '') === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="rep-date">Date Lost / Found *</label>
                <input id="rep-date" class="input" type="date" required value="${esc(editingItem?.eventDate || today)}" />
              </div>
            </div>

            <div class="field">
              <label for="rep-location">Location / Landmark *</label>
              <input id="rep-location" class="input" required value="${esc(editingItem?.location || '')}" placeholder="e.g. City Bus Stop, Platform 3, Main Library" />
            </div>

            <div class="field">
              <label for="rep-desc">Description *</label>
              <textarea id="rep-desc" class="textarea" required placeholder="Include color, brand, condition, or where it was last seen…">${esc(editingItem?.description || '')}</textarea>
            </div>

            <div class="form-grid">
              <div class="field">
                <label for="rep-contact">Contact Info *</label>
                <input id="rep-contact" class="input" required value="${esc(editingItem?.contactInfo || state.currentUser?.phone || state.currentUser?.email || '')}" placeholder="Phone or email" />
              </div>
              <div class="field">
                <label for="rep-hint">Ownership Verification Hint</label>
                <input id="rep-hint" class="input" value="${esc(editingItem?.verificationHint || '')}" placeholder="e.g. Ask about sticker inside case" />
              </div>
            </div>

            <div class="field">
              <label for="rep-photos">Item Photos (Camera or Gallery — up to 4)</label>
              <div class="upload-box">
                <input id="rep-photos" type="file" accept="image/*" multiple style="width:100%;" />
                <p style="margin:8px 0 0;font-size:0.8rem;color:var(--soft);">Photos are automatically resized and saved offline in IndexedDB.</p>
                <div id="photo-preview-row" class="preview-row"></div>
              </div>
            </div>

            <div class="row-actions" style="margin-top:16px;">
              <button type="submit" class="btn btn-primary">${editingItem ? 'Save Changes' : 'Publish Report'}</button>
              <a href="${editingItem ? `#/item/${esc(editingItem.id)}` : '#/browse'}" class="btn btn-secondary">Cancel</a>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;

  function renderPreviews() {
    const row = main.querySelector('#photo-preview-row');
    if (!row) return;
    row.innerHTML = state.draftPhotos
      .map(
        (ph, idx) => `
      <div class="preview-thumb">
        <img src="${ph.dataUrl}" alt="Preview ${idx + 1}" />
        <button type="button" class="preview-del" data-rm-ph="${idx}" aria-label="Remove photo">✕</button>
      </div>
    `
      )
      .join('');
    row.querySelectorAll('[data-rm-ph]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.draftPhotos.splice(Number(btn.dataset.rmPh), 1);
        renderPreviews();
      });
    });
  }

  renderPreviews();

  const segLost = main.querySelector('#seg-lost');
  const segFound = main.querySelector('#seg-found');
  segLost.addEventListener('click', () => {
    reportType = 'lost';
    segLost.classList.add('lost-on');
    segFound.classList.remove('found-on');
  });
  segFound.addEventListener('click', () => {
    reportType = 'found';
    segFound.classList.add('found-on');
    segLost.classList.remove('lost-on');
  });

  main.querySelector('#rep-photos')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = Math.max(0, 4 - state.draftPhotos.length);
    if (files.length > remaining) {
      showToast('You can attach up to 4 photos per report.', 'err');
    }
    for (const file of files.slice(0, remaining)) {
      try {
        const compressed = await compressImageFile(file);
        state.draftPhotos.push(compressed);
      } catch {
        showToast(`Could not process ${file.name}`, 'err');
      }
    }
    e.target.value = '';
    renderPreviews();
  });

  main.querySelector('#report-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      type: reportType,
      title: main.querySelector('#rep-title').value.trim(),
      category: main.querySelector('#rep-category').value,
      eventDate: main.querySelector('#rep-date').value,
      location: main.querySelector('#rep-location').value.trim(),
      description: main.querySelector('#rep-desc').value.trim(),
      contactInfo: main.querySelector('#rep-contact').value.trim(),
      verificationHint: main.querySelector('#rep-hint').value.trim()
    };

    if (!payload.title || !payload.location || !payload.description || !payload.contactInfo) {
      showToast('Please complete all required fields.', 'err');
      return;
    }

    const saved = editingItem
      ? await dbApi.updateReport(editingItem.id, payload, state.draftPhotos)
      : await dbApi.createReport(payload, state.draftPhotos);

    showToast(editingItem ? 'Report updated!' : 'Report published locally!', 'ok');
    navigate(`#/item/${saved.id}`);
  });
}

/* ---------- Page 5: User Dashboard & Demo Settings ---------- */

async function renderDashboardPage(main, params) {
  if (params.has('tab')) {
    state.dashboardTab = params.get('tab') || 'my-reports';
  }
  const user = state.currentUser;
  const [myReports, allReports, myClaims, incomingClaims] = await Promise.all([
    dbApi.listReports({ userId: user.id }),
    dbApi.listReports(),
    dbApi.listClaimsByUser(user.id),
    dbApi.listIncomingClaims(user.id)
  ]);

  const savedReports = allReports.filter((r) => state.savedIds.has(r.id));
  const storageInfo = dbApi.getStorageInfo();

  let tabContent = '';
  if (state.dashboardTab === 'my-reports') {
    tabContent = myReports.length
      ? `<div class="cards-grid">${myReports.map(renderItemCard).join('')}</div>`
      : `<div class="empty"><p>You have not posted any reports with this profile yet.</p><a href="#/report" class="btn btn-primary">Post a Report</a></div>`;
  } else if (state.dashboardTab === 'saved') {
    tabContent = savedReports.length
      ? `<div class="cards-grid">${savedReports.map(renderItemCard).join('')}</div>`
      : `<div class="empty"><p>No saved listings yet. Tap ♡ on any item card to bookmark it.</p><a href="#/browse" class="btn btn-secondary">Browse Listings</a></div>`;
  } else if (state.dashboardTab === 'my-claims') {
    tabContent = myClaims.length
      ? myClaims
          .map(
            (c) => `
          <div class="card" style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
              <strong>${esc(c.report?.title || 'Deleted Listing')}</strong>
              <span class="badge ${c.status === 'approved' ? 'badge-found' : c.status === 'rejected' ? 'badge-lost' : 'badge-claimed'}">${esc(c.status)}</span>
            </div>
            <p style="margin:6px 0;font-size:0.88rem;">${esc(c.message)}</p>
            <p style="margin:0;font-size:0.82rem;color:var(--soft);">Proof: ${esc(c.proofDetails)} · ${esc(fmtDateTime(c.createdAt))}</p>
            ${c.report ? `<div class="row-actions"><a href="#/item/${esc(c.report.id)}" class="btn btn-secondary btn-sm">Open Listing</a></div>` : ''}
          </div>
        `
          )
          .join('')
      : `<div class="empty"><p>You haven't submitted any claims yet.</p></div>`;
  } else if (state.dashboardTab === 'incoming') {
    tabContent = incomingClaims.length
      ? incomingClaims
          .map(
            (c) => `
          <div class="card" style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
              <strong>${esc(c.claimantName)} → ${esc(c.report?.title || 'Listing')}</strong>
              <span class="badge ${c.status === 'approved' ? 'badge-found' : c.status === 'rejected' ? 'badge-lost' : 'badge-claimed'}">${esc(c.status)}</span>
            </div>
            <p style="margin:6px 0;font-size:0.88rem;">${esc(c.message)}</p>
            <p style="margin:4px 0;font-size:0.84rem;color:var(--muted);"><strong>Proof:</strong> ${esc(c.proofDetails)}</p>
            <p style="margin:0;font-size:0.8rem;color:var(--soft);">Contact: ${esc(c.claimantContact)}</p>
            <div class="row-actions">
              ${
                c.status === 'pending'
                  ? `
                <button type="button" class="btn btn-primary btn-sm dash-claim-btn" data-cid="${esc(c.id)}" data-act="approved">Approve</button>
                <button type="button" class="btn btn-danger btn-sm dash-claim-btn" data-cid="${esc(c.id)}" data-act="rejected">Reject</button>
              `
                  : ''
              }
              <a href="#/item/${esc(c.reportId)}" class="btn btn-secondary btn-sm">View Item</a>
            </div>
          </div>
        `
          )
          .join('')
      : `<div class="empty"><p>No incoming claims on your listings yet.</p></div>`;
  } else {
    tabContent = `
      <div class="card">
        <h3 style="margin:0 0 8px;">Local Storage &amp; Demo Controls</h3>
        <p style="margin:0 0 12px;font-size:0.9rem;color:var(--muted);">
          Active Mode: <strong>${esc(storageInfo.mode)}</strong> (${esc(storageInfo.engine)}) · Version ${esc(storageInfo.version)}
        </p>
        <p style="margin:0 0 14px;font-size:0.86rem;color:var(--soft);">
          All reports, photos, claims, and saved listings are stored offline on your device using IndexedDB. Resetting restores the original labeled sample data.
        </p>
        <div class="row-actions">
          <button type="button" id="reset-demo-btn" class="btn btn-danger btn-sm">Reset Demo Data</button>
          <button type="button" id="export-json-btn" class="btn btn-secondary btn-sm">Download Local JSON Backup</button>
          <button type="button" id="open-profile-modal-btn" class="btn btn-secondary btn-sm">Switch / Create Profile</button>
        </div>
      </div>
    `;
  }

  main.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="card" style="margin-bottom:18px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="avatar" style="width:46px;height:46px;font-size:1rem;">${esc(initials(user.name))}</div>
            <div>
              <h2 style="margin:0;font-size:1.25rem;">${esc(user.name)}</h2>
              <div style="font-size:0.84rem;color:var(--soft);">${esc(user.city)} · ${esc(user.email)}</div>
            </div>
          </div>
          <div class="row-actions" style="margin-top:0;">
            <button type="button" id="dash-switch-btn" class="btn btn-secondary btn-sm">Switch Profile</button>
            <a href="#/report" class="btn btn-primary btn-sm">+ New Report</a>
          </div>
        </div>

        <div class="tabs">
          <button type="button" class="tab ${state.dashboardTab === 'my-reports' ? 'active' : ''}" data-tab="my-reports">My Reports (${myReports.length})</button>
          <button type="button" class="tab ${state.dashboardTab === 'saved' ? 'active' : ''}" data-tab="saved">Saved (${savedReports.length})</button>
          <button type="button" class="tab ${state.dashboardTab === 'incoming' ? 'active' : ''}" data-tab="incoming">Incoming Claims (${incomingClaims.length})</button>
          <button type="button" class="tab ${state.dashboardTab === 'my-claims' ? 'active' : ''}" data-tab="my-claims">My Claims (${myClaims.length})</button>
          <button type="button" class="tab ${state.dashboardTab === 'settings' ? 'active' : ''}" data-tab="settings">Demo &amp; Storage</button>
        </div>

        ${tabContent}
      </div>
    </section>
  `;

  bindCardEvents(main);

  main.querySelector('#dash-switch-btn')?.addEventListener('click', openProfileModal);
  main.querySelector('#open-profile-modal-btn')?.addEventListener('click', openProfileModal);

  main.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.dashboardTab = btn.dataset.tab;
      navigate(`#/dashboard?tab=${encodeURIComponent(state.dashboardTab)}`);
    });
  });

  main.querySelectorAll('.dash-claim-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await dbApi.updateClaimStatus(btn.dataset.cid, btn.dataset.act);
      showToast(`Claim ${btn.dataset.act}.`, 'ok');
      renderDashboardPage(main, new URLSearchParams(`tab=${state.dashboardTab}`));
    });
  });

  main.querySelector('#reset-demo-btn')?.addEventListener('click', async () => {
    if (!window.confirm('Reset all local data back to the original sample demo listings?')) return;
    await dbApi.resetDemoData();
    state.currentUser = await dbApi.getCurrentUser();
    await refreshSavedIds();
    showToast('Demo data restored!', 'ok');
    renderCurrentRoute();
  });

  main.querySelector('#export-json-btn')?.addEventListener('click', async () => {
    const data = await dbApi.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `findit-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON downloaded.', 'ok');
  });
}

/* ---------- Router & Boot ---------- */

async function refreshSavedIds() {
  if (!state.currentUser) {
    state.savedIds = new Set();
    return;
  }
  const ids = await dbApi.getSavedIds(state.currentUser.id);
  state.savedIds = new Set(ids);
}

async function renderCurrentRoute() {
  const { path, params } = parseRoute();
  const main = document.getElementById('main-content');
  if (!main) return;

  if (path === '/dashboard' && params.has('tab')) {
    state.dashboardTab = params.get('tab');
  }

  renderShell(path);

  try {
    if (path === '/' || path === '') {
      await renderHomePage(main);
    } else if (path === '/browse') {
      await renderBrowsePage(main, params);
    } else if (path.startsWith('/item/')) {
      const id = decodeURIComponent(path.replace('/item/', '').split('/')[0]);
      await renderItemDetailPage(main, id);
    } else if (path === '/report') {
      await renderReportPage(main, params);
    } else if (path === '/dashboard') {
      await renderDashboardPage(main, params);
    } else {
      await renderHomePage(main);
    }
  } catch (err) {
    console.error('FindIt route render error:', err);
    main.innerHTML = `
      <section class="section"><div class="container">
        <div class="empty">
          <h2>Something went wrong</h2>
          <p>${esc(err.message || 'Unexpected error while rendering page.')}</p>
          <a href="#/" class="btn btn-primary">Return Home</a>
        </div>
      </div></section>
    `;
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
}

async function boot() {
  applyTheme(state.theme);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((err) => {
        console.warn('Service Worker registration skipped:', err);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredInstallPrompt = e;
    renderShell(parseRoute().path);
  });

  window.addEventListener('online', () => {
    state.isOnline = true;
    showToast('Back online.', 'ok');
    renderShell(parseRoute().path);
  });

  window.addEventListener('offline', () => {
    state.isOnline = false;
    showToast('Offline mode active — IndexedDB keeps working.', 'ok');
    renderShell(parseRoute().path);
  });

  window.addEventListener('hashchange', renderCurrentRoute);

  try {
    await dbApi.init();
    state.currentUser = await dbApi.getCurrentUser();
    await refreshSavedIds();
    await renderCurrentRoute();
  } catch (err) {
    console.error('FindIt boot error:', err);
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = `
        <section class="section"><div class="container">
          <div class="empty">
            <h2>Could Not Start Local Database</h2>
            <p>${esc(err.message || 'IndexedDB may be blocked in private browsing mode.')}</p>
          </div>
        </div></section>
      `;
    }
  }
}

boot();
