// Single source of truth for site content.
// Edit this file to update the site. JSX lives in src/pages/index.astro
// and just renders what you put here.
//
// Fields ending in `Html` accept inline HTML (links, <strong>, etc.)
// and are rendered via Astro's set:html. Everything else is plain text.

export const profile = {
  name: "Sirius Ganesh",
  overline: "Deployment Engineering · Warehouse Robotics · AMR Fleets",
  location: "Denver, CO",
  email: "siriusganesh@outlook.com",
  linkedin: "https://www.linkedin.com/in/siriusganesh/",
  github: "https://github.com/siriusganesh",
  resumeUrl: "/Resume_SG.pdf",
};

// The hero paragraph. Inline HTML allowed.
export const ledeHtml = `
  Deployment engineering leader scaling warehouse robotics from
  <strong>startup pilot</strong> to <strong>enterprise production</strong>.
  Currently managing a team of 7 deployment engineers across 9 customer sites at
  <a href="https://www.picklerobot.com" target="_blank" rel="noreferrer">Pickle Robot</a>,
  after scaling <strong>$40M+</strong> in AMR fleet deployments at Geek+.
  I bridge deep technical ownership — computer vision, fleet systems, networking —
  with the operational discipline to deliver automation programs reliably.
`;

// Hero portrait. Small photo beside the intro. Kept intentionally informal.
export const heroPortrait = {
  src: "/images/sirius-wife.jpg",
  alt: "Sirius with his wife at Dream Lake, Rocky Mountain National Park",
};

export type ExperienceEntry = {
  role: string;
  org: string;
  location: string;
  when: string;         // e.g. "JAN 2025 — PRESENT"
  bulletsHtml: string[]; // inline HTML allowed in each bullet
};

export const experience: ExperienceEntry[] = [
  {
    role: "Manager, Deployment Engineering",
    org: "Pickle Robot Company",
    location: "Denver, CO",
    when: "JAN 2025 — PRESENT",
    bulletsHtml: [
      "Manage a team of 7 deployment engineers — hiring, performance, and development — across 9 active customer sites running autonomous truck-unloading robots.",
      "Reduced per-site deployment time from 2 weeks to 2 days by standardizing deployment playbooks, networking infrastructure protocols, and customer training programs.",
      "Own end-to-end deployment of 15+ robotic systems across enterprise logistics warehouses; on-time delivery tied to customer business objectives.",
      "Partner with engineering and product to close the loop between field data and iterative design — the deployment team is the fastest feedback path into the roadmap.",
      "Primary customer contact during rollout; translate technical progress into business outcomes for stakeholders up to the VP level.",
    ],
  },
  {
    role: "Systems Consultant",
    org: "Geek+ Robotics",
    location: "San Diego, CA",
    when: "AUG 2023 — JAN 2025",
    bulletsHtml: [
      "Advised enterprise customers on AMR deployments, including <strong>UPS Happy Returns' first automated returns hub</strong> (150 robots) — reduced return processing time by 35%.",
      "Designed and executed testing strategies for fleet management systems: RESTful API integrations and UAT, hitting 100% SLA compliance at go-live.",
      "Built scalable SOPs and troubleshooting frameworks that reduced system downtime by 15% across active sites.",
      "Drove cross-functional delivery across engineering, support, and customer teams from scoping through go-live.",
    ],
  },
  {
    role: "Robotics Engineer / Deployment Manager",
    org: "Geek+ Robotics",
    location: "San Diego, CA",
    when: "AUG 2021 — JUL 2023",
    bulletsHtml: [
      "Directed planning, scheduling, and budgeting for <strong>$40M+ in AMR fleet deployment projects</strong>, including a 700+ robot facility for UPS that optimized storage capacity by 30%.",
      "Managed supply chain, installation, and system testing; delivered on schedule against stringent quality and performance benchmarks.",
      "Established a train-the-trainer program for customer operations teams, enabling independent fleet management and troubleshooting post-deployment.",
    ],
  },
];

// ========== EDUCATION ==========
// School block + research entries, LinkedIn-style.
// Dates/citations on research entries are best-guess from the LinkedIn
// screenshot — verify and correct.

export const educationBanner = {
  src: "/images/uiuc-campus.jpg",
  alt: "University of Illinois Urbana-Champaign main quad",
};

export type School = {
  name: string;
  degree: string;
  detail: string;
  when: string;
  highlightsHtml: string[];
};

export const school: School = {
  name: "University of Illinois Urbana-Champaign",
  degree: "B.S. Engineering Mechanics",
  detail: "Minor, Business · Grainger College of Engineering",
  when: "2017 — 2021",
  highlightsHtml: [
    "Dean's List, College of Engineering",
    "Research Assistant, Energy Transport Research Lab (ETRL) — Prof. Nenad Miljkovic's group",
  ],
};

export type ResearchEntry = {
  title: string;
  when: string;
  descriptionHtml: string;
  citation: string;
  href?: string;
};

// Two co-authored papers from the ETRL research period.
export const research: ResearchEntry[] = [
  {
    title: "Breaking droplet jumping energy conversion limits with superhydrophobic microgrooves",
    when: "SEP 2019 — MAY 2021",
    descriptionHtml: `
      Investigated how hierarchical microgrooved superhydrophobic surfaces influence
      droplet coalescence and jumping dynamics. Showed that groove structures enhance
      velocity and energy conversion efficiency nearly 2×.
    `,
    citation: "Langmuir 2020, 36, 32, 9510–9522",
  },
  {
    title: "Droplet jumping: effects of droplet size, surface structure, pinning, and liquid properties",
    when: "SEP 2019 — MAY 2021",
    descriptionHtml: `
      Developed a microdroplet visualization technique to study droplet jumping dynamics
      on nanostructured superhydrophobic, hierarchical superhydrophobic, and biphilic
      surfaces. Demonstrated how droplet size, pinning, and fluid properties govern
      jump behavior.
    `,
    citation: "ACS Nano 2019, 13, 2, 1309–1323",
  },
];

export type CapabilityGroup = { title: string; items: string[] };

export const capabilities: CapabilityGroup[] = [
  {
    title: "Leadership",
    items: [
      "Cross-functional team management",
      "Multi-site program ownership",
      "P&L & deployment economics",
      "Executive & stakeholder comms",
      "Process standardization",
      "Vendor & partner management",
      "Strategic planning & roadmapping",
    ],
  },
  {
    title: "Robotics",
    items: [
      "AMR fleet orchestration",
      "Computer vision & SLAM",
      "Edge computing & ML integration",
      "Sensor integration",
      "Control & embedded systems",
      "WMS / WCS / WES integration",
      "End-to-end commissioning",
    ],
  },
  {
    title: "Systems",
    items: [
      "Linux · Python · JavaScript · SQL",
      "Networking & IT/OT convergence",
      "Cybersecurity for industrial systems",
      "RESTful APIs & integration testing",
      "Git & CI pipelines",
      "User Acceptance Testing",
      "SOP & runbook authoring",
    ],
  },
];

// ========== PRESS & CASE STUDIES ==========
// External articles and notable programs. Entries with `href` render as links.

export type PressItem = {
  title: string;
  descriptionHtml: string;
  metaLine: string;
  href?: string;
  image?: { src: string; alt: string };
};

export const press: PressItem[] = [
  {
    title: "How UPS + Happy Returns is making customer returns easy",
    descriptionHtml: `
      UPS feature on the first fully automated returns processing hub — 150 Geek+ AMRs
      I advised on as Systems Consultant. Return processing time down 35%.
    `,
    metaLine: "UPS Newsroom · Happy Returns · 150-robot AMR deployment",
    href: "https://about.ups.com/us/en/our-stories/customer-first/how-we-re-making-customer-returns-easy--happy-returns-x-ups.html",
  },
  {
    title: "5 ways the new UPS Velocity facility orchestrates",
    descriptionHtml: `
      UPS feature on the Velocity facility — 700+ Geek+ AMRs, $40M+ program scope.
      I directed planning, scheduling, and budgeting as Deployment Manager.
      Storage capacity optimized by 30%.
    `,
    metaLine: "UPS Newsroom · Velocity · 700+ robot fleet · $40M+ program",
    href: "https://about.ups.com/us/en/our-stories/innovation-driven/5-ways-the-new-ups-velocity-facility-orchestrates-.html",
  },
  {
    title: "Pickle Robot — deployment playbook v3",
    descriptionHtml: `
      Built the standardized deployment process now used across Pickle's customer base:
      networking protocols, site prep, commissioning, and operator training. Per-site
      install time from 2 weeks to 2 days.
    `,
    metaLine: "Internal · 9 sites · 15+ robotic systems",
    image: {
      src: "/images/pickle-wide.jpg",
      alt: "Pickle Robot autonomous truck-unloading robot",
    },
  },
];

// Paragraphs on the About section. Inline HTML allowed.
// UIUC credentials moved to the Education section.
export const aboutParagraphsHtml: string[] = [
  `I work at the intersection of hardware, software, and operations — where robots stop
   being demos and start running somebody's P&L. My focus is the last mile of automation:
   the part where a novel system has to survive a real facility, a real workforce, and
   a real 3am shift change.`,
  `The career arc covers both ends of the maturity curve. <strong>Pickle Robot</strong>
   is 0-to-1 — architecture-defining decisions, operating with ambiguity, deep technical
   ownership. <strong>Geek+</strong> was scale — multi-site rollouts, process maturity,
   enterprise customers. The combination I optimize for: innovate like a startup, execute
   like an enterprise.`,
  `Outside work: espresso (still chasing the god shot), RC aviation (EDF jets and
   collective-pitch helis), and American Mensa Area Coordinator for Champaign County.`,
];

// Contact paragraph. Inline HTML allowed.
export const contactHtml = `
  Best way to reach me is
  <a href="mailto:siriusganesh@outlook.com">siriusganesh@outlook.com</a>.
  For recruiter outreach, <a href="https://www.linkedin.com/in/siriusganesh/" target="_blank" rel="noreferrer">LinkedIn</a>
  is fine. Open to conversations about <strong>director-level deployment, field
  engineering, and robotics operations</strong> — especially at companies scaling
  from pilot to production.
`;
