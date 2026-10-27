const COLUMNS = [
  'Номер талона',
  'Акт МЭК',
  'Дата',
  'Код дефекта',
  'Сумма',
  'Примечание',
];

export default function DataTable({ rows }) {
  if (!rows.length) return <div className="state">Записей нет</div>;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {COLUMNS.map((c) => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r['Номер талона']}</td>
              <td>
                {r.link ? (
                  <a href={r.link} target="_blank" rel="noopener noreferrer">
                    {r['Акт МЭК']}
                  </a>
                ) : (
                  r['Акт МЭК']
                )}
              </td>
              <td>{r['Дата']}</td>
              <td className={r['Код дефекта'] ? 'cell-err' : ''}>{r['Код дефекта'] || '—'}</td>
              <td className="num">{r['Сумма']}</td>
              <td className="note">{r['Примечание'] || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
