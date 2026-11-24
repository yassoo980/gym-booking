// Change these to your business details
export const BRAND = 'Your Studio';
export const CURRENCY = 'EGP';
export const fmtDate = (iso) =>
  new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
