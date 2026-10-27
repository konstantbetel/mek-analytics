export default function MonthPanel({ months, active, onSelect }) {
  return (
    <nav className="months">
      {months.map((m) => (
        <button
          key={m}
          className={'month-btn' + (active === m ? ' active' : '')}
          onClick={() => onSelect(m)}
        >
          {m}
        </button>
      ))}
    </nav>
  );
}
