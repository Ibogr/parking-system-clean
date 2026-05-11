import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ManagerPanel from "./pages/ManagerPanel";

import { jwtDecode } from "jwt-decode";

function App() {
  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);

  // App başlangıç loading
  const [loading, setLoading] = useState(true);

  // Global request loading
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);

      setUser({
        userName: decoded.userName,
        userEmail: decoded.userEmail,
        role: decoded.role,
      });
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial app loading
  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "22px",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <>
      {/* GLOBAL REQUEST LOADING */}
      {requestLoading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            color: "white",
            fontSize: "30px",
            fontWeight: "bold",
          }}
        >
          Loading...
        </div>
      )}

      {/* NOT LOGGED IN */}
      {!user ? (
        showSignup ? (
          <Signup
            switchToLogin={() => setShowSignup(false)}
            setRequestLoading={setRequestLoading}
          />
        ) : (
          <Login
            setRequestLoading={setRequestLoading}
            onLogin={(token) => {
              localStorage.setItem("token", token);

              const decoded = jwtDecode(token);

              setUser({
                userName: decoded.userName,
                userEmail: decoded.userEmail,
                role: decoded.role,
              });
            }}
            switchToSignup={() => setShowSignup(true)}
          />
        )
      ) : user.role === "manager" ? (
        <ManagerPanel
          setRequestLoading={setRequestLoading}
          onLogout={() => {
            localStorage.removeItem("token");
            setUser(null);
          }}
        />
      ) : (
        <Dashboard
          setRequestLoading={setRequestLoading}
          user={user}
          onLogout={() => {
            localStorage.removeItem("token");
            setUser(null);
          }}
        />
      )}
    </>
  );
}

export default App;
