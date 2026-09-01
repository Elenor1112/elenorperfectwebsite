/**
 * Deterministic lead extraction.
 *
 * Runs on the visitor's own messages only — never on assistant output, so the
 * model cannot hallucinate a lead into existence. Pattern-based rather than
 * LLM-based because it must be cheap enough to run on every turn, predictable
 * enough to audit, and must not add latency to the response stream.
 *
 * Pure and dependency-free so it is directly unit-testable.
 */

export type ExtractedLead = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  industry?: string;
  budget?: string;
  timeline?: string;
  projectSummary?: string;
  servicesInterested?: string[];
};

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
// Deliberately conservative: 8+ digits with optional separators, so prices and
// years are not misread as phone numbers.
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]{1,}\.(?:com|net|org|io|co|eg|ai|dev|app|shop|store|me)(?:\.[a-z]{2})?)\b/i;

const NAME_RE =
  /\b(?:my name is|i am|i'm|this is|it's)\s+([A-Z][a-z'’-]{1,20}(?:\s+[A-Z][a-z'’-]{1,20}){0,2})\b/;
const COMPANY_RE =
  /\b(?:i(?:'m| am)? (?:from|with|at)|we(?:'re| are)|company (?:is|called)|work (?:for|at)|представ)\s+([A-Z][\w&'’.-]*(?:\s+[A-Z][\w&'’.-]*){0,3})\b/;

/** Currency amounts and common budget phrasings. */
const BUDGET_RE =
  /(?:\$|usd|eur|egp|le\b|budget(?:\s+is|\s+of|:)?\s*)\s*([\d][\d,.]*\s*(?:k|m|thousand|million)?(?:\s*(?:-|–|to)\s*[\d][\d,.]*\s*(?:k|m|thousand|million)?)?)/i;

const TIMELINE_RE =
  /\b(asap|urgent(?:ly)?|immediately|right away|this (?:week|month|quarter)|next (?:week|month|quarter|year)|within\s+\d+\s*(?:days?|weeks?|months?)|in\s+\d+\s*(?:days?|weeks?|months?)|by\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|q[1-4])|\d+\s*(?:days?|weeks?|months?)\s+(?:timeline|deadline))\b/i;

/** Service vocabulary → canonical name shown in the admin UI. */
const SERVICE_KEYWORDS: [RegExp, string][] = [
  [/\b(brand(?:ing)?|identity|logo|rebrand)\b/i, 'Brand Identity'],
  [/\b(social media|instagram|facebook|tiktok|linkedin|content calendar)\b/i, 'Social Media'],
  [/\b(seo|search engine|ranking|organic traffic)\b/i, 'SEO'],
  [/\b(web(?:site)?|web app|landing page|ecommerce|e-commerce|online store|shopify)\b/i, 'Web & App Development'],
  [/\b(mobile app|ios|android|flutter|react native)\b/i, 'Web & App Development'],
  [/\b(video|motion|animation|film|reel)\b/i, 'Video Production'],
  [/\b(print(?:ing)?|packaging|brochure|flyer|production)\b/i, 'Printing & Production'],
  [/\b(event|booth|exhibition|conference|activation)\b/i, 'Event Planning'],
  [/\b(interior|fit ?out|showroom|space design)\b/i, 'Interior Design'],
  [/\b(giveaway|merch(?:andise)?|corporate gift)\b/i, 'Giveaways'],
  [/\b(ad(?:vertising|s)?|campaign|media buying|ppc|google ads)\b/i, 'Advertising'],
];

const INDUSTRY_KEYWORDS: [RegExp, string][] = [
  [/\b(pharma(?:ceutical)?|medical|health ?care|clinic|hospital|dental)\b/i, 'Healthcare & Pharma'],
  [/\b(real ?estate|property|developer|compound)\b/i, 'Real Estate'],
  [/\b(restaurant|f\s?&\s?b|food|beverage|cafe|coffee)\b/i, 'Food & Beverage'],
  [/\b(fashion|apparel|clothing|retail|boutique)\b/i, 'Retail & Fashion'],
  [/\b(fintech|bank(?:ing)?|insurance|financial services)\b/i, 'Finance'],
  [/\b(tech(?:nology)?|software|saas|startup|ai company)\b/i, 'Technology'],
  [/\b(education|school|university|academy|training)\b/i, 'Education'],
  [/\b(tourism|travel|hotel|resort|hospitality)\b/i, 'Travel & Hospitality'],
  [/\b(manufactur(?:ing|er)|industrial|factory|construction)\b/i, 'Industrial'],
];

function cleanPhone(raw: string): string | undefined {
  const digits = raw.replace(/[^\d+]/g, '');
  // 8–15 digits covers international formats without matching amounts/years.
  const count = digits.replace(/\D/g, '').length;
  return count >= 8 && count <= 15 ? digits : undefined;
}

function matchAll(text: string, table: [RegExp, string][]): string[] {
  const found = new Set<string>();
  for (const [pattern, label] of table) {
    if (pattern.test(text)) found.add(label);
  }
  return [...found];
}

/** Extracts whatever the visitor has revealed across their own messages. */
export function extractLead(userMessages: string[]): ExtractedLead {
  const joined = userMessages.join('\n');
  if (!joined.trim()) return {};

  const lead: ExtractedLead = {};

  const email = joined.match(EMAIL_RE)?.[0];
  if (email) lead.email = email.toLowerCase();

  const phoneRaw = joined.match(PHONE_RE)?.[0];
  if (phoneRaw) {
    const phone = cleanPhone(phoneRaw);
    if (phone) lead.phone = phone;
  }

  const name = joined.match(NAME_RE)?.[1];
  // "I'm looking for…" shouldn't become the name "Looking".
  if (name && !/^(looking|interested|trying|wondering|asking|hoping)/i.test(name)) {
    lead.name = name.trim();
  }

  const company = joined.match(COMPANY_RE)?.[1];
  if (company && company.length > 1) lead.company = company.trim();

  const website = joined.match(URL_RE)?.[1];
  // The agency's own domain in a link is not the visitor's website.
  if (website && !/elenor/i.test(website)) {
    lead.website = website.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }

  const budget = joined.match(BUDGET_RE)?.[0];
  if (budget) lead.budget = budget.trim().replace(/\s+/g, ' ');

  const timeline = joined.match(TIMELINE_RE)?.[0];
  if (timeline) lead.timeline = timeline.trim();

  const services = matchAll(joined, SERVICE_KEYWORDS);
  if (services.length > 0) lead.servicesInterested = services;

  const industries = matchAll(joined, INDUSTRY_KEYWORDS);
  if (industries.length > 0) lead.industry = industries[0];

  // First substantive message doubles as the project summary.
  const summary = userMessages.find((m) => m.trim().split(/\s+/).length >= 6);
  if (summary) lead.projectSummary = summary.trim().slice(0, 500);

  return lead;
}

/** True when there is enough signal to be worth persisting as a lead. */
export function hasLeadSignal(lead: ExtractedLead): boolean {
  return Boolean(
    lead.email ||
      lead.phone ||
      lead.company ||
      lead.website ||
      lead.budget ||
      (lead.timeline && lead.servicesInterested?.length),
  );
}

/** Later turns win, but a previously captured value is never overwritten with
 *  nothing — visitors rarely repeat their email. */
export function mergeLead(existing: ExtractedLead, incoming: ExtractedLead): ExtractedLead {
  const merged: ExtractedLead = { ...existing };
  for (const [key, value] of Object.entries(incoming) as [keyof ExtractedLead, unknown][]) {
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      continue;
    }
    if (key === 'servicesInterested') {
      const union = new Set([...(existing.servicesInterested ?? []), ...(value as string[])]);
      merged.servicesInterested = [...union];
    } else {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}
