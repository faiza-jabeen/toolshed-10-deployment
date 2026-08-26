import { useCatalogueStore, useCounts } from '../stores/catalogueStore.js';
import { StatsSkeleton } from './Skeletons.jsx';

/**
 * Derived entirely from the store. Nothing computes or passes these counts —
 * they are a selector over the same `tools` array the list renders, so they
 * cannot disagree with it. Retire a tool and this updates in the same tick.
 */
export function Stats() {
  const status = useCatalogueStore((s) => s.status);
  const counts = useCounts();

  if (status === 'loading' || status === 'idle') return <StatsSkeleton />;
  if (status === 'error') return null;

  const cells = [
    { label: 'in the catalogue', value: counts.total },
    { label: 'on the shelf', value: counts.onShelf, tone: 'in' },
    { label: 'out on loan', value: counts.onLoan, tone: 'out' },
    { label: 'in repair', value: counts.inRepair, tone: 'repair' },
  ];

  return (
    <div className="stats">
      {cells.map((c) => (
        <div className={`stat${c.tone ? ` stat--${c.tone}` : ''}`} key={c.label}>
          <p className="stat__label">{c.label}</p>
          <p className="stat__value">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
