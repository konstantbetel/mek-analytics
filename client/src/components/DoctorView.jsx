import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';
import DataTable from './DataTable.jsx';

export default function DoctorView({ info, doctor }) {
  const data = [
    { name: 'С дефектом', value: info.CountError || 0, key: 'err' },
    { name: 'Без дефекта', value: info.CountNoError || 0, key: 'ok' },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <section className="doctor-view">
      <div className="summary">
        <div className="sum-card err">
          <div className="sum-num">{info.CountError || 0}</div>
          <div className="sum-label">с дефектом</div>
        </div>
        <div className="sum-card ok">
          <div className="sum-num">{info.CountNoError || 0}</div>
          <div className="sum-label">без дефекта</div>
        </div>
        <div className="sum-card">
          <div className="sum-num">{total}</div>
          <div className="sum-label">всего талонов</div>
        </div>
      </div>

      <div className="chart">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
              <Cell fill="#e05252" />
              <Cell fill="#3aa675" />
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <DataTable rows={info.DETAIL || []} doctor={doctor} />
    </section>
  );
}
