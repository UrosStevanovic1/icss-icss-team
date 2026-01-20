import React, { useEffect, useState } from "react";
import api from "../api";
import "./ConstraintOverview.css";

export default function AvailabilityOverview() {
  const [availabilities, setAvailabilities] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [errorMsg, setErrorMsg] = useState(""); // <-- banner controlado

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setErrorMsg(""); // <-- IMPORTANTE: limpia el banner antes de intentar

    try {
      const lecturerData = await api.getLecturers();
      setLecturers(lecturerData || []);
    } catch (e) {
      console.error("Lecturers load failed:", e);
      setLecturers([]);
    }

    try {
      const availData = await api.getAvailabilities();
      setAvailabilities(availData || []);
      setErrorMsg(""); // <-- si llegó aquí, endpoint OK, no banner
    } catch (e) {
      console.error("Availabilities load failed:", e);

      // Solo muestra banner si es REALMENTE 404
      const msg = String(e?.message || "");
      if (msg.includes("404")) {
        setErrorMsg("Heads up: Availabilities endpoint not found (check /docs path).");
      } else {
        setErrorMsg("Heads up: Could not load availabilities (check console/network).");
      }

      setAvailabilities([]);
    }
  }

  function openAdd() {
    setEditingId(null);
    setDraft({
      lecturer_id: "",
      day_of_week: "Monday",
      start_time: "09:00",
      end_time: "11:00",
      is_active: true,
    });
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setDraft({
      ...item,
      lecturer_id: String(item.lecturer_id ?? ""), // asegurar select
    });
    setModalOpen(true);
  }

  async function save() {
    try {
      const payload = {
        ...draft,
        lecturer_id: Number(draft.lecturer_id), // <-- CLAVE: backend espera int
      };

      if (!payload.lecturer_id) {
        alert("Please select a lecturer.");
        return;
      }

      if (editingId) {
        await api.updateAvailability(editingId, payload);
      } else {
        await api.createAvailability(payload);
      }

      setModalOpen(false);
      loadData();
    } catch (e) {
      console.error("Error saving availability:", e);
      alert("Error saving availability. Check console.");
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this availability slot?")) return;
    try {
      await api.deleteAvailability(id);
      loadData();
    } catch (e) {
      console.error("Error deleting availability:", e);
      alert("Error deleting availability. Check console.");
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h2 className="title">Work Availability Overview</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={loadData}>Refresh</button>
          <button className="btn" onClick={openAdd}>+ Add Availability</button>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffeeba",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "15px",
          }}
        >
          <strong>Heads up:</strong> {errorMsg.replace("Heads up: ", "")}
        </div>
      )}

      <table className="table">
        <thead className="thead">
          <tr>
            <th className="th" style={{ color: "#fff" }}>Lecturer</th>
            <th className="th" style={{ color: "#fff" }}>Day of Week</th>
            <th className="th" style={{ color: "#fff" }}>Time Slot</th>
            <th className="th" style={{ color: "#fff" }}>Status</th>
            <th className="th" style={{ color: "#fff" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {availabilities.length === 0 ? (
            <tr>
              <td className="td" colSpan={5}>No availability entries yet.</td>
            </tr>
          ) : (
            availabilities.map((item) => {
              const lecturer = lecturers.find((l) => l.id === item.lecturer_id);
              return (
                <tr key={item.id}>
                  <td className="td">
                    <strong>{lecturer ? lecturer.full_name : `Lecturer #${item.lecturer_id}`}</strong>
                  </td>
                  <td className="td">{item.day_of_week}</td>
                  <td className="td">{item.start_time} - {item.end_time}</td>
                  <td className="td">
                    <span style={{ color: item.is_active ? "green" : "red", fontWeight: "bold" }}>
                      {item.is_active ? "● Available" : "○ Unavailable"}
                    </span>
                  </td>
                  <td className="td">
                    <button className="editBtn" onClick={() => openEdit(item)}>Edit</button>
                    <button className="deleteBtn" onClick={() => remove(item.id)}>Delete</button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {modalOpen && (
        <div className="modalOverlay">
          <div className="modalContent">
            <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Availability" : "Add Availability"}</h3>

            <div className="formGroup">
              <label className="label">Lecturer</label>
              <select
                className="input"
                value={draft.lecturer_id}
                onChange={(e) => setDraft({ ...draft, lecturer_id: e.target.value })}
              >
                <option value="">-- Select Lecturer --</option>
                {lecturers.map((l) => (
                  <option key={l.id} value={l.id}>{l.full_name}</option>
                ))}
              </select>
            </div>

            <div className="formGroup">
              <label className="label">Day of Week</label>
              <select
                className="input"
                value={draft.day_of_week}
                onChange={(e) => setDraft({ ...draft, day_of_week: e.target.value })}
              >
                {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: "15px" }}>
              <div className="formGroup" style={{ flex: 1 }}>
                <label className="label">Start Time</label>
                <input
                  type="time"
                  className="input"
                  value={draft.start_time}
                  onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
                />
              </div>
              <div className="formGroup" style={{ flex: 1 }}>
                <label className="label">End Time</label>
                <input
                  type="time"
                  className="input"
                  value={draft.end_time}
                  onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="formGroup">
              <label className="label">Status</label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                />
                Is Available
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button
                className="btn"
                style={{ background: "#f8f9fa", border: "1px solid #ddd", color: "#333" }}
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button className="btn" onClick={save}>
                {editingId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
