import { useState } from "react";
import { getReport } from "../services/api";

export default function ManagerPanel() {
  const [site, setSite] = useState("ShamrockHouse");
  const [date, setDate] = useState("");
  const [reports, setReports] = useState([]);

  const fetch = async () => {
    const res = await getReport({ site, date });

    if (res.success) setReports(res.data);
  };

  return (
    <div>
      <h2>Manager Panel</h2>

      <select onChange={(e) => setSite(e.target.value)}>
        <option>ShamrockHouse</option>
        <option>WHCP zone 1</option>
        <option>WHCP zone 2</option>
      </select>

      <input type="date" onChange={(e) => setDate(e.target.value)} />

      <button onClick={fetch}>Get Report</button>

      {reports.map((r, i) => (
        <div key={i}>
          🚗 {r.plateNumber} | {r.row} | {r.days}
        </div>
      ))}
    </div>
  );
}
