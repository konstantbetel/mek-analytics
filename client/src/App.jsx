import { useEffect, useMemo, useState } from 'react';
import { fetchData } from './api.js';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import MonthPanel from './components/MonthPanel.jsx';
import DoctorView from './components/DoctorView.jsx';

const MONTHS = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [department, setDepartment] = useState(null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [doctor, setDoctor] = useState(null);

  useEffect(() => {
    fetchData()
      .then((d) => {
        setData(d);
        const deps = Object.keys(d || {});
        if (deps.length) {
          setDepartment(deps[0]);
          const yrs = Object.keys(d[deps[0]] || {}).map(Number);
          if (yrs.length && !yrs.includes(now.getFullYear())) setYear(yrs[yrs.length - 1]);
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  const departments = useMemo(() => Object.keys(data || {}), [data]);

  const years = useMemo(() => {
    if (!department || !data) return [];
    return Object.keys(data[department] || {})
      .map(Number)
      .sort((a, b) => b - a);
  }, [data, department]);

  const doctors = useMemo(() => {
    if (!data || !department) return [];
    const y = data[department]?.[year];
    if (!y) return [];
    const m = y[month];
    if (!m) return [];
    if (doctor && !m[doctor]) setDoctor(null);
    return Object.keys(m);
  }, [data, department, year, month, doctor]);

  if (error) return <div className="state">Ошибка загрузки: {error}</div>;
  if (!data) return <div className="state">Загрузка данных…</div>;

  return (
    <div className="layout">
      <Sidebar
        departments={departments}
        active={department}
        onSelect={(d) => { setDepartment(d); setDoctor(null); }}
      />

      <main className="main">
        <TopBar years={years} year={year} onYear={setYear} />
        <MonthPanel
          months={MONTHS}
          active={month}
          onSelect={setMonth}
        />

        {doctors.length === 0 ? (
          <div className="state">Нет данных за выбранный период</div>
        ) : (
          <div className="doctors">
            {doctors.map((doc) => {
              const info = data[department][year][month][doc];
              const total = (info.CountError || 0) + (info.CountNoError || 0);
              return (
                <button
                  key={doc}
                  className={'doctor-card' + (doctor === doc ? ' active' : '')}
                  onClick={() => setDoctor(doctor === doc ? null : doc)}
                >
                  <span className="doctor-name">{doc}</span>
                  <span className="doctor-nums">
                    <b className="err">{info.CountError || 0}</b> с дефектом ·{' '}
                    <b className="ok">{info.CountNoError || 0}</b> без
                  </span>
                  <span className="doctor-total">всего {total}</span>
                </button>
              );
            })}
          </div>
        )}

        {doctor && data[department]?.[year]?.[month]?.[doctor] && (
          <DoctorView
            info={data[department][year][month][doctor]}
            doctor={doctor}
          />
        )}
      </main>
    </div>
  );
}
