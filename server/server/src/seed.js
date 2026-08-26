import { db } from './db.js';

const SEED = [
  ['TS-0104', 'SDS hammer drill',         'power',    'B2',   20, 'in',     'Comes with a 6-piece masonry bit set.'],
  ['TS-0117', 'Random orbital sander',    'power',    'B4',   10, 'in',     'Bring your own discs, or buy them at the desk.'],
  ['TS-0121', 'Wet tile cutter',          'power',    'C1',   25, 'out',    'Heavy. Bring a car or a strong friend.'],
  ['TS-0133', 'Scaffold tower, 4m',       'access',   'Yard', 40, 'out',    'Two-person collection only.'],
  ['TS-0140', 'Extending loft ladder',    'access',   'A1',   15, 'in',     'Fits openings up to 2.9m.'],
  ['TS-0152', 'Petrol strimmer',          'garden',   'Yard', 20, 'in',     'Returned with a full tank, please.'],
  ['TS-0158', 'Lawn scarifier',           'garden',   'Yard', 25, 'repair', 'Waiting on a new tine drum.'],
  ['TS-0163', 'Long-reach hedge trimmer', 'garden',   'A3',   15, 'out',    'Goggles included on the hook.'],
  ['TS-0171', 'Wallpaper steamer',        'decorate', 'C3',   10, 'in',     'Takes 8 minutes to heat up.'],
  ['TS-0175', 'Airless paint sprayer',    'decorate', 'C4',   30, 'in',     'Must be returned flushed and clean.'],
  ['TS-0190', 'Thermal imaging camera',   'measure',  'Desk', 35, 'in',     'Find the draught before you buy the sealant.'],
  ['TS-0199', 'Laser level, 20m',         'measure',  'B1',   15, 'out',    'Self-levelling, green beam.'],
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO tools (asset_tag, name, category, shelf, deposit, status, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const run = db.transaction((rows) => rows.forEach((r) => insert.run(...r)));
run(SEED);

console.log(`Seeded. ${db.prepare('SELECT COUNT(*) c FROM tools').get().c} tools in the catalogue.`);
