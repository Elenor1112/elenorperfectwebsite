import type { ExtractedLead } from './extractor';

/**
 * Transparent, rule-based lead scoring.
 *
 * Every point is attributed to a named factor and stored alongside the score,
 * so sales can see *why* a lead ranks where it does instead of trusting an
 * opaque number. Weights live in one table to keep tuning a data change.
 */

export type ScoreFactor = { factor: string; points: number };
export type LeadScore = { score: number; breakdown: ScoreFactor[] };

const MAX_SCORE = 100;

/** Rough budget tiers in USD-equivalent; EGP amounts are scaled down. */
function parseBudgetValue(budget: string): number | null {
  const text = budget.toLowerCase();
  const match = text.match(/([\d][\d,.]*)\s*(k|m|thousand|million)?/);
  if (!match) return null;

  let value = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;

  const suffix = match[2];
  if (suffix === 'k' || suffix === 'thousand') value *= 1_000;
  if (suffix === 'm' || suffix === 'million') value *= 1_000_000;

  // Treat EGP figures as ~1/50 of a USD figure so tiers stay comparable.
  if (/egp|le\b|جنيه/.test(text)) value /= 50;
  return value;
}

function budgetPoints(budget: string): ScoreFactor | null {
  const value = parseBudgetValue(budget);
  if (value === null) return { factor: 'Budget mentioned', points: 10 };
  if (value >= 50_000) return { factor: 'Budget ≥ $50k', points: 30 };
  if (value >= 20_000) return { factor: 'Budget $20k–50k', points: 25 };
  if (value >= 5_000) return { factor: 'Budget $5k–20k', points: 18 };
  if (value >= 1_000) return { factor: 'Budget $1k–5k', points: 10 };
  return { factor: 'Budget under $1k', points: 4 };
}

const URGENT_RE = /\b(asap|urgent|immediately|right away|this week)\b/i;
const NEAR_TERM_RE = /\b(this month|next month|within\s+(?:[1-8])\s*weeks?|in\s+(?:[1-2])\s*months?)\b/i;

function timelinePoints(timeline: string): ScoreFactor {
  if (URGENT_RE.test(timeline)) return { factor: 'Urgent timeline', points: 15 };
  if (NEAR_TERM_RE.test(timeline)) return { factor: 'Near-term timeline', points: 10 };
  return { factor: 'Timeline given', points: 6 };
}

/**
 * Scores a lead out of 100.
 *
 * Contact reachability is weighted highest — a detailed brief the team cannot
 * follow up on is worth less than a short one with an email address.
 */
export function scoreLead(lead: ExtractedLead): LeadScore {
  const breakdown: ScoreFactor[] = [];

  if (lead.email) breakdown.push({ factor: 'Email provided', points: 20 });
  if (lead.phone) breakdown.push({ factor: 'Phone provided', points: 12 });
  if (lead.name) breakdown.push({ factor: 'Name provided', points: 5 });

  if (lead.company) breakdown.push({ factor: 'Company named', points: 10 });
  if (lead.website) breakdown.push({ factor: 'Business website', points: 8 });
  if (lead.industry) breakdown.push({ factor: 'Industry identified', points: 5 });

  if (lead.budget) {
    const points = budgetPoints(lead.budget);
    if (points) breakdown.push(points);
  }
  if (lead.timeline) breakdown.push(timelinePoints(lead.timeline));

  const services = lead.servicesInterested?.length ?? 0;
  if (services === 1) {
    breakdown.push({ factor: 'Service identified', points: 8 });
  } else if (services > 1) {
    // Multi-service enquiries are larger engagements.
    breakdown.push({ factor: `${services} services of interest`, points: 14 });
  }

  const summaryWords = lead.projectSummary?.trim().split(/\s+/).length ?? 0;
  if (summaryWords >= 40) {
    breakdown.push({ factor: 'Detailed project brief', points: 10 });
  } else if (summaryWords >= 15) {
    breakdown.push({ factor: 'Project described', points: 5 });
  }

  const total = breakdown.reduce((sum, item) => sum + item.points, 0);
  return { score: Math.min(MAX_SCORE, total), breakdown };
}

/** Coarse band used for dashboard filters and badge colours. */
export function scoreBand(score: number): 'hot' | 'warm' | 'cool' {
  if (score >= 60) return 'hot';
  if (score >= 30) return 'warm';
  return 'cool';
}
