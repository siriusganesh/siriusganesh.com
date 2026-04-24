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

// Hero portrait. Photo beside the intro. Pre-cropped to keep Dream Lake
// backdrop while focusing on the couple.
export const heroPortrait = {
  src: "/images/sirius-wife-hero.webp",
  alt: "Sirius with his wife at Dream Lake, Rocky Mountain National Park",
};

export type ExperienceEntry = {
  role: string;
  org: string;
  location: string;
  when: string;         // e.g. "JAN 2025 — PRESENT"
  bulletsHtml: string[]; // inline HTML allowed in each bullet
  image?: { src: string; alt: string }; // optional banner image at top of entry
};

export const experience: ExperienceEntry[] = [
  {
    role: "Manager, Deployment Engineering",
    org: "Pickle Robot Company",
    location: "Denver, CO",
    when: "JAN 2025 — PRESENT",
    image: {
      src: "/images/pickle-banner.webp",
      alt: "Pickle Robot — Physical AI for Supply Chain Automation (gripper)",
    },
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
    image: {
      src: "/images/geekplus-banner.webp",
      alt: "Geek+ — One-Stop Partner For Warehouse Robotics",
    },
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
  src: "/images/uiuc-campus.webp",
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
    "American Mensa — Area Coordinator, Champaign County",
  ],
};

export type ResearchEntry = {
  title: string;
  when: string;
  descriptionHtml: string;
  citation: string;
  href?: string;
};

// Four co-authored papers from the ETRL research period. First one renders by
// default; the rest live behind a "show more" expand on the page.
export const research: ResearchEntry[] = [
  {
    title: "Breaking Droplet Jumping Energy Conversion Limits with Superhydrophobic Microgrooves",
    when: "SEP 2019 — MAY 2021",
    descriptionHtml: `
      Investigated how hierarchical microgrooved superhydrophobic surfaces influence
      droplet coalescence and jumping dynamics. Showed that groove structures enhance
      velocity and energy conversion efficiency nearly 2× and 6× higher, respectively,
      than smooth surfaces, by controlling coalescence hydrodynamics. Findings highlight
      how macroscale structures can be engineered to improve performance in applications
      like condensation heat transfer, self-cleaning, and anti-icing.
    `,
    citation: "Langmuir 2020, 36, 32, 9510–9522",
  },
  {
    title: "Droplet Jumping: Effects of Droplet Size, Surface Structure, Pinning, and Liquid Properties",
    when: "SEP 2019 — MAY 2021",
    descriptionHtml: `
      Developed a microdroplet visualization technique to study droplet jumping dynamics
      on nanostructured superhydrophobic, hierarchical superhydrophobic, and biphilic
      surfaces. Demonstrated how droplet size mismatch, surface structure, and liquid
      properties affect jumping velocity and direction, validating inertial-capillary
      scaling across diverse condensates. Provides new insights into fluid–substrate
      interactions and guides surface design for anti-icing, water harvesting, and
      thermal management.
    `,
    citation: "ACS Nano 2019, 13, 2, 1309–1323",
  },
  {
    title: "How Superhydrophobic Grooves Drive Single-Droplet Jumping",
    when: "SEP 2019 — MAY 2021",
    descriptionHtml: `
      Explored a novel droplet-shedding mechanism that enhances self-cleaning, anti-icing,
      water-harvesting, and heat-transfer surfaces. Using simulations and experiments,
      demonstrated how groove geometry and Laplace pressure drive single-droplet jumping
      with departure velocities over 3× higher than conventional methods. Developed a
      regime map for predicting jumping behavior and showed how surface design can
      control droplet direction and performance.
    `,
    citation: "Langmuir 2022, 38, 14, 4452–4460",
  },
  {
    title: "Laplace Pressure Driven Single-Droplet Jumping on Structured Surfaces",
    when: "SEP 2019 — MAY 2021",
    descriptionHtml: `
      Studied how droplets move and shed from surfaces, a process critical to biofluidics,
      anti-icing, water harvesting, and electronics cooling. Developed a novel
      groove-based surface design that enables droplets to "jump" with velocities up to
      3–4× higher than conventional methods. Demonstrated precise control over droplet
      speed, direction, and size, and applied this mechanism to improve steam condensation
      efficiency.
    `,
    citation: "ACS Nano 2020, 14, 10, 12796–12809",
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
    title: "Robots that spare warehouse workers the heavy lifting",
    descriptionHtml: `
      MIT News company feature on Pickle Robot — the autonomous truck-unloading
      platform I lead customer deployments for. Profiles the MIT-alum founding
      team and covers the product's current customer set, including UPS and
      Yusen Logistics.
    `,
    metaLine: "MIT News · Pickle Robot company feature · December 2025",
    href: "https://news.mit.edu/2025/robots-spare-warehouse-workers-heavy-lifting-1205",
  },
  {
    title: "How UPS + Happy Returns is making customer returns easy",
    descriptionHtml: `
      UPS feature on the first fully automated returns processing hub — 150 Geek+ AMRs
      I advised on as Systems Consultant. Return processing time down 35%.
    `,
    metaLine: "UPS Newsroom · Happy Returns · 150-robot AMR deployment · January 2025",
    href: "https://about.ups.com/us/en/our-stories/customer-first/how-we-re-making-customer-returns-easy--happy-returns-x-ups.html",
  },
  {
    title: "5 ways the new UPS Velocity facility orchestrates",
    descriptionHtml: `
      UPS feature on the Velocity facility — 700+ Geek+ AMRs, $40M+ program scope.
      I directed planning, scheduling, and budgeting as Deployment Manager.
      Storage capacity optimized by 30%.
    `,
    metaLine: "UPS Newsroom · Velocity · 700+ robot fleet · $40M+ program · April 2024",
    href: "https://about.ups.com/us/en/our-stories/innovation-driven/5-ways-the-new-ups-velocity-facility-orchestrates-.html",
  },
];

// About section paragraphs — genuinely off-the-clock. Career/P&L talk
// belongs in Experience, not here.
export const aboutParagraphsHtml: string[] = [
  `Off the clock: <a href="/coffee">espresso</a> (still chasing the god shot on a Lelit), RC aviation
   (EDF jets and collective-pitch helis), and as much Colorado Rockies trail time as
   the calendar allows. <strong>Maple</strong> — our golden retriever and unofficial
   chief morale officer — shows up on most of the good ones.`,
];

// Gallery tiles for the About section. Mix of photo tiles and one text tile
// for RC aviation (no photo yet).
export type AboutTile =
  | { kind: "photo"; src: string; alt: string; label: string; caption: string }
  | { kind: "text"; label: string; headline: string; caption: string };

export const aboutGallery: AboutTile[] = [
  {
    kind: "photo",
    src: "/images/espresso.webp",
    alt: "Espresso pull on a Lelit machine",
    label: "Espresso",
    caption: "Lelit · chasing the god shot",
  },
  {
    kind: "photo",
    src: "/images/maple-nyc.webp",
    alt: "Maple the golden retriever in Times Square, NYC",
    label: "Maple",
    caption: "Golden retriever · chief morale officer",
  },
  {
    kind: "photo",
    src: "/images/aspen-lake.webp",
    alt: "Aspen trees in fall color along a Rocky Mountain lake",
    label: "Rockies",
    caption: "Aspens and alpine lakes, Colorado",
  },
  {
    kind: "text",
    label: "RC aviation",
    headline: "EDF jets &\ncollective-pitch helis",
    caption: "Respect the rotor disc.",
  },
];

// Contact paragraph. Inline HTML allowed.
export const contactHtml = `
  Best way to reach me is
  <a href="mailto:siriusganesh@outlook.com">siriusganesh@outlook.com</a>.
  For recruiter outreach, <a href="https://www.linkedin.com/in/siriusganesh/" target="_blank" rel="noreferrer">LinkedIn</a>
  is fine. Open to conversations about <strong>director-level deployment, field
  engineering, and robotics operations</strong> — especially at companies scaling
  from pilot to production.
  <br /><br />
  <a href="/Resume_SG.pdf" target="_blank" rel="noreferrer">Download resume (PDF) ↗</a>
`;
