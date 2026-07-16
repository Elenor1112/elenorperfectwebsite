// Canonical site configuration — single source of truth for NAP, schema, and UI.
// NOTE: confirm NAP (Nasr City vs Ard El-Golf), hours, and founding year against
// the live Google Business Profile before production launch.

export const site = {
  name: 'Elenor Marketing Agency',
  shortName: 'Elenor',
  tagline: 'Where Innovation Meets Quality',
  url: 'https://elenor-marketing.com',
  foundingYear: 2021,
  description:
    'A full-service marketing and brand agency in Cairo, Egypt — brand identity, social media, video & motion, events, printing, web & app development, and interior design.',
  email: 'info@elenor-marketing.com',
  phone: '+201201137373',
  phoneDisplay: '+20 120 113 7373',
  whatsapp: 'https://wa.me/201201137373',
  address: {
    street: '28 Mohamed Abdel Hady Street',
    locality: 'Nasr City',
    region: 'Cairo',
    country: 'EG',
    countryName: 'Egypt',
  },
  hours: {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    opens: '10:00',
    closes: '18:00',
  },
  founder: { name: 'Emad Samir', jobTitle: 'CEO & Founder' },
  social: {
    facebook: 'https://www.facebook.com/elenor.marketing',
    instagram: 'https://www.instagram.com/elenor.marketing/',
    linkedin: 'https://www.linkedin.com/company/elenor-marketing-agency',
    tiktok: 'https://www.tiktok.com/@elenor.marketing',
    youtube: 'https://www.youtube.com/@elenormarketing6394',
  },
} as const;

export const sameAs = Object.values(site.social);

export const stats = [
  { value: 50, suffix: '+', label: 'Satisfied Clients' },
  { value: 100, suffix: '+', label: 'Successful Projects' },
  { value: 300, suffix: '+', label: 'Days of Active Operation' },
  { value: 10, suffix: '', label: 'Core Services' },
] as const;

// Strongest, most recognizable client names — capped per the brief (don't dump 50).
export const featuredClients = [
  'Coca-Cola',
  'Saint-Gobain',
  'Duravit',
  'Zoetis',
  'Emaar',
  'ICES',
  'Mediconnect',
  'Marcyrl',
  'IBSA Derma',
  'MMEC',
  'Al-Nesr Al-Jawhari',
  'Videology',
  "Kiro's Tours",
  'H&Z Law Firm',
  'Al-Walid Horse Resort',
  'Pro-Sign',
] as const;
