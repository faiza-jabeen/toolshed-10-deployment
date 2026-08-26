import { useCatalogueStore, selectRowBusy } from '../stores/catalogueStore.js';
import { useSessionStore, selectIsKeeper } from '../stores/sessionStore.js';
import { toast } from '../stores/toastStore.js';

const LABEL = { in: 'On the shelf', out: 'Out on loan', repair: 'In repair' };
const NEXT = { in: 'out', out: 'in', repair: 'in' };

/**
 * The clearest win from the refactor. In task 03 this took nine props:
 * tool, busyAction, onEdit, onCycleStatus, onDelete, canEdit, toast… all
 * threaded through a ToolList that used none of them. Now: one prop.
 */
export function ToolRow({ tool }) {
  const busy = useCatalogueStore(selectRowBusy(tool.id));
  const patch = useCatalogueStore((s) => s.patch);
  const remove = useCatalogueStore((s) => s.remove);
  const isKeeper = useSessionStore(selectIsKeeper);

  const pending = Boolean(busy);

  async function cycle() {
    const next = NEXT[tool.status];
    const res = await patch(tool.id, { status: next });
    if (res.ok) toast.ok(`${tool.assetTag} is now ${LABEL[next].toLowerCase()}.`);
  }

  return (
    <article className={`tag row${pending ? ' is-busy' : ''}`}>
      <p className="tag__id"><span>{tool.assetTag}</span><span>Shelf {tool.shelf}</span></p>
      <h3 className="tag__name">{tool.name}</h3>
      <p className="row__notes">{tool.notes || <em>No notes yet.</em>}</p>

      <div className="row__meta">
        <span className={`pip pip--${tool.status === 'in' ? 'in' : 'out'}`}>{LABEL[tool.status]}</span>
        <span className="row__deposit">£{tool.deposit} deposit</span>
        <span className="row__cat">{tool.category}</span>
      </div>

      {isKeeper ? (
        <div className="row__actions">
          <button className="btn btn--ghost btn--sm" onClick={cycle} disabled={pending}>
            {busy === 'status' && <span className="spinner" />}
            {busy === 'status' ? 'Saving…' : `Mark ${LABEL[NEXT[tool.status]].toLowerCase()}`}
          </button>
          <button className="btn btn--danger btn--sm" onClick={() => remove(tool)} disabled={pending}>
            {busy === 'delete' && <span className="spinner" />}
            {busy === 'delete' ? 'Removing…' : 'Retire'}
          </button>
        </div>
      ) : (
        <p className="row__locked">Sign in as a keeper to change this.</p>
      )}
    </article>
  );
}
