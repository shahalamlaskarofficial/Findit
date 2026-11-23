/* ==========================================================================
   FindIt — Database Layer (IndexedDB Local Mode + Future Supabase Adapter)
   Phase 1: Local Demo Edition (Works 100% offline with zero API keys)
   ========================================================================== */

export const APP_CONFIG = {
  APP_NAME: 'FindIt',
  TAGLINE: "Lost Something? Let's Find It.",
  VERSION: '1.0.0-local-demo',
  STORAGE_MODE: 'LOCAL', // 'LOCAL' (default) | 'SUPABASE' (Phase 2)
  DB_NAME: 'FindItLocalDB',
  DB_VERSION: 1,
  SUPABASE: {
    url: '',
    anonKey: '',
    bucket: 'item-photos'
  }
};

export const CATEGORIES = [
  'Electronics',
  'Wallets & Cards',
  'Keys',
  'Bags & Luggage',
  'Documents & IDs',
  'Jewelry & Watches',
  'Pets',
  'Clothing & Accessories',
  'Other'
];

/* ---------- Helpers ---------- */

function uid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(offsetHours = 0) {
  return new Date(Date.now() + offsetHours * 3600 * 1000).toISOString();
}

export function makePlaceholderPhoto(title, subtitle, bg1 = '#0f766e', bg2 = '#0369a1') {
  const safeTitle = String(title || 'FindIt Item').replace(/[<>&"]/g, '').slice(0, 28);
  const safeSub = String(subtitle || 'Local Demo Photo').replace(/[<>&"]/g, '').slice(0, 34);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bg1}"/>
          <stop offset="100%" stop-color="${bg2}"/>
        </linearGradient>
      </defs>
      <rect width="640" height="400" fill="url(#g)"/>
      <circle cx="530" cy="80" r="110" fill="rgba(255,255,255,0.08)"/>
      <circle cx="110" cy="340" r="140" fill="rgba(255,255,255,0.06)"/>
      <rect x="44" y="44" width="160" height="34" rx="17" fill="rgba(15,23,42,0.35)"/>
      <text x="124" y="66" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="700">SAMPLE PHOTO</text>
      <text x="44" y="210" fill="#ffffff" font-family="sans-serif" font-size="34" font-weight="800">${safeTitle}</text>
      <text x="44" y="250" fill="rgba(255,255,255,0.88)" font-family="sans-serif" font-size="18">${safeSub}</text>
      <text x="44" y="356" fill="rgba(255,255,255,0.72)" font-family="sans-serif" font-size="14">FindIt Local Demo Edition</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/* Compress Android camera photos so IndexedDB stays fast and light */
export function compressImageFile(file, maxWidth = 1000, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / (img.width || maxWidth));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({
          name: file.name || 'photo.jpg',
          dataUrl
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- Realistic Labeled Demo Data ---------- */

function buildDemoSeed() {
  const users = [
    {
      id: 'user_demo_1',
      name: 'Aarav Sharma (Demo)',
      email: 'aarav.demo@findit.local',
      phone: '+91 98000 11223',
      city: 'Bengaluru',
      isSample: true,
      createdAt: nowIso(-120)
    },
    {
      id: 'user_demo_2',
      name: 'Priya Nair (Demo)',
      email: 'priya.demo@findit.local',
      phone: '+91 98000 44556',
      city: 'Mumbai',
      isSample: true,
      createdAt: nowIso(-110)
    },
    {
      id: 'user_demo_3',
      name: 'Rohan Verma (Demo)',
      email: 'rohan.demo@findit.local',
      phone: '+91 98000 77889',
      city: 'Delhi',
      isSample: true,
      createdAt: nowIso(-100)
    }
  ];

  const reports = [
    {
      id: 'rep_demo_1',
      type: 'lost',
      title: 'Black Sony WH-1000XM4 Headphones',
      category: 'Electronics',
      description: 'Left in a dark grey zip hard-case on the metro bench near Platform 2. Has a small scratch near the left earcup hinge.',
      location: 'Indiranagar Metro Station, Bengaluru',
      eventDate: new Date(Date.now() - 86400000 * 1).toISOString().slice(0, 10),
      contactInfo: 'aarav.demo@findit.local | +91 98000 11223',
      verificationHint: 'Describe the sticker inside the carrying case.',
      status: 'open',
      userId: 'user_demo_1',
      reporterName: 'Aarav Sharma (Demo)',
      isSample: true,
      createdAt: nowIso(-18),
      updatedAt: nowIso(-18)
    },
    {
      id: 'rep_demo_2',
      type: 'found',
      title: 'Brown Leather Bifold Wallet',
      category: 'Wallets & Cards',
      description: 'Found near the main café entrance around 5:30 PM. Kept safely at the café counter and logged here so the owner can verify and pick it up.',
      location: 'Bandra West Linking Road, Mumbai',
      eventDate: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
      contactInfo: 'priya.demo@findit.local | +91 98000 44556',
      verificationHint: 'State the initials embossed inside and one card name.',
      status: 'claimed',
      userId: 'user_demo_2',
      reporterName: 'Priya Nair (Demo)',
      isSample: true,
      createdAt: nowIso(-40),
      updatedAt: nowIso(-10)
    },
    {
      id: 'rep_demo_3',
      type: 'found',
      title: 'Set of 3 Keys with Blue Keychain',
      category: 'Keys',
      description: 'Found on the jogging track bench near the East Gate. Includes one bike key and two house keys attached to a blue woven strap.',
      location: 'Lodhi Garden East Gate, Delhi',
      eventDate: new Date(Date.now() - 86400000 * 1).toISOString().slice(0, 10),
      contactInfo: 'rohan.demo@findit.local | +91 98000 77889',
      verificationHint: 'Mention the brand stamped on the bike key.',
      status: 'open',
      userId: 'user_demo_3',
      reporterName: 'Rohan Verma (Demo)',
      isSample: true,
      createdAt: nowIso(-12),
      updatedAt: nowIso(-12)
    },
    {
      id: 'rep_demo_4',
      type: 'lost',
      title: 'Navy Blue Laptop Backpack',
      category: 'Bags & Luggage',
      description: 'Forgotten in the back seat of a cab during evening commute. Contains notebooks, a water bottle, and a USB-C charger.',
      location: 'MG Road to Koramangala, Bengaluru',
      eventDate: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
      contactInfo: 'aarav.demo@findit.local | +91 98000 11223',
      verificationHint: 'Color of the insulated bottle in the side pocket.',
      status: 'open',
      userId: 'user_demo_1',
      reporterName: 'Aarav Sharma (Demo)',
      isSample: true,
      createdAt: nowIso(-64),
      updatedAt: nowIso(-64)
    },
    {
      id: 'rep_demo_5',
      type: 'found',
      title: 'Silver Casio Digital Watch',
      category: 'Jewelry & Watches',
      description: 'Picked up near the library study desks on the 2nd floor. Returned safely to the owner after matching the clasp mark.',
      location: 'Central Public Library, Mumbai',
      eventDate: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10),
      contactInfo: 'priya.demo@findit.local',
      verificationHint: 'Back-plate engraving check.',
      status: 'recovered',
      userId: 'user_demo_2',
      reporterName: 'Priya Nair (Demo)',
      isSample: true,
      createdAt: nowIso(-110),
      updatedAt: nowIso(-24)
    },
    {
      id: 'rep_demo_6',
      type: 'lost',
      title: 'Friendly Golden Retriever Wearing Red Collar',
      category: 'Pets',
      description: 'Responds to "Bruno". Slipped out of the park gate during morning walk. Very friendly and microchipped.',
      location: 'Cubbon Park Bandstand, Bengaluru',
      eventDate: new Date(Date.now() - 86400000 * 1).toISOString().slice(0, 10),
      contactInfo: 'rohan.demo@findit.local | +91 98000 77889',
      verificationHint: 'Phone number engraved on the brass collar tag.',
      status: 'open',
      userId: 'user_demo_3',
      reporterName: 'Rohan Verma (Demo)',
      isSample: true,
      createdAt: nowIso(-8),
      updatedAt: nowIso(-8)
    }
  ];

  const photos = [
    {
      id: 'ph_demo_1',
      reportId: 'rep_demo_1',
      name: 'sony-headphones-demo.svg',
      dataUrl: makePlaceholderPhoto('Sony WH-1000XM4', 'Electronics • Indiranagar Metro', '#1e293b', '#0f766e'),
      createdAt: nowIso(-18)
    },
    {
      id: 'ph_demo_2',
      reportId: 'rep_demo_2',
      name: 'leather-wallet-demo.svg',
      dataUrl: makePlaceholderPhoto('Brown Leather Wallet', 'Wallets & Cards • Bandra West', '#7c2d12', '#b45309'),
      createdAt: nowIso(-40)
    },
    {
      id: 'ph_demo_3',
      reportId: 'rep_demo_3',
      name: 'blue-keychain-demo.svg',
      dataUrl: makePlaceholderPhoto('Keys & Blue Strap', 'Keys • Lodhi Garden Delhi', '#1d4ed8', '#0284c7'),
      createdAt: nowIso(-12)
    },
    {
      id: 'ph_demo_4',
      reportId: 'rep_demo_4',
      name: 'navy-backpack-demo.svg',
      dataUrl: makePlaceholderPhoto('Navy Laptop Bag', 'Bags & Luggage • Koramangala', '#1e3a8a', '#0f766e'),
      createdAt: nowIso(-64)
    },
    {
      id: 'ph_demo_5',
      reportId: 'rep_demo_5',
      name: 'casio-watch-demo.svg',
      dataUrl: makePlaceholderPhoto('Silver Casio Watch', 'Recovered • Central Library', '#334155', '#0369a1'),
      createdAt: nowIso(-110)
    },
    {
      id: 'ph_demo_6',
      reportId: 'rep_demo_6',
      name: 'golden-retriever-demo.svg',
      dataUrl: makePlaceholderPhoto('Bruno (Red Collar)', 'Pets • Cubbon Park Bengaluru', '#b45309', '#d97706'),
      createdAt: nowIso(-8)
    }
  ];

  const claims = [
    {
      id: 'clm_demo_1',
      reportId: 'rep_demo_2',
      claimantId: 'user_demo_1',
      claimantName: 'Aarav Sharma (Demo)',
      claimantContact: '+91 98000 11223',
      message: 'I believe this is my wallet! I visited that café around 5 PM.',
      proofDetails: 'Initials A.S. embossed inside, plus a metro smart card and library pass.',
      status: 'approved',
      isSample: true,
      createdAt: nowIso(-20),
      updatedAt: nowIso(-10)
    },
    {
      id: 'clm_demo_2',
      reportId: 'rep_demo_3',
      claimantId: 'user_demo_1',
      claimantName: 'Aarav Sharma (Demo)',
      claimantContact: '+91 98000 11223',
      message: 'I lost a similar key set near East Gate during my morning run.',
      proofDetails: 'The bike key has a black rubber grip with Honda branding.',
      status: 'pending',
      isSample: true,
      createdAt: nowIso(-4),
      updatedAt: nowIso(-4)
    }
  ];

  const saved = [
    { id: 'user_demo_1::rep_demo_2', userId: 'user_demo_1', reportId: 'rep_demo_2', createdAt: nowIso(-19) },
    { id: 'user_demo_1::rep_demo_6', userId: 'user_demo_1', reportId: 'rep_demo_6', createdAt: nowIso(-5) }
  ];

  const statusUpdates = [
    { id: 'st_demo_1', reportId: 'rep_demo_1', status: 'open', note: 'Lost item report published.', actorName: 'Aarav Sharma (Demo)', createdAt: nowIso(-18) },
    { id: 'st_demo_2', reportId: 'rep_demo_2', status: 'open', note: 'Found item logged at Bandra café.', actorName: 'Priya Nair (Demo)', createdAt: nowIso(-40) },
    { id: 'st_demo_3', reportId: 'rep_demo_2', status: 'claimed', note: 'Ownership claim verified and approved for pickup.', actorName: 'Priya Nair (Demo)', createdAt: nowIso(-10) },
    { id: 'st_demo_4', reportId: 'rep_demo_3', status: 'open', note: 'Found keys posted for community review.', actorName: 'Rohan Verma (Demo)', createdAt: nowIso(-12) },
    { id: 'st_demo_5', reportId: 'rep_demo_4', status: 'open', note: 'Lost backpack report published.', actorName: 'Aarav Sharma (Demo)', createdAt: nowIso(-64) },
    { id: 'st_demo_6', reportId: 'rep_demo_5', status: 'open', note: 'Found watch posted.', actorName: 'Priya Nair (Demo)', createdAt: nowIso(-110) },
    { id: 'st_demo_7', reportId: 'rep_demo_5', status: 'recovered', note: 'Successfully returned to verified owner!', actorName: 'Priya Nair (Demo)', createdAt: nowIso(-24) },
    { id: 'st_demo_8', reportId: 'rep_demo_6', status: 'open', note: 'Urgent lost pet alert posted.', actorName: 'Rohan Verma (Demo)', createdAt: nowIso(-8) }
  ];

  return { users, reports, photos, claims, saved, statusUpdates };
}

/* ---------- IndexedDB Local Storage Adapter ---------- */

const STORES = ['users', 'reports', 'photos', 'claims', 'saved', 'statusUpdates', 'meta'];

class IndexedDbAdapter {
  constructor() {
    this.dbPromise = null;
  }

  open() {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB is not supported in this browser.'));
        return;
      }
      const req = indexedDB.open(APP_CONFIG.DB_NAME, APP_CONFIG.DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('reports')) {
          const s = db.createObjectStore('reports', { keyPath: 'id' });
          s.createIndex('userId', 'userId', { unique: false });
          s.createIndex('type', 'type', { unique: false });
          s.createIndex('status', 'status', { unique: false });
        }
        if (!db.objectStoreNames.contains('photos')) {
          const s = db.createObjectStore('photos', { keyPath: 'id' });
          s.createIndex('reportId', 'reportId', { unique: false });
        }
        if (!db.objectStoreNames.contains('claims')) {
          const s = db.createObjectStore('claims', { keyPath: 'id' });
          s.createIndex('reportId', 'reportId', { unique: false });
          s.createIndex('claimantId', 'claimantId', { unique: false });
        }
        if (!db.objectStoreNames.contains('saved')) {
          const s = db.createObjectStore('saved', { keyPath: 'id' });
          s.createIndex('userId', 'userId', { unique: false });
          s.createIndex('reportId', 'reportId', { unique: false });
        }
        if (!db.objectStoreNames.contains('statusUpdates')) {
          const s = db.createObjectStore('statusUpdates', { keyPath: 'id' });
          s.createIndex('reportId', 'reportId', { unique: false });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB.'));
    });
    return this.dbPromise;
  }

  async _run(storeName, mode, operation) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = operation(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  get(storeName, key) {
    return this._run(storeName, 'readonly', (s) => s.get(key));
  }

  getAll(storeName) {
    return this._run(storeName, 'readonly', (s) => s.getAll());
  }

  getAllByIndex(storeName, indexName, value) {
    return this._run(storeName, 'readonly', (s) => s.index(indexName).getAll(value));
  }

  put(storeName, value) {
    return this._run(storeName, 'readwrite', (s) => s.put(value));
  }

  delete(storeName, key) {
    return this._run(storeName, 'readwrite', (s) => s.delete(key));
  }

  async clearAll() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES, 'readwrite');
      STORES.forEach((name) => tx.objectStore(name).clear());
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async init() {
    await this.open();
    const seeded = await this.get('meta', 'seeded');
    if (!seeded || !seeded.value) {
      await this.seedDemoData();
    }
    return true;
  }

  async seedDemoData() {
    await this.clearAll();
    const seed = buildDemoSeed();
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES, 'readwrite');
      seed.users.forEach((u) => tx.objectStore('users').put(u));
      seed.reports.forEach((r) => tx.objectStore('reports').put(r));
      seed.photos.forEach((p) => tx.objectStore('photos').put(p));
      seed.claims.forEach((c) => tx.objectStore('claims').put(c));
      seed.saved.forEach((s) => tx.objectStore('saved').put(s));
      seed.statusUpdates.forEach((u) => tx.objectStore('statusUpdates').put(u));
      tx.objectStore('meta').put({ key: 'seeded', value: true });
      tx.objectStore('meta').put({ key: 'currentUserId', value: seed.users[0].id });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  /* ---- Auth / Demo User Service ---- */
  async listUsers() {
    const users = await this.getAll('users');
    return users.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getCurrentUser() {
    const meta = await this.get('meta', 'currentUserId');
    const users = await this.listUsers();
    if (!users.length) return null;
    const found = meta ? users.find((u) => u.id === meta.value) : null;
    if (found) return found;
    await this.put('meta', { key: 'currentUserId', value: users[0].id });
    return users[0];
  }

  async switchUser(userId) {
    const user = await this.get('users', userId);
    if (!user) throw new Error('User profile not found.');
    await this.put('meta', { key: 'currentUserId', value: user.id });
    return user;
  }

  async createUser({ name, email, phone, city }) {
    const user = {
      id: uid('user'),
      name: name.trim(),
      email: (email || '').trim() || `${Date.now()}@findit.local`,
      phone: (phone || '').trim(),
      city: (city || '').trim() || 'Local Area',
      isSample: false,
      createdAt: nowIso()
    };
    await this.put('users', user);
    await this.put('meta', { key: 'currentUserId', value: user.id });
    return user;
  }

  /* ---- Listing & Image Service ---- */
  async listReports(filters = {}) {
    const [reports, allPhotos] = await Promise.all([
      this.getAll('reports'),
      this.getAll('photos')
    ]);

    const photoMap = new Map();
    for (const ph of allPhotos) {
      if (!photoMap.has(ph.reportId)) photoMap.set(ph.reportId, []);
      photoMap.get(ph.reportId).push(ph);
    }

    let items = reports.map((r) => ({
      ...r,
      photos: photoMap.get(r.id) || []
    }));

    if (filters.type && filters.type !== 'all') {
      items = items.filter((i) => i.type === filters.type);
    }
    if (filters.category && filters.category !== 'all') {
      items = items.filter((i) => i.category === filters.category);
    }
    if (filters.status && filters.status !== 'all') {
      items = items.filter((i) => i.status === filters.status);
    }
    if (filters.userId) {
      items = items.filter((i) => i.userId === filters.userId);
    }
    if (filters.query && filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      items = items.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }

    const sort = filters.sort || 'newest';
    items.sort((a, b) => {
      if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      return b.createdAt.localeCompare(a.createdAt);
    });

    return items;
  }

  async getReportById(id) {
    const report = await this.get('reports', id);
    if (!report) return null;
    const [photos, claims, updates] = await Promise.all([
      this.getAllByIndex('photos', 'reportId', id),
      this.getAllByIndex('claims', 'reportId', id),
      this.getAllByIndex('statusUpdates', 'reportId', id)
    ]);
    return {
      ...report,
      photos,
      claims: claims.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      statusUpdates: updates.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    };
  }

  async createReport(payload, photoList = []) {
    const user = await this.getCurrentUser();
    const id = uid('rep');
    const timestamp = nowIso();
    const record = {
      id,
      type: payload.type === 'found' ? 'found' : 'lost',
      title: payload.title.trim(),
      category: payload.category || 'Other',
      description: payload.description.trim(),
      location: payload.location.trim(),
      eventDate: payload.eventDate || timestamp.slice(0, 10),
      contactInfo: payload.contactInfo.trim(),
      verificationHint: (payload.verificationHint || '').trim(),
      status: 'open',
      userId: user.id,
      reporterName: user.name,
      isSample: false,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await this.put('reports', record);

    for (const ph of photoList) {
      await this.put('photos', {
        id: uid('ph'),
        reportId: id,
        name: ph.name || 'item-photo.jpg',
        dataUrl: ph.dataUrl,
        createdAt: timestamp
      });
    }

    await this.put('statusUpdates', {
      id: uid('st'),
      reportId: id,
      status: 'open',
      note: `${record.type === 'lost' ? 'Lost' : 'Found'} item report created.`,
      actorName: user.name,
      createdAt: timestamp
    });

    return this.getReportById(id);
  }

  async updateReport(id, payload, photoList = null) {
    const existing = await this.get('reports', id);
    if (!existing) throw new Error('Listing not found.');
    const user = await this.getCurrentUser();
    const timestamp = nowIso();

    const updated = {
      ...existing,
      type: payload.type === 'found' ? 'found' : 'lost',
      title: payload.title.trim(),
      category: payload.category || existing.category,
      description: payload.description.trim(),
      location: payload.location.trim(),
      eventDate: payload.eventDate || existing.eventDate,
      contactInfo: payload.contactInfo.trim(),
      verificationHint: (payload.verificationHint || '').trim(),
      updatedAt: timestamp
    };

    await this.put('reports', updated);

    if (Array.isArray(photoList)) {
      const oldPhotos = await this.getAllByIndex('photos', 'reportId', id);
      for (const old of oldPhotos) {
        await this.delete('photos', old.id);
      }
      for (const ph of photoList) {
        await this.put('photos', {
          id: ph.id || uid('ph'),
          reportId: id,
          name: ph.name || 'item-photo.jpg',
          dataUrl: ph.dataUrl,
          createdAt: ph.createdAt || timestamp
        });
      }
    }

    await this.put('statusUpdates', {
      id: uid('st'),
      reportId: id,
      status: updated.status,
      note: 'Listing details updated.',
      actorName: user.name,
      createdAt: timestamp
    });

    return this.getReportById(id);
  }

  async updateReportStatus(id, newStatus, note = '') {
    const existing = await this.get('reports', id);
    if (!existing) throw new Error('Listing not found.');
    const user = await this.getCurrentUser();
    const timestamp = nowIso();

    existing.status = newStatus;
    existing.updatedAt = timestamp;
    await this.put('reports', existing);

    await this.put('statusUpdates', {
      id: uid('st'),
      reportId: id,
      status: newStatus,
      note: note || `Status changed to ${newStatus}.`,
      actorName: user.name,
      createdAt: timestamp
    });

    return this.getReportById(id);
  }

  async deleteReport(id) {
    await this.delete('reports', id);
    const [photos, claims, saves, updates] = await Promise.all([
      this.getAllByIndex('photos', 'reportId', id),
      this.getAllByIndex('claims', 'reportId', id),
      this.getAllByIndex('saved', 'reportId', id),
      this.getAllByIndex('statusUpdates', 'reportId', id)
    ]);
    for (const p of photos) await this.delete('photos', p.id);
    for (const c of claims) await this.delete('claims', c.id);
    for (const s of saves) await this.delete('saved', s.id);
    for (const u of updates) await this.delete('statusUpdates', u.id);
    return true;
  }

  /* ---- Claim Service ---- */
  async createClaim({ reportId, message, proofDetails, claimantContact }) {
    const user = await this.getCurrentUser();
    const report = await this.get('reports', reportId);
    if (!report) throw new Error('Listing no longer exists.');
    const timestamp = nowIso();
    const claim = {
      id: uid('clm'),
      reportId,
      claimantId: user.id,
      claimantName: user.name,
      claimantContact: claimantContact.trim(),
      message: message.trim(),
      proofDetails: proofDetails.trim(),
      status: 'pending',
      isSample: false,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await this.put('claims', claim);
    await this.put('statusUpdates', {
      id: uid('st'),
      reportId,
      status: report.status,
      note: `New verification claim submitted by ${user.name}.`,
      actorName: user.name,
      createdAt: timestamp
    });
    return claim;
  }

  async updateClaimStatus(claimId, decision) {
    const claim = await this.get('claims', claimId);
    if (!claim) throw new Error('Claim not found.');
    const user = await this.getCurrentUser();
    const timestamp = nowIso();

    claim.status = decision; // 'approved' | 'rejected'
    claim.updatedAt = timestamp;
    await this.put('claims', claim);

    const report = await this.get('reports', claim.reportId);
    if (report) {
      if (decision === 'approved') {
        report.status = 'claimed';
        report.updatedAt = timestamp;
        await this.put('reports', report);
      }
      await this.put('statusUpdates', {
        id: uid('st'),
        reportId: claim.reportId,
        status: report.status,
        note: `Claim from ${claim.claimantName} was ${decision}.`,
        actorName: user.name,
        createdAt: timestamp
      });
    }
    return claim;
  }

  async listClaimsByUser(userId) {
    const [claims, reports] = await Promise.all([
      this.getAllByIndex('claims', 'claimantId', userId),
      this.getAll('reports')
    ]);
    const reportMap = new Map(reports.map((r) => [r.id, r]));
    return claims
      .map((c) => ({ ...c, report: reportMap.get(c.reportId) || null }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listIncomingClaims(ownerUserId) {
    const [myReports, allClaims] = await Promise.all([
      this.getAllByIndex('reports', 'userId', ownerUserId),
      this.getAll('claims')
    ]);
    const myReportMap = new Map(myReports.map((r) => [r.id, r]));
    return allClaims
      .filter((c) => myReportMap.has(c.reportId))
      .map((c) => ({ ...c, report: myReportMap.get(c.reportId) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /* ---- Saved Listings Service ---- */
  async getSavedIds(userId) {
    const rows = await this.getAllByIndex('saved', 'userId', userId);
    return rows.map((r) => r.reportId);
  }

  async toggleSaved(userId, reportId) {
    const key = `${userId}::${reportId}`;
    const existing = await this.get('saved', key);
    if (existing) {
      await this.delete('saved', key);
      return false;
    }
    await this.put('saved', { id: key, userId, reportId, createdAt: nowIso() });
    return true;
  }

  /* ---- Backup & Reset ---- */
  async resetDemoData() {
    await this.seedDemoData();
    return true;
  }

  async exportAllData() {
    const [users, reports, photos, claims, saved, statusUpdates] = await Promise.all([
      this.getAll('users'),
      this.getAll('reports'),
      this.getAll('photos'),
      this.getAll('claims'),
      this.getAll('saved'),
      this.getAll('statusUpdates')
    ]);
    return {
      exportedAt: nowIso(),
      appVersion: APP_CONFIG.VERSION,
      storageMode: APP_CONFIG.STORAGE_MODE,
      users,
      reports,
      photos,
      claims,
      saved,
      statusUpdates
    };
  }
}

/* ---------- Future Phase 2 Supabase Adapter Blueprint ---------- */
/* Implements the exact same interface so UI files need zero rewrites later. */
class SupabaseAdapter {
  constructor(config) {
    this.config = config;
  }

  _notReady() {
    throw new Error(
      'Supabase mode is reserved for Phase 2. Keep APP_CONFIG.STORAGE_MODE = "LOCAL" until supabase-schema.sql and public anon keys are configured.'
    );
  }

  async init() { this._notReady(); }
  async listUsers() { this._notReady(); }
  async getCurrentUser() { this._notReady(); }
  async switchUser() { this._notReady(); }
  async createUser() { this._notReady(); }
  async listReports() { this._notReady(); }
  async getReportById() { this._notReady(); }
  async createReport() { this._notReady(); }
  async updateReport() { this._notReady(); }
  async updateReportStatus() { this._notReady(); }
  async deleteReport() { this._notReady(); }
  async createClaim() { this._notReady(); }
  async updateClaimStatus() { this._notReady(); }
  async listClaimsByUser() { this._notReady(); }
  async listIncomingClaims() { this._notReady(); }
  async getSavedIds() { this._notReady(); }
  async toggleSaved() { this._notReady(); }
  async resetDemoData() { this._notReady(); }
  async exportAllData() { this._notReady(); }
}

const activeAdapter =
  APP_CONFIG.STORAGE_MODE === 'SUPABASE' && APP_CONFIG.SUPABASE.url && APP_CONFIG.SUPABASE.anonKey
    ? new SupabaseAdapter(APP_CONFIG.SUPABASE)
    : new IndexedDbAdapter();

export const dbApi = {
  getStorageInfo() {
    return {
      mode: APP_CONFIG.STORAGE_MODE,
      engine: APP_CONFIG.STORAGE_MODE === 'LOCAL' ? 'IndexedDB (Offline Local)' : 'Supabase Cloud',
      version: APP_CONFIG.VERSION
    };
  },
  init: () => activeAdapter.init(),
  listUsers: () => activeAdapter.listUsers(),
  getCurrentUser: () => activeAdapter.getCurrentUser(),
  switchUser: (id) => activeAdapter.switchUser(id),
  createUser: (data) => activeAdapter.createUser(data),
  listReports: (filters) => activeAdapter.listReports(filters),
  getReportById: (id) => activeAdapter.getReportById(id),
  createReport: (payload, photos) => activeAdapter.createReport(payload, photos),
  updateReport: (id, payload, photos) => activeAdapter.updateReport(id, payload, photos),
  updateReportStatus: (id, status, note) => activeAdapter.updateReportStatus(id, status, note),
  deleteReport: (id) => activeAdapter.deleteReport(id),
  createClaim: (payload) => activeAdapter.createClaim(payload),
  updateClaimStatus: (claimId, decision) => activeAdapter.updateClaimStatus(claimId, decision),
  listClaimsByUser: (userId) => activeAdapter.listClaimsByUser(userId),
  listIncomingClaims: (ownerId) => activeAdapter.listIncomingClaims(ownerId),
  getSavedIds: (userId) => activeAdapter.getSavedIds(userId),
  toggleSaved: (userId, reportId) => activeAdapter.toggleSaved(userId, reportId),
  resetDemoData: () => activeAdapter.resetDemoData(),
  exportAllData: () => activeAdapter.exportAllData()
};
