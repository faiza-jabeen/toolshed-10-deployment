import { useCatalogueStore } from '../stores/catalogueStore.js';

const CATEGORIES = ['', 'power', 'garden', 'decorate', 'access', 'measure', 'hand'];

/** Subscribes only to term and category — a tool update does not re-render it. */
export function Filters() {
  const term = useCatalogueStore((s) => s.term);
  const category = useCatalogueStore((s) => s.category);
  const setTerm = useCatalogueStore((s) => s.setTerm);
  const setCategory = useCatalogueStore((s) => s.setCategory);
  const disabled = useCatalogueStore((s) => s.status !== 'ready');

  return (
    <div className="filters">
      <label className="field filters__search">
        <span className="field__label">Search the catalogue</span>
        <input className="input" type="search" value={term} disabled={disabled}
               placeholder="sander, TS-0117, goggles…" onChange={(e) => setTerm(e.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Category</span>
        <select className="select" value={category} disabled={disabled}
                onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c || 'all'} value={c}>{c || 'All categories'}</option>)}
        </select>
      </label>
    </div>
  );
}
