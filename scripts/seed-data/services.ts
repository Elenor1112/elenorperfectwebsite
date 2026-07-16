// Service catalogue — drives the services hub, individual pages, JSON-LD Service
// schema, the home rail, and the navigation. Copy is SEO/GEO/AEO-ready per brief §8.3.

export type FAQ = { q: string; a: string };

export type Service = {
  slug: string;
  title: string; // <title> page topic
  name: string; // H1 / display
  short: string; // one-line for cards/rail
  metaDescription: string;
  lede: string; // 40–60 word direct-answer paragraph
  included: string[];
  process: string[];
  proof: string[]; // named client proof points
  faq: FAQ[];
  accent: 'brand' | 'cyan' | 'amber';
};

export const services: Service[] = [
  {
    slug: 'brand-identity',
    title: 'Brand Identity Design',
    name: 'Brand Identity',
    short: 'Logos, guidelines, and the full visual system that holds a brand together.',
    metaDescription:
      'Elenor Marketing builds complete brand identities in Cairo — logo design, brand guidelines, mission/vision, slogan, and collateral templates for startups and enterprises.',
    lede: 'Your brand identity is more than a logo — it is the full creation of your visual mark, mission and vision statements, slogan, and the design system that holds it all together consistently across every touchpoint.',
    included: [
      'Logo design and visual mark',
      'Complete brand guidelines document',
      'Mission, vision & values development',
      'Slogan & core messaging',
      'Brand collateral templates and source files',
    ],
    process: ['Discovery & research', 'Concept directions', 'Refinement', 'Guideline system', 'Handover with source files'],
    proof: ['Al-Nesr Al-Jawhari', "Kiro's Tours"],
    faq: [
      { q: 'How long does a full brand identity take?', a: 'A complete brand identity typically takes 3–6 weeks depending on the number of concept rounds and the breadth of collateral required.' },
      { q: 'Do you offer rebrands for existing businesses, not just startups?', a: 'Yes. We handle full rebrands and identity refreshes for established businesses as well as ground-up identities for new ventures.' },
      { q: 'What do I receive at the end of the project?', a: 'You receive a full brand guideline document, editable source files, and ready-to-use collateral templates.' },
    ],
    accent: 'brand',
  },
  {
    slug: 'social-media',
    title: 'Social Media Marketing',
    name: 'Social Media',
    short: 'End-to-end strategy, content, design, and paid campaigns across every platform.',
    metaDescription:
      'Full social media management for Zoetis, Saint-Gobain, Marcyrl, IBSA Derma, and more — strategy, content, design, and paid campaigns across Facebook, Instagram, LinkedIn, and TikTok.',
    lede: 'We manage end-to-end social media presence — strategy, content calendars, graphic design, motion content, and paid campaigns — across Facebook, Instagram, YouTube, LinkedIn, and TikTok, for clients including Zoetis, Saint-Gobain, Marcyrl, and Mediconnect.',
    included: [
      'Monthly content strategy & calendar',
      'Graphic design and motion graphics for posts',
      'Community management',
      'Paid social campaign setup & optimization',
      'Monthly performance reporting',
    ],
    process: ['Brand & audience audit', 'Content strategy', 'Production', 'Scheduling & community management', 'Reporting & iteration'],
    proof: ['Zoetis', 'Saint-Gobain', 'IBSA Derma'],
    faq: [
      { q: "What's included in a monthly social media retainer?", a: 'A monthly retainer covers content strategy and calendar, graphic and motion design, community management, paid campaign management, and a monthly performance report.' },
      { q: 'Which platforms do you manage?', a: 'Facebook, Instagram, YouTube, LinkedIn, and TikTok — chosen per brand based on where the audience actually is.' },
      { q: 'Do you handle paid ads as well as organic content?', a: 'Yes — we set up, run, and optimize paid social campaigns alongside organic content.' },
    ],
    accent: 'cyan',
  },
  {
    slug: 'web-app-development',
    title: 'Web & App Development',
    name: 'Web & App Development',
    short: 'Fast, mobile-first websites and apps built around usability and load speed.',
    metaDescription:
      'Elenor builds fast, mobile-first websites and apps for clients including MMEC, Al-Nesr Al-Jawhari, Mediconnect, and Al-Walid Horse Resort — user-friendly, simple, built to load fast.',
    lede: 'Since mobile devices drive most traffic, we design and build websites and applications around three non-negotiables: clean usability, simple navigation, and fast load times. We have shipped projects for MMEC, Al-Nesr Al-Jawhari, Videology, Mediconnect, and Al-Walid Horse Resort.',
    included: [
      'Custom website design & development',
      'Mobile app development (iOS / Android)',
      'E-commerce builds',
      'UX / UI design',
      'Ongoing maintenance & hosting support',
      'SEO-ready technical foundations on every build',
    ],
    process: ['Discovery & requirements', 'Wireframes & UX', 'Design', 'Development', 'QA & launch', 'Post-launch support'],
    proof: ['MMEC', 'Mediconnect', 'Al-Walid Horse Resort'],
    faq: [
      { q: 'How long does a custom website take?', a: 'A typical custom website takes 4–8 weeks depending on scope, the number of templates, and any custom integrations.' },
      { q: 'Do you build both the website and the app for a brand?', a: 'Yes — we handle web and native/cross-platform app development under one team so the brand experience stays consistent.' },
      { q: 'Do you offer ongoing maintenance after launch?', a: 'Yes. We provide ongoing maintenance, hosting support, and iterative improvements after launch.' },
    ],
    accent: 'brand',
  },
  {
    slug: 'video-production',
    title: 'Video Production',
    name: 'Video Production',
    short: 'Concept-to-edit video for factories, products, and brand campaigns.',
    metaDescription:
      'Elenor produces brand, product, and factory video in Cairo — concept, scripting, filming, editing, voiceover, and motion graphics integration, delivered end-to-end.',
    lede: 'We document and produce video content for factories, products, and brand campaigns — from concept and scripting through filming, professional editing, voiceover, and sound design, delivered as one finished piece.',
    included: ['Concept & scripting', 'On-location filming', 'Professional editing', 'Voiceover & sound design', 'Motion graphics integration'],
    process: ['Concept', 'Script', 'Shoot', 'Edit', 'Final delivery'],
    proof: ['Saint-Gobain', 'Duravit'],
    faq: [
      { q: 'Do you film on-location at our factory or office?', a: 'Yes — on-location filming at factories, offices, and event venues is a core part of our video work.' },
      { q: 'Do you write the script, or do we provide it?', a: 'Either. We can write the full script and concept, or refine and shoot from a script you provide.' },
      { q: "What's the typical delivery timeline for a brand video?", a: 'Most brand videos are delivered within 2–4 weeks of the shoot, depending on length and edit complexity.' },
    ],
    accent: 'amber',
  },
  {
    slug: 'ai-motion-graphics',
    title: 'AI & Motion Graphics',
    name: 'AI & Motion Graphics',
    short: 'AI-powered visuals, animated ads, explainers, and motion branding that capture attention.',
    metaDescription:
      'Elenor blends AI-powered visuals with motion graphics in Cairo — animated social ads, explainer and product animations, and motion branding delivered in every format.',
    lede: 'Motion graphics play a critical role in capturing attention and promoting products or services — and we pair them with AI-powered visual production to move faster and push creative further across social ads, explainer content, and brand campaigns.',
    included: ['AI-generated visuals & concept art', 'Animated social ads', 'Explainer & product animations', 'Motion branding (intros / outros)', 'Multi-format delivery (square, vertical, widescreen)'],
    process: ['Brief & style', 'Storyboard', 'Animation', 'Sound', 'Delivery'],
    proof: ['Zoetis', 'Marcyrl'],
    faq: [
      { q: 'What style do you animate in?', a: 'We adapt to your brand — from clean corporate 2D to bold kinetic typography and product-led animation.' },
      { q: 'Can motion graphics be paired with our existing brand video footage?', a: 'Yes — we integrate motion graphics directly into existing footage or build standalone animated pieces.' },
      { q: 'What formats do you deliver?', a: 'Square, vertical, and widescreen, optimized per platform.' },
    ],
    accent: 'cyan',
  },
  {
    slug: 'event-planning',
    title: 'Event Planning',
    name: 'Event Planning',
    short: 'Full event logistics, staffing, giveaways, and on-site content capture.',
    metaDescription:
      'Elenor manages corporate events, launches, and retail openings in Egypt — venue coordination, ushers and hosts, branded giveaways, and on-site photo/video capture.',
    lede: 'We manage every aspect of your event — venue coordination, ushers and hosts, branded giveaways, and on-site photography and videography — so your brand shows up polished from setup to wrap.',
    included: ['Full event logistics', 'Staffing (ushers / hosts)', 'Branded giveaways', 'On-site photo & video capture'],
    process: ['Brief', 'Planning & logistics', 'Staffing', 'On-site execution', 'Content delivery'],
    proof: ['Emaar', 'ICES'],
    faq: [
      { q: 'What types of events do you handle?', a: 'Product launches, corporate events, conferences, and retail openings — full logistics and on-site execution.' },
      { q: 'Do you provide event staff?', a: 'Yes — we supply trained ushers and hosts as part of the event package.' },
      { q: 'How far in advance should we book?', a: 'For a polished result we recommend booking 4–8 weeks ahead, more for large launches.' },
    ],
    accent: 'amber',
  },
  {
    slug: 'printing-production',
    title: 'Printing & Production',
    name: 'Printing & Production',
    short: 'Billboards, posters, booths, and flyers — design through final installation.',
    metaDescription:
      'Elenor manages printing and production in Cairo — large-format billboards, posters, booths, and flyers from design through final installation, matched to your brand.',
    lede: 'Printing is still essential in a digital world. We manage the full production process for billboards, posters, booths, and flyers — from design through final installation, matched exactly to your brand guidelines.',
    included: ['Large-format printing', 'Billboard production', 'In-store / POS materials', 'Booth & event signage'],
    process: ['Design', 'Proofing', 'Production', 'Installation'],
    proof: ['Coca-Cola', 'Saint-Gobain'],
    faq: [
      { q: "What's the typical turnaround for printed materials?", a: 'Most standard print jobs turn around in 3–7 working days; large-format and billboard work depends on placement scheduling.' },
      { q: 'Do you handle billboard placement, or just production?', a: 'We handle both production and placement coordination for outdoor and large-format work.' },
      { q: 'Can you match our existing brand guidelines exactly?', a: 'Yes — colour matching and brand-consistent finishing are standard on every job.' },
    ],
    accent: 'brand',
  },
  {
    slug: 'giveaways',
    title: 'Giveaways',
    name: 'Giveaways',
    short: 'Custom branded giveaways designed as a real extension of your identity.',
    metaDescription:
      'Elenor designs and produces custom branded giveaways and corporate gifts in Egypt — bespoke merchandise and event gift kits built as an extension of your brand.',
    lede: 'We design and produce creative branded giveaways — built with a custom touch, not off-the-shelf — as a genuine extension of your brand identity for events, launches, and client gifting.',
    included: ['Custom giveaway design & sourcing', 'Branded merchandise', 'Event / launch gift kits'],
    process: ['Concept', 'Sourcing', 'Branding', 'Production', 'Delivery'],
    proof: ['Duravit', 'Emaar'],
    faq: [
      { q: 'Do you handle bulk production for large events?', a: 'Yes — we manage bulk sourcing and production for large events and launches.' },
      { q: 'Can gifts be customized per client or industry?', a: 'Every gift kit is designed around the client and industry, not pulled from a generic catalogue.' },
      { q: "What's the minimum order quantity?", a: 'Minimums vary by item; we scope this during sourcing based on your budget and timeline.' },
    ],
    accent: 'amber',
  },
  {
    slug: 'interior-design',
    title: 'Interior Design',
    name: 'Interior Design',
    short: 'Creative, brand-aligned interior design for retail, office, and hospitality.',
    metaDescription:
      'Elenor delivers brand-aligned interior design in Egypt for retail, office, and hospitality spaces — space planning, concept design, finishes, and contractor coordination.',
    lede: 'We are not an architecture firm — but we deliver interior design with real creative and technical solutions tailored to your space, whether retail, office, or hospitality, so the physical space reflects the brand.',
    included: ['Space planning', 'Concept design', 'Material & finish selection', 'Project coordination with contractors'],
    process: ['Brief', 'Concept', 'Material selection', 'Coordination', 'Delivery'],
    proof: ['Al-Walid Horse Resort', 'Emaar'],
    faq: [
      { q: 'What types of spaces do you design?', a: 'Retail, office, and F&B / hospitality spaces — designed to carry the brand into the physical environment.' },
      { q: 'Do you coordinate construction, or only design?', a: 'We design and coordinate with contractors through delivery, though we are not the architecture or construction firm of record.' },
      { q: 'How does interior design connect to our broader brand identity?', a: 'We treat the space as a brand touchpoint, carrying your visual identity, colour, and tone into the built environment.' },
    ],
    accent: 'brand',
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);
