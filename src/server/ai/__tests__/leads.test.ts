import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractLead, hasLeadSignal, mergeLead } from '../leads/extractor';
import { scoreBand, scoreLead } from '../leads/scoring';

describe('extractLead', () => {
  it('returns nothing for an empty conversation', () => {
    assert.deepEqual(extractLead([]), {});
    assert.deepEqual(extractLead(['   ']), {});
  });

  it('extracts an email address', () => {
    const lead = extractLead(['You can reach me at Sara.Ali@Example.com']);
    assert.equal(lead.email, 'sara.ali@example.com');
  });

  it('extracts an international phone number', () => {
    const lead = extractLead(['Call me on +20 120 113 7373']);
    assert.equal(lead.phone, '+201201137373');
  });

  it('does not mistake a price or a year for a phone number', () => {
    const lead = extractLead(['Our budget is around 25000 and we started in 2021']);
    assert.equal(lead.phone, undefined);
  });

  it('extracts a name from a self-introduction', () => {
    assert.equal(extractLead(['Hi, my name is Omar Hassan']).name, 'Omar Hassan');
  });

  it('does not treat "I\'m looking for…" as a name', () => {
    assert.equal(extractLead(["I'm looking for a new website"]).name, undefined);
  });

  it('extracts a company name', () => {
    assert.equal(extractLead(['I work at Marcyrl Pharmaceuticals']).company, 'Marcyrl Pharmaceuticals');
  });

  it('extracts a website but ignores the agency’s own domain', () => {
    assert.equal(extractLead(['our site is acmecorp.com']).website, 'acmecorp.com');
    assert.equal(extractLead(['I found you on elenor-marketing.com']).website, undefined);
  });

  it('extracts a budget', () => {
    assert.match(extractLead(['our budget is $50,000']).budget ?? '', /50,000/);
  });

  it('extracts a timeline', () => {
    assert.match(extractLead(['we need this ASAP']).timeline ?? '', /asap/i);
    assert.match(extractLead(['within 3 weeks please']).timeline ?? '', /within\s+3\s*weeks/i);
  });

  it('maps vocabulary to canonical service names', () => {
    const lead = extractLead(['We need a rebrand and an online store']);
    assert.ok(lead.servicesInterested?.includes('Brand Identity'));
    assert.ok(lead.servicesInterested?.includes('Web & App Development'));
  });

  it('detects an industry', () => {
    assert.equal(extractLead(['We are a dental clinic']).industry, 'Healthcare & Pharma');
  });

  it('uses the first substantive message as the project summary', () => {
    const lead = extractLead(['hi', 'We want to redesign our corporate website and brand identity']);
    assert.match(lead.projectSummary ?? '', /redesign our corporate website/);
  });

  it('gathers details spread across several messages', () => {
    const lead = extractLead([
      'We need a new brand identity',
      'Budget is about $30,000',
      'Reach me at hello@acme.io',
    ]);
    assert.equal(lead.email, 'hello@acme.io');
    assert.ok(lead.budget);
    assert.ok(lead.servicesInterested?.includes('Brand Identity'));
  });
});

describe('hasLeadSignal', () => {
  it('is true when contact details exist', () => {
    assert.equal(hasLeadSignal({ email: 'a@b.com' }), true);
    assert.equal(hasLeadSignal({ phone: '+201201137373' }), true);
  });

  it('is false for a browsing visitor with no identifying details', () => {
    assert.equal(hasLeadSignal({ servicesInterested: ['SEO'] }), false);
    assert.equal(hasLeadSignal({}), false);
  });
});

describe('mergeLead', () => {
  it('keeps an earlier value when the newer extraction has none', () => {
    const merged = mergeLead({ email: 'a@b.com' }, { company: 'Acme' });
    assert.equal(merged.email, 'a@b.com');
    assert.equal(merged.company, 'Acme');
  });

  it('lets a newer value win', () => {
    assert.equal(mergeLead({ budget: '$5,000' }, { budget: '$40,000' }).budget, '$40,000');
  });

  it('unions the services of interest', () => {
    const merged = mergeLead(
      { servicesInterested: ['SEO'] },
      { servicesInterested: ['SEO', 'Brand Identity'] },
    );
    assert.deepEqual(merged.servicesInterested?.sort(), ['Brand Identity', 'SEO']);
  });

  it('never overwrites a value with an empty one', () => {
    assert.equal(mergeLead({ email: 'a@b.com' }, { email: '' }).email, 'a@b.com');
  });
});

describe('scoreLead', () => {
  it('scores an anonymous browser at zero', () => {
    assert.equal(scoreLead({}).score, 0);
  });

  it('weights a reachable contact above a detailed but anonymous brief', () => {
    const reachable = scoreLead({ email: 'a@b.com' }).score;
    const anonymous = scoreLead({
      projectSummary: Array.from({ length: 50 }, () => 'word').join(' '),
    }).score;
    assert.ok(reachable > anonymous);
  });

  it('scores a large budget higher than a small one', () => {
    assert.ok(scoreLead({ budget: '$60,000' }).score > scoreLead({ budget: '$2,000' }).score);
  });

  it('scores an urgent timeline higher than a vague one', () => {
    assert.ok(
      scoreLead({ timeline: 'asap' }).score > scoreLead({ timeline: 'by december' }).score,
    );
  });

  it('rewards multi-service enquiries', () => {
    const many = scoreLead({ servicesInterested: ['SEO', 'Brand Identity', 'Video Production'] });
    const one = scoreLead({ servicesInterested: ['SEO'] });
    assert.ok(many.score > one.score);
  });

  it('caps the score at 100', () => {
    const score = scoreLead({
      name: 'A',
      email: 'a@b.com',
      phone: '+201201137373',
      company: 'Acme',
      website: 'acme.com',
      industry: 'Technology',
      budget: '$500,000',
      timeline: 'asap',
      servicesInterested: ['SEO', 'Brand Identity', 'Web & App Development'],
      projectSummary: Array.from({ length: 60 }, () => 'word').join(' '),
    }).score;
    assert.equal(score, 100);
  });

  it('produces an auditable breakdown that sums to the score', () => {
    const { score, breakdown } = scoreLead({ email: 'a@b.com', company: 'Acme' });
    assert.equal(
      breakdown.reduce((sum, factor) => sum + factor.points, 0),
      score,
    );
    assert.ok(breakdown.every((factor) => factor.factor.length > 0));
  });

  it('treats EGP amounts on a comparable scale to USD', () => {
    // 1,000,000 EGP ≈ $20k, so it should not outrank a $60k budget.
    const egp = scoreLead({ budget: '1,000,000 EGP' }).score;
    const usd = scoreLead({ budget: '$60,000' }).score;
    assert.ok(egp < usd);
  });
});

describe('scoreBand', () => {
  it('bands scores for the dashboard', () => {
    assert.equal(scoreBand(75), 'hot');
    assert.equal(scoreBand(45), 'warm');
    assert.equal(scoreBand(10), 'cool');
  });
});
