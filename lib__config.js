// ===== EDIT THIS FILE to customise the site (no database changes needed) =====
export const BRAND = 'Your Studio';
export const CURRENCY = 'EGP';
export const TAGLINE = 'Train hard. Book easy.';
export const CONTACT = { phone: '', instagram: '', address: '' }; // shown in footer when filled

// Paste image URLs (or /images/x.jpg if you add files to a public folder). Empty = styled fallback.
export const IMAGES = {
  hero: '',
  classes: ['', '', ''],      // cards on the home page
  facilities: ['', '', '', ''],
  trainers: ['', '', ''],
};

// Hide any home page section with false
export const SECTIONS = { facilities: true, trainers: true, testimonials: true };

// SAMPLE CONTENT: replace with your real trainers, facilities and reviews before launch
export const FACILITIES = [
  { title: 'Private mini gym', text: 'Quiet, uncrowded and fully equipped.' },
  { title: 'Class hall', text: 'Open floor with mirrors and quality sound.' },
  { title: 'Changing rooms', text: 'Clean lockers and showers.' },
  { title: 'Recovery corner', text: 'Stretch, foam roll and cool down.' },
];
export const TRAINERS = [
  { name: 'Coach Name', role: 'Head coach' },
  { name: 'Coach Name', role: 'Yoga instructor' },
  { name: 'Coach Name', role: 'Kickboxing coach' },
];
export const TESTIMONIALS = [
  { name: 'Member name', text: 'Replace this with a real review from one of your members.' },
  { name: 'Member name', text: 'Replace this with a real review from one of your members.' },
  { name: 'Member name', text: 'Replace this with a real review from one of your members.' },
];

// Class categories are guessed from the class name. Add words to group your own classes.
export const CATEGORIES = [
  { name: 'Mind & Body', words: ['yoga', 'pilates', 'stretch', 'meditat', 'mobility'] },
  { name: 'Combat', words: ['kick', 'box', 'mma', 'muay', 'martial', 'self defense'] },
  { name: 'Strength', words: ['strength', 'crossfit', 'hiit', 'weight', 'bootcamp', 'circuit', 'functional'] },
  { name: 'Cardio & Dance', words: ['zumba', 'dance', 'cardio', 'spin', 'aerobic', 'run'] },
];
export const categoryOf = (n = '') => {
  const s = n.toLowerCase();
  return CATEGORIES.find((c) => c.words.some((w) => s.includes(w)))?.name || 'Other';
};

// ----- helpers -----
const L = 'en-GB';
export const fmtDate = (iso) => new Date(iso).toLocaleString(L, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtTime = (iso) => new Date(iso).toLocaleTimeString(L, { hour: '2-digit', minute: '2-digit' });
export const dayKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const dayParts = (key) => {
  const [y, m, d] = key.split('-').map(Number); const dt = new Date(y, m - 1, d);
  return { wd: dt.toLocaleDateString(L, { weekday: 'short' }), d, mo: dt.toLocaleDateString(L, { month: 'short' }), full: dt.toLocaleDateString(L, { weekday: 'long', day: 'numeric', month: 'long' }) };
};
export const slotOf = (iso) => { const h = new Date(iso).getHours(); return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'; };
export const featuresOf = (p) => (p.description || '').split(/\n|•|;|\|/).map((s) => s.trim()).filter(Boolean);
export const isAnnual = (p) => /year|annual|12/i.test(p.period || '');
