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
  bean: string;
  roaster?: string;
  roastDate: string;
  openedDate?: string;
};

// Machine / setup displayed in the header. Change when the hardware changes.
export const rig = {
  machine: 'Lelit Mara X',
  grinder: 'DF64',
};

// Bags currently open. Shown in the "Currently brewing" header.
export const activeBeans: ActiveBean[] = [
  {
    bean: 'La Cosecha Mokha Java',
    roaster: 'La Cosecha',
    roastDate: '2026-04-14',
  },
];

// Brew log, newest last. Chart and table derive from this array.
export const brews: BrewEntry[] = [
  {
    date: '2026-04-19',
    bean: 'La Cosecha Mokha Java',
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
    bean: 'La Cosecha Mokha Java',
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
    bean: 'La Cosecha Mokha Java',
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
    bean: 'La Cosecha Mokha Java',
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
