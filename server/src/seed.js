import bcrypt from 'bcryptjs';
import { db } from './db.js';

const TOOLS = [
  ['TS-0104','SDS hammer drill','power','B2',20,'in','Comes with a 6-piece masonry bit set.'],
  ['TS-0117','Random orbital sander','power','B4',10,'in','Bring your own discs.'],
  ['TS-0121','Wet tile cutter','power','C1',25,'out','Heavy. Bring a car.'],
  ['TS-0133','Scaffold tower, 4m','access','Yard',40,'out','Two-person collection only.'],
  ['TS-0140','Extending loft ladder','access','A1',15,'in','Fits openings up to 2.9m.'],
  ['TS-0152','Petrol strimmer','garden','Yard',20,'in','Return it with a full tank.'],
  ['TS-0158','Lawn scarifier','garden','Yard',25,'repair','Waiting on a new tine drum.'],
  ['TS-0171','Wallpaper steamer','decorate','C3',10,'in','Takes 8 minutes to heat up.'],
  ['TS-0190','Thermal imaging camera','measure','Desk',35,'in','Find the draught first.'],
  ['TS-0199','Laser level, 20m','measure','B1',15,'out','Self-levelling, green beam.'],
];
const insert = db.prepare(`INSERT OR IGNORE INTO tools
  (asset_tag,name,category,shelf,deposit,status,notes) VALUES (?,?,?,?,?,?,?)`);
db.transaction((rows) => rows.forEach((r) => insert.run(...r)))(TOOLS);

const keeper = ['keeper@toolshed.test', 'Marta Kaminski', 'keeper'];
const member = ['member@toolshed.test', 'Priya Nair', 'member'];
for (const [email, name, role] of [keeper, member]) {
  if (!db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?,?,?,?)')
      .run(email, name, bcrypt.hashSync('shed-ladder-9912', 12), role);
  }
}
db.prepare(`INSERT INTO loans (user_id, tool, asset_tag, due_on)
  SELECT id, 'Laser level, 20m', 'TS-0199', date('now','+4 day') FROM users WHERE email = ?
  AND NOT EXISTS (SELECT 1 FROM loans WHERE asset_tag='TS-0199')`).run(member[0]);

console.log('Seeded.');
console.log('  keeper@toolshed.test / shed-ladder-9912  (can edit the catalogue)');
console.log('  member@toolshed.test / shed-ladder-9912  (read only)');
