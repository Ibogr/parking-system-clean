import { useState } from "react";
import { signupUser } from "../services/api";

export default function Signup({ switchToLogin, setRequestLoading }) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    try {
      // START LOADING
      setRequestLoading(true);

      const res = await signupUser(userEmail, password, userName);

      if (res.success) {
        alert("Account created ✅");
        switchToLogin();
      } else {
        alert("Signup failed ❌");
      }
    } catch (err) {
      console.log(err);
      alert("Server error ❌");
    } finally {
      // STOP LOADING
      setRequestLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.box}>
        <h2 style={styles.title}>Signup</h2>

        <input
          style={styles.input}
          placeholder="Name"
          onChange={(e) => setUserName(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Email"
          onChange={(e) => setUserEmail(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={styles.button} onClick={handleSignup}>
          Create Account
        </button>

        <p style={styles.link} onClick={switchToLogin}>
          Already have an account? Login
        </p>
      </div>
    </div>
  );
}

// ================== STYLES ==================
const styles = {
  wrapper: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
    fontFamily: "Arial",
  },

  box: {
    width: "320px",
    padding: "30px",
    backgroundColor: "#1a1a1a",
    borderRadius: "12px",
    border: "1px solid #333",
    boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  title: {
    textAlign: "center",
    color: "white",
    marginBottom: "10px",
  },

  input: {
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #333",
    backgroundColor: "#111",
    color: "white",
    outline: "none",
  },

  button: {
    padding: "12px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#333",
    color: "white",
    cursor: "pointer",
  },

  link: {
    textAlign: "center",
    color: "#aaa",
    cursor: "pointer",
    fontSize: "14px",
  },
};
