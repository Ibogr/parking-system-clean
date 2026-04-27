import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ManagerPanel from "./pages/ManagerPanel";

import { jwtDecode } from "jwt-decode";

function App() {
  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return showSignup ? (
      <Signup switchToLogin={() => setShowSignup(false)} />
    ) : (
      <Login
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
    );
  }

  if (user.role === "manager") {
    return <ManagerPanel />;
  }

  return (
    <Dashboard
      user={user}
      onLogout={() => {
        localStorage.removeItem("token");
        setUser(null);
      }}
    />
  );
}

export default App;
