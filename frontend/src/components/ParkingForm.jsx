import { useState } from "react";
import { submitParkingBatch, getReport, downloadReport } from "../services/api";

export default function ParkingForm() {
  const [site, setSite] = useState("ShamrockHouse");
  const [row, setRow] = useState("Row 1");
  const [spaceNumber, setSpaceNumber] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [date, setDate] = useState("");
  const [list, setList] = useState([]);
  const [warning, setWarning] = useState("");
  const [reports, setReports] = useState([]);

  // ================== ADD ==================
  const addToList = () => {
    if (!plateNumber || !spaceNumber) return;

    const exists = list.some(
      (i) => i.row === row && String(i.spaceNumber) === String(spaceNumber)
    );

    if (exists) {
      setWarning(`⚠️ Space ${spaceNumber} already used`);
      return;
    }

    setWarning("");

    setList([...list, { plateNumber, spaceNumber, row }]);

    setPlateNumber("");
    setSpaceNumber("");
  };

  // ================== SUBMIT ==================
  const submitAll = async () => {
    if (list.length === 0) return alert("List is empty ❌");
    if (!date) return alert("Select date ❌");

    try {
      const res = await submitParkingBatch({
        site,
        date,
        entries: list,
      });

      if (res.success) {
        alert("Saved ✅");
        setList([]);
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error ❌");
    }
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

  // ================== REPORT ==================
  const fetchReport = async () => {
    if (!date) return alert("Select date ❌");

    try {
      const res = await getReport({ site, date });

      if (res.success) {
        setReports(res.data);
      }
    } catch (err) {
      console.error(err);
      alert("Error ❌");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* LEFT */}
        <div style={styles.card}>
          <h2 style={styles.title}>Parking System</h2>

          {warning && <div style={styles.warning}>{warning}</div>}

          <select
            style={styles.input}
            value={site}
            onChange={(e) => setSite(e.target.value)}
          >
            <option>ShamrockHouse</option>
            <option>WHCP zone 1</option>
            <option>WHCP zone 2</option>
          </select>

          <select
            style={styles.input}
            value={row}
            onChange={(e) => setRow(e.target.value)}
          >
            {[...Array(10)].map((_, i) => (
              <option key={i}>Row {i + 1}</option>
            ))}
          </select>

          <input
            style={styles.input}
            placeholder="Space Number"
            value={spaceNumber}
            onChange={(e) => setSpaceNumber(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="Plate Number"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
          />

          <input
            style={styles.input}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <button style={styles.btn} onClick={addToList}>
            Add
          </button>

          <button style={styles.btnPrimary} onClick={submitAll}>
            Submit All
          </button>

          <button style={styles.btnSecondary} onClick={fetchReport}>
            Get Report
          </button>

          <button style={styles.btnSecondary} onClick={handleDownload}>
            Download PDF
          </button>
        </div>

        {/* RIGHT */}
        <div style={styles.card}>
          <h3 style={styles.title}>Today's Entries</h3>

          {list.length === 0 && (
            <div style={{ color: "#777" }}>No entries yet</div>
          )}

          {list.map((item, i) => (
            <div key={i} style={styles.row}>
              <span>
                🚗 {item.plateNumber} | {item.row} | Space {item.spaceNumber}
              </span>

              <button
                style={styles.delete}
                onClick={() => setList(list.filter((_, index) => index !== i))}
              >
                ❌
              </button>
            </div>
          ))}

          <h3 style={styles.title}>Report</h3>

          {reports.length === 0 && (
            <div style={{ color: "#777" }}>No report loaded</div>
          )}

          {reports.map((r, i) => (
            <div
              key={i}
              style={{
                ...styles.row,
                color: r.longStay ? "#ff4d4d" : "white",
              }}
            >
              🚗 {r.plateNumber} | {r.row} | Space {r.spaceNumber} | {r.days}{" "}
              days
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================== STYLES ==================
const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    display: "flex",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "Arial",
  },

  container: {
    width: "100%",
    maxWidth: "1200px",
    display: "grid",

    // 🔥 RESPONSIVE FIX
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",

    gap: "20px",
  },

  card: {
    backgroundColor: "#151515",
    padding: "18px",
    borderRadius: "14px",
    border: "1px solid #2a2a2a",
    display: "flex",
    flexDirection: "column",
    gap: "12px",

    // 🔥 MOBILE FIX
    minWidth: 0,
  },

  title: {
    color: "white",
    fontSize: "18px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #2a2a2a",
    backgroundColor: "#0f0f0f",
    color: "white",
    outline: "none",
    boxSizing: "border-box",

    // 🔥 MOBILE TEXT FIX
    fontSize: "14px",
  },

  btn: {
    padding: "12px",
    backgroundColor: "#2a2a2a",
    color: "white",
    border: "1px solid #3a3a3a",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },

  btnPrimary: {
    padding: "12px",
    backgroundColor: "#000",
    color: "white",
    border: "1px solid #555",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },

  btnSecondary: {
    padding: "12px",
    backgroundColor: "#1b1b1b",
    color: "white",
    border: "1px solid #333",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    padding: "10px",
    backgroundColor: "#111",
    borderRadius: "8px",
    border: "1px solid #222",

    // 🔥 MOBILE TEXT WRAP FIX
    flexWrap: "wrap",
  },

  delete: {
    background: "transparent",
    border: "none",
    color: "#ff4d4d",
    cursor: "pointer",
  },

  warning: {
    backgroundColor: "#3a0d0d",
    padding: "10px",
    borderRadius: "8px",
    color: "#ffb3b3",
    border: "1px solid #5a1a1a",
  },
};
