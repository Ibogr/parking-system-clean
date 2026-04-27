import ParkingForm from "../components/ParkingForm";

export default function Dashboard({ user, onLogout }) {
  return (
    <div style={styles.wrapper}>
      {/* HEADER */}
      <div style={styles.header}>
        <h2>Welcome {user.userName}</h2>

        <button style={styles.logoutBtn} onClick={onLogout}>
          Sign Out
        </button>
      </div>

      {/* CONTENT */}
      <ParkingForm user={user} />
    </div>
  );
}

const styles = {
  wrapper: {
    padding: "20px",
    color: "white",
    backgroundColor: "#121212",
    minHeight: "100vh",
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
};
