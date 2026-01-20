// src/api.js

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} - ${txt}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const api = {
  // ---------- PROGRAMS ----------
  getPrograms() {
    return request("/study-programs/");
  },
  createProgram(payload) {
    return request("/study-programs/", { method: "POST", body: JSON.stringify(payload) });
  },
  updateProgram(id, payload) {
    return request(`/study-programs/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteProgram(id) {
    return request(`/study-programs/${id}`, { method: "DELETE" });
  },

  // ---------- MODULES ----------
  getModules() {
    return request("/modules/");
  },
  createModule(payload) {
    return request("/modules/", { method: "POST", body: JSON.stringify(payload) });
  },
  updateModule(id, payload) {
    return request(`/modules/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteModule(id) {
    return request(`/modules/${id}`, { method: "DELETE" });
  },

  // ---------- LECTURERS ----------
  getLecturers() {
    return request("/lecturers/");
  },
  createLecturer(payload) {
    return request("/lecturers/", { method: "POST", body: JSON.stringify(payload) });
  },
  updateLecturer(id, payload) {
    return request(`/lecturers/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteLecturer(id) {
    return request(`/lecturers/${id}`, { method: "DELETE" });
  },

  // ---------- GROUPS ----------
  getGroups() {
    return request("/groups/");
  },
  createGroup(payload) {
    return request("/groups/", { method: "POST", body: JSON.stringify(payload) });
  },
  updateGroup(id, payload) {
    return request(`/groups/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteGroup(id) {
    return request(`/groups/${id}`, { method: "DELETE" });
  },

  // ---------- ROOMS ----------
  getRooms() {
    return request("/rooms/");
  },
  createRoom(payload) {
    return request("/rooms/", { method: "POST", body: JSON.stringify(payload) });
  },
  updateRoom(id, payload) {
    return request(`/rooms/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteRoom(id) {
    return request(`/rooms/${id}`, { method: "DELETE" });
  },

  // ---------- CONSTRAINT TYPES ----------
  getConstraintTypes() {
    return request("/constraint-types/");
  },

  // ---------- SCHEDULER CONSTRAINTS ----------
  getConstraints() {
    return request("/scheduler-constraints/");
  },
  createConstraint(payload) {
    return request("/scheduler-constraints/", { method: "POST", body: JSON.stringify(payload) });
  },
  updateConstraint(id, payload) {
    return request(`/scheduler-constraints/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteConstraint(id) {
    return request(`/scheduler-constraints/${id}`, { method: "DELETE" });
  },

  // ---------- AVAILABILITIES ----------
  getAvailabilities() {
    return request("/availabilities/");
  },
  createAvailability(payload) {
    return request("/availabilities/", { method: "POST", body: JSON.stringify(payload) });
  },
  // (Si todavía no tienes PUT/DELETE en backend, los dejamos igual y si falla lo ajustamos)
  updateAvailability(id, payload) {
    return request(`/availabilities/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteAvailability(id) {
    return request(`/availabilities/${id}`, { method: "DELETE" });
  },
};

export default api;
