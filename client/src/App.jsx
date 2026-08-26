import { useEffect } from 'react';
import { useSessionStore } from './stores/sessionStore.js';
import {
  useCatalogueStore, useVisibleTools, selectIsFiltering,
} from './stores/catalogueStore.js';
import { useSessionStore as useSession, selectIsKeeper } from './stores/sessionStore.js';
import { SessionBar } from './components/SessionBar.jsx';
import { Stats } from './components/Stats.jsx';
import { Filters } from './components/Filters.jsx';
import { AddToolForm } from './components/AddToolForm.jsx';
import { ToolRow } from './components/ToolRow.jsx';
import { Toasts } from './components/Toasts.jsx';
import { RowsSkeleton } from './components/Skeletons.jsx';
import { EmptyCatalogue, EmptyFiltered, CatalogueError } from './components/EmptyStates.jsx';

/**
 * Note what App does NOT do any more: it holds no state, owns no handlers and
 * passes no props. It boots the two stores and arranges components on the page.
 * That is the whole point of the refactor.
 */
export default function App() {
  const boot = useSessionStore((s) => s.boot);
  const load = useCatalogueStore((s) => s.load);

  const status = useCatalogueStore((s) => s.status);
  const error = useCatalogueStore((s) => s.error);
  const visible = useVisibleTools();
  const total = useCatalogueStore((s) => s.tools.length);
  const filtering = useCatalogueStore(selectIsFiltering);
  const clearFilters = useCatalogueStore((s) => s.clearFilters);
  const term = useCatalogueStore((s) => s.term);
  const category = useCatalogueStore((s) => s.category);
  const isKeeper = useSession(selectIsKeeper);

  useEffect(() => { boot(); load(); }, [boot, load]);

  return (
    <>
      <header className="masthead">
        <div className="u-shell masthead__inner">
          <p className="wordmark">
            <span className="wordmark__mark">TS</span>
            <span className="wordmark__text">Kirkgate<br /><em>Toolshed</em></span>
          </p>
          <SessionBar />
        </div>
      </header>

      <main className="u-shell page">
        <div className="page__head">
          <p className="eyebrow">Shared state across the session and the shelf</p>
          <h1 className="page__title">Everything the shed owns.</h1>
        </div>

        <Stats />
        <AddToolForm />
        <Filters />

        <p className="page__count" role="status" aria-live="polite">
          {status === 'loading' && 'Loading the catalogue…'}
          {status === 'ready' && `${visible.length} of ${total} tools`}
          {status === 'error' && 'Catalogue unavailable'}
        </p>

        {(status === 'loading' || status === 'idle') && <RowsSkeleton />}
        {status === 'error' && <CatalogueError error={error} onRetry={load} />}
        {status === 'ready' && total === 0 && <EmptyCatalogue canAdd={isKeeper} />}
        {status === 'ready' && total > 0 && visible.length === 0 && (
          <EmptyFiltered term={term} category={category} onClear={clearFilters} />
        )}
        {status === 'ready' && visible.length > 0 && (
          <div className="rows">
            {visible.map((tool) => <ToolRow key={tool.id} tool={tool} />)}
          </div>
        )}
      </main>

      <Toasts />
    </>
  );
}
