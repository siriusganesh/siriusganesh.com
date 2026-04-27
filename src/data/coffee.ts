// Brew log for /coffee page.
// Add a new object to `brews` after each shot and commit.
// Flow rate and days-off-roast are derived at build time from this data.

export type Method = 'espresso' | 'filter' | 'other';

export type BrewEntry = {
  date: string;        // ISO date of brew (YYYY-MM-DD)
  bean: string;        // display name
  roaster?: string;
  roastDate: string;   // ISO date (YYYY-MM-DD)
  doseG: number;       // input dry coffee, grams
  yieldG: number;      // output in cup, grams
  timeS: number;       // pull time in seconds, from first drop hitting the cup
  grind?: string;      // grinder setting, free text (e.g. "DF64 #7")
  basket?: string;     // e.g. "DEX 15g"
  temp?: string;       // e.g. "Mid" on MaraX
  puckScreen?: boolean;
  method?: Method;     // defaults to 'espresso'
  rating?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
};

export type ActiveBean = {
  bean: string;                 // distinctive display name ("Mokha Java", "Yirgacheffe")
  roaster?: string;             // shown small/dim under the name
  roastDate: string;            // ISO
  openedDate?: string;

  // Identification attributes. All optional — only set the ones that apply.
  // badges: free-text chips shown in small-caps row, e.g.
  //   ["special release", "blend", "medium"]
  //   ["single origin", "natural", "medium"]
  badges?: string[];
  // origin: one-line human-readable origin description.
  //   single origin → "Country · Region" (e.g. "Ethiopia · Yirgacheffe")
  //   blend → mix description (e.g. "African + Pacific Rim")
  origin?: string;
  // tastingNotes: ordered, short. Rendered dot-separated.
  tastingNotes?: string[];
};

// Machine / setup displayed in the header. Change when the hardware changes.
export const rig = {
  machine: 'Lelit Mara X',
  grinder: 'DF64',
};

// Bags currently open. Shown in the "Currently brewing" header.
export const activeBeans: ActiveBean[] = [
  {
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    badges: ['special release', 'blend', 'medium'],
    origin: 'African + Pacific Rim',
    tastingNotes: ['fig', 'dried raspberry', 'dark chocolate'],
  },
];

// Brew log, newest last. Chart and table derive from this array.
export const brews: BrewEntry[] = [
  {
    date: '2026-04-19',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.5,
    yieldG: 36.1,
    timeS: 24,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
    notes: 'Hint of bitterness.',
  },
  {
    date: '2026-04-19',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.5,
    yieldG: 37.0,
    timeS: 25,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
    notes: 'Milk drink.',
  },
  {
    date: '2026-04-20',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.5,
    yieldG: 37.1,
    timeS: 25,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
  },
  {
    date: '2026-04-20',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.5,
    yieldG: 37.1,
    timeS: 24,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
  },
  {
    date: '2026-04-21',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.6,
    yieldG: 37.0,
    timeS: 25,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
  },
  {
    date: '2026-04-21',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.6,
    yieldG: 38.0,
    timeS: 23,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
  },
  {
    date: '2026-04-24',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.5,
    yieldG: 37.3,
    timeS: 26,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
  },
  {
    date: '2026-04-24',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.6,
    yieldG: 37.2,
    timeS: 25,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
  },
  {
    date: '2026-04-24',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.5,
    yieldG: 36.9,
    timeS: 25,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
  },
  {
    date: '2026-04-25',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.5,
    yieldG: 38.1,
    timeS: 27,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
  },
  {
    date: '2026-04-26',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.5,
    yieldG: 36.5,
    timeS: 26,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
    notes: 'Scale battery died right after pour; yield was 36.x — saw 36.5 but the decimal is uncertain.',
  },
  {
    date: '2026-04-26',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.5,
    yieldG: 38.1,
    timeS: 25,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
    notes: 'Lost a bean before grinding; effective dose slightly under 15.5 g.',
  },
  {
    date: '2026-04-26',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.6,
    yieldG: 37.9,
    timeS: 25,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
  },
  {
    date: '2026-04-26',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.5,
    yieldG: 37.7,
    timeS: 24,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
    notes: 'Spilled grounds and re-ground; longer gap between shots may have produced a temp spike (MaraX is HX, not dual boiler).',
  },
  {
    date: '2026-04-27',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.6,
    yieldG: 36.8,
    timeS: 25,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
  },
  {
    date: '2026-04-27',
    bean: 'Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
    doseG: 15.5,
    yieldG: 37.4,
    timeS: 23,
    grind: 'DF64 #7',
    basket: 'DEX 15g',
    temp: 'Mid',
    puckScreen: true,
    method: 'espresso',
  },
];

// Helpers used by the page. Kept here so the page file stays about layout.
export function daysBetween(later: string, earlier: string): number {
  const ms = new Date(later).getTime() - new Date(earlier).getTime();
  return Math.round(ms / 86_400_000);
}

export function flowRate(entry: BrewEntry): number {
  return entry.yieldG / entry.timeS;
}

export function ratio(entry: BrewEntry): string {
  const r = entry.yieldG / entry.doseG;
  return `1:${r.toFixed(2)}`;
}
