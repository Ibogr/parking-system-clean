import { useState } from "react";
import { getReport, downloadReport } from "../services/api";

export default function ManagerPanel({ onLogout }) {
  const [site, setSite] = useState("ShamrockHouse");
  const [date, setDate] = useState("");
  const [reports, setReports] = useState([]);

  // ================== FETCH ==================
  const fetchReport = async () => {
    if (!date) return alert("Select date ❌");

    const res = await getReport({ site, date });

    if (res.success) setReports(res.data);
    else alert("No data ❌");
  };

  // ================== DOWNLOAD ==================
  const handleDownload = async () => {
    if (!date) return alert("Select date ❌");

    try {
      await downloadReport({ site, date });
    } catch (err) {
      console.error(err);
      alert("Download failed ❌");
    }
  };

  // 🔥 SINGLE OFFICER (CLEAN)
  const officer = reports.length > 0 ? reports[0].personnel : "";

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <h2 style={styles.title}>Manager Panel</h2>

        <button style={styles.logout} onClick={onLogout}>
          Logout
        </button>
      </div>

      {/* FILTERS */}
      <div style={styles.card}>
        <select
          style={styles.input}
          value={site}
          onChange={(e) => setSite(e.target.value)}
        >
          <option>ShamrockHouse</option>
          <option>WHCP zone 1</option>
          <option>WHCP zone 2</option>
        </select>

        <input
          style={styles.input}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div style={styles.btnRow}>
          <button style={styles.btn} onClick={fetchReport}>
            Get Report
          </button>

          <button style={styles.btnSecondary} onClick={handleDownload}>
            Download PDF
          </button>
        </div>
      </div>

      {/* REPORT LIST */}
      <div style={styles.card}>
        <h3 style={styles.subtitle}>Report Results</h3>

        {reports.length === 0 && (
          <div style={{ color: "#888" }}>No data loaded</div>
        )}

        {/* 🔥 OFFICER (ONLY ONCE) */}
        {officer && (
          <div style={styles.officerBox}>👤 Security Officer: {officer}</div>
        )}

        {reports.map((r, i) => (
          <div
            key={i}
            style={{
              ...styles.row,
              color: r.longStay ? "#ff4d4d" : "white",
            }}
          >
            🚗 {r.plateNumber} | Row {r.row} | Space {r.spaceNumber} | {r.days}{" "}
            days
          </div>
        ))}
      </div>
    </div>
  );
}

// ================== STYLES ==================
const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    color: "white",
    padding: "20px",
    fontFamily: "Arial",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  title: {
    margin: 0,
  },

  subtitle: {
    marginBottom: "10px",
  },

  logout: {
    backgroundColor: "#ff4d4d",
    border: "none",
    padding: "10px 15px",
    borderRadius: "8px",
    color: "white",
    cursor: "pointer",
  },

  card: {
    backgroundColor: "#151515",
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "15px",
    border: "1px solid #2a2a2a",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #333",
    backgroundColor: "#0f0f0f",
    color: "white",
    boxSizing: "border-box",
  },

  btnRow: {
    display: "flex",
    gap: "10px",
  },

  btn: {
    flex: 1,
    padding: "12px",
    backgroundColor: "#2a2a2a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  btnSecondary: {
    flex: 1,
    padding: "12px",
    backgroundColor: "#111",
    color: "white",
    border: "1px solid #333",
    borderRadius: "8px",
    cursor: "pointer",
  },

  row: {
    padding: "10px",
    borderBottom: "1px solid #222",
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },

  officerBox: {
    backgroundColor: "#1f1f1f",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "15px",
    border: "1px solid #333",
    color: "#fff",
  },
};
