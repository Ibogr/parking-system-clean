const BASE_URL = "http://localhost:5001";

// ================== TOKEN ==================
function getTokenHeader() {
  const token = localStorage.getItem("token");

  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

// ================== LOGIN ==================
export async function loginUser(data) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
}

// ================== SIGNUP ==================
export async function signupUser(userEmail, password, userName) {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail, password, userName }),
  });

  return res.json();
}

// ================== AUTH FETCH ==================
async function authFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getTokenHeader(),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text);
  }

  if (!res.ok) {
    throw new Error(data.message || text);
  }

  return data;
}
export async function downloadReport({ site, date }) {
  const query = new URLSearchParams({ site, date }).toString();

  const res = await fetch(`${BASE_URL}/reports/download?${query}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to download");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "report.pdf";
  a.click();
}
// ================== SUBMIT ==================
export function submitParkingBatch(data) {
  return authFetch(`${BASE_URL}/submit-batch`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ================== GET REPORT (FIXED) ==================
export function getReport({ site, date }) {
  const query = new URLSearchParams({ site, date }).toString();

  return authFetch(`${BASE_URL}/reports?${query}`, {
    method: "GET",
  });
}

// ================== LOGOUT ==================
export function logout() {
  localStorage.removeItem("token");
}
