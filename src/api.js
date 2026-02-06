const API_URL = process.env.NODE_ENV === 'production'
  ? "/api"
  : "http://127.0.0.1:8000";

const API_BASE_URL = API_URL.replace(/\/$/, "");

async function request(path, options = {}) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;

  // Auto-Attach Token
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    // If token expired (401), auto-logout
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      window.location.href = "/"; // Force reload to login
    }

    try {
      const errJson = JSON.parse(text);
      throw new Error(errJson.detail || `${res.status} ${res.statusText}`);
    } catch {
      throw new Error(`${res.status} ${res.statusText} - ${text}`);
    }
  }

  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

const api = {
  // --- AUTH ---
  login(email, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },

  // ---------- PROGRAMS ----------
  getPrograms() { return request("/study-programs/"); },
  createProgram(payload) { return request("/study-programs/", { method: "POST", body: JSON.stringify(payload) }); },
  updateProgram(id, payload) { return request(`/study-programs/${id}`, { method: "PUT", body: JSON.stringify(payload) }); },
  deleteProgram(id) { return request(`/study-programs/${id}`, { method: "DELETE" }); },

  // ---------- SPECIALIZATIONS ----------
  getSpecializations() { return request("/specializations/"); },
  createSpecialization(payload) { return request("/specializations/", { method: "POST", body: JSON.stringify(payload) }); },
  updateSpecialization(id, payload) { return request(`/specializations/${id}`, { method: "PUT", body: JSON.stringify(payload) }); },
  deleteSpecialization(id) { return request(`/specializations/${id}`, { method: "DELETE" }); },

  // ---------- MODULES ----------
  getModules() { return request("/modules/"); },
  createModule(payload) { return request("/modules/", { method: "POST", body: JSON.stringify(payload) }); },
  updateModule(id, payload) { return request(`/modules/${id}`, { method: "PUT", body: JSON.stringify(payload) }); },
  deleteModule(id) { return request(`/modules/${id}`, { method: "DELETE" }); },

  // ---------- LECTURERS ----------
  getLecturers() { return request("/lecturers/"); },
  createLecturer(payload) { return request("/lecturers/", { method: "POST", body: JSON.stringify(payload) }); },
  updateLecturer(id, payload) { return request(`/lecturers/${id}`, { method: "PUT", body: JSON.stringify(payload) }); },
  deleteLecturer(id) { return request(`/lecturers/${id}`, { method: "DELETE" }); },

  // ✅ NEW: LECTURER MODULE ASSIGNMENT
  getLecturerModules(id) {
    return request(`/lecturers/${id}/modules`);
  },
  setLecturerModules(id, module_codes) {
    return request(`/lecturers/${id}/modules`, {
      method: "PUT",
      body: JSON.stringify({ module_codes })
    });
  },

  // ---------- GROUPS ----------
  getGroups() { return request("/groups/"); },
  createGroup(payload) { return request("/groups/", { method: "POST", body: JSON.stringify(payload) }); },
  updateGroup(id, payload) { return request(`/groups/${id}`, { method: "PUT", body: JSON.stringify(payload) }); },
  deleteGroup(id) { return request(`/groups/${id}`, { method: "DELETE" }); },

  // ---------- ROOMS ----------
  getRooms() { return request("/rooms/"); },
  createRoom(payload) { return request("/rooms/", { method: "POST", body: JSON.stringify(payload) }); },
  updateRoom(id, payload) { return request(`/rooms/${id}`, { method: "PUT", body: JSON.stringify(payload) }); },
  deleteRoom(id) { return request(`/rooms/${id}`, { method: "DELETE" }); },

  // ---------- CONSTRAINT TYPES ----------
  getConstraintTypes() { return request("/constraint-types/"); },

  // ---------- SCHEDULER CONSTRAINTS ----------
  getConstraints() { return request("/scheduler-constraints/"); },
  createConstraint(payload) { return request("/scheduler-constraints/", { method: "POST", body: JSON.stringify(payload) }); },
  updateConstraint(id, payload) { return request(`/scheduler-constraints/${id}`, { method: "PUT", body: JSON.stringify(payload) }); },
  deleteConstraint(id) { return request(`/scheduler-constraints/${id}`, { method: "DELETE" }); },

  // ---------- AVAILABILITIES ----------
  getAvailabilities() { return request("/availabilities/"); },
  updateLecturerWeek(payload) { return request("/availabilities/update", { method: "POST", body: JSON.stringify(payload) }); },
  deleteLecturerAvailability(lecturerId) { return request(`/availabilities/lecturer/${lecturerId}`, { method: "DELETE" }); },
};

export default api;
