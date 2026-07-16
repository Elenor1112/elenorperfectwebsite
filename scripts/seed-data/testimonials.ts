type Testimonial = { quote: string; author: string; role: string; company: string };

// PLACEHOLDER COPY — no approved client quotes exist yet. Replace quote,
// author, and role with real, client-approved wording before production
// launch (same caveat as the NAP data in site.ts). Companies are drawn from
// the real featured-client list.
export const testimonials: Testimonial[] = [
  {
    quote:
      'Elenor rebuilt our brand identity end to end — and the guidelines are clear enough that every regional team actually uses them.',
    author: 'Marketing Lead',
    role: 'Brand & Communications',
    company: 'Saint-Gobain',
  },
  {
    quote:
      'From the first storyboard to the final cut, the video team treated our launch like it was their own product on the line.',
    author: 'Communications Manager',
    role: 'Product Marketing',
    company: 'Duravit',
  },
  {
    quote:
      'They run our social channels with real editorial judgment — not a content calendar on autopilot. Engagement has never been higher.',
    author: 'Digital Lead',
    role: 'Digital Marketing',
    company: 'Mediconnect',
  },
  {
    quote:
      'The event they staged for our dealer network was flawless — logistics, staging, motion graphics on screen, all one team.',
    author: 'Events Coordinator',
    role: 'Trade Marketing',
    company: 'Zoetis',
  },
  {
    quote:
      'Our new booking site went from brief to launch in weeks, and it finally looks like the experience we sell.',
    author: 'Operations Director',
    role: 'Management',
    company: "Kiro's Tours",
  },
];
