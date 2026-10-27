export default function Sidebar({ departments, active, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">Отделения</div>
      {departments.length === 0 && <div className="muted">—</div>}
      <ul>
        {departments.map((d) => (
          <li key={d}>
            <button
              className={'side-item' + (active === d ? ' active' : '')}
              onClick={() => onSelect(d)}
            >
              {d}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
