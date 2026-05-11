import ParkingForm from "../components/ParkingForm";

export default function Dashboard({ user, onLogout, loading, setLoading }) {
  return (
    <div style={styles.wrapper}>
      {/* GLOBAL LOADING */}
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner}></div>
        </div>
      )}

      {/* HEADER */}
      <div style={styles.header}>
        <h2>Welcome {user.userName}</h2>

        <button style={styles.logoutBtn} onClick={onLogout}>
          Sign Out
        </button>
      </div>

      {/* CONTENT */}
      <ParkingForm user={user} loading={loading} setLoading={setLoading} />
    </div>
  );
}

const styles = {
  wrapper: {
    padding: "20px",
    color: "white",
    backgroundColor: "#121212",
    minHeight: "100vh",
    position: "relative",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  logoutBtn: {
    padding: "8px 15px",
    backgroundColor: "#ff4d4d",
    border: "none",
    borderRadius: "5px",
    color: "white",
    cursor: "pointer",
  },

  // ================== LOADING ==================
  loadingOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },

  spinner: {
    width: "60px",
    height: "60px",
    border: "6px solid #333",
    borderTop: "6px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

// 🔥 SPINNER ANIMATION
const styleSheet = document.styleSheets[0];

styleSheet.insertRule(
  `
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
`,
  styleSheet.cssRules.length
);
