/** Named overrides beat literal objects: a test says what it cares about. */
let n = 0;
export const aTool = (over = {}) => ({
  id: ++n,
  assetTag: `TS-0${100 + n}`,
  name: 'Random orbital sander',
  category: 'power',
  shelf: 'B4',
  deposit: 10,
  status: 'in',
  notes: 'Bring your own discs.',
  createdAt: '2026-01-01 10:00:00',
  updatedAt: '2026-01-01 10:00:00',
  ...over,
});

export const aKeeper = (over = {}) => ({ id: 1, name: 'Ada Keeper', email: 'ada@toolshed.test', role: 'keeper', ...over });
export const aMember = (over = {}) => ({ id: 2, name: 'Sam Member', email: 'sam@toolshed.test', role: 'member', ...over });
