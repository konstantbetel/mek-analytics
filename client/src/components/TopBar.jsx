export default function TopBar({ years, year, onYear }) {
  return (
    <header className="topbar">
      <div className="topbar-label">Год:</div>
      <div className="year-list">
        {years.map((y) => (
          <button
            key={y}
            className={'year-btn' + (year === y ? ' active' : '')}
            onClick={() => onYear(y)}
          >
            {y}
          </button>
        ))}
        {years.length === 0 && <span className="muted">нет данных</span>}
      </div>
    </header>
  );
}
