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
      eventDate: new Date
