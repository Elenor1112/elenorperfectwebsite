// Maps a case-study client name to its logo in /public/assets/logos.
// Logos are normalized to a fixed on-disk box (see WorkGallery) so their
// original dimensions don't matter here — this is purely name → file.
//
// Lookup is by a NORMALIZED key (see `normalize`), not the raw client string,
// because the live CMS values drift from the canonical brand name — e.g.
// "Zoetis (Unofficial)", "Nemo Academy", "Rizq Law Firm". Normalizing both
// sides means those still resolve, and future CMS label tweaks won't silently
// drop a logo.
//
// Only case-study clients are listed; roster-only clients (IBSA Derma, VCC, …)
// have no logo and intentionally fall through to `null`, leaving their card
// unchanged.

// Lowercase, drop any parenthetical suffix ("(unofficial)"), drop common
// trailing descriptors, and reduce to alphanumerics so punctuation/spacing
// differences don't matter ("Al-Nesr Al-Jawhari" === "al nesr al jawhari").
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '') // "zoetis (unofficial)" → "zoetis "
    .replace(/\b(academy|law firm|hotels?|resort)\b/g, '') // trailing descriptors
    .replace(/[^a-z0-9]/g, ''); // collapse spaces/punctuation
}

// Keyed by the canonical brand name; both this key and the incoming client
// name are run through `normalize` before comparison.
const CLIENT_LOGOS: Record<string, string> = {
  MediConnect: 'mediconnect.png',
  'Al-Nesr Al-Jawhari': 'al-nesr-al-jawhari.png',
  Zoetis: 'zoetis.png',
  'Saint-Gobain': 'saint-gobain.png',
  Emaar: 'emaar.png',
  Duravit: 'duravit.png',
  'Al-Walid Horse Resort': 'al-walid-horse-resort.png',
  'Marcyrl Pharmaceutical': 'marcyrl-pharmaceutical.png',
  Marcyrl: 'marcyrl-pharmaceutical.png',
  "Kiro's Tours": 'kiros-tours.png',
  MMEC: 'mmec.png',
  'Coca-Cola': 'coca-cola.png',
  'Blend House': 'blend-house.png',
  DOTS: 'dots.png',
  Taza: 'taza.png',
  Sirgona: 'sirgona.png',
  Ericsson: 'ericsson.png',
  'Global Napi': 'global-napi.png',
  Pantogar: 'pantogar.png',
  Rizq: 'rizq.png',
  Simba: 'simba.png',
  'Icy Miray': 'icy-miray.png',
  Pfizer: 'pfizer.png',
  Nemo: 'nemo.png',
  'Pro-Sign': 'pro-sign.png',
  ROBEK: 'robek.png',
  'New Alex': 'new-alex.png',
  ICES: 'ices.png',
  AIESEC: 'aiesec.png',
  'Mental Joy': 'mental-joy.png',
  'Auto Group': 'auto-group.png',
  Videology: 'videology.png',
  CBRE: 'cbre.png',
  'Renaissance Hotel': 'renaissance-hotel.png',
};

// A few logos are white/light marks on transparency; on the default light logo
// chip they'd vanish. These get a dark chip instead so they stay visible.
const LIGHT_MARK_CLIENTS = new Set<string>(["Kiro's Tours", 'Renaissance Hotel']);

// Precomputed normalized lookups so a per-call normalize of every key isn't
// needed. Built once at module load.
const LOGO_BY_NORMALIZED = new Map(
  Object.entries(CLIENT_LOGOS).map(([name, file]) => [normalize(name), file]),
);
const LIGHT_MARK_NORMALIZED = new Set([...LIGHT_MARK_CLIENTS].map(normalize));

export type ClientLogo = {
  url: string;
  /** true → the mark is light and needs a dark chip behind it. */
  lightMark: boolean;
};

/** Logo descriptor for a client, or `null` when there's no matching asset. */
export function getClientLogo(client: string): ClientLogo | null {
  const key = normalize(client);
  const file = LOGO_BY_NORMALIZED.get(key);
  if (!file) return null;
  return {
    url: `/assets/logos/${file}`,
    lightMark: LIGHT_MARK_NORMALIZED.has(key),
  };
}
