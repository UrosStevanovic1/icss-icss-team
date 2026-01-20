import { useEffect, useState } from "react";
import api from "../api";
import "./ConstraintOverview.css";

export default function ConstraintOverview() {
  const [constraints, setConstraints] = useState([]);
  const [types, setTypes] = useState([]);
  const [targets, setTargets] = useState({
    LECTURER: [],
    GROUP: [],
    MODULE: [],
    ROOM: [],
    GLOBAL: [{ id: 0, name: "Global (All)" }],
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  // Constants for form helpers
  const ROOM_TYPES = ["Lecture Classroom", "Computer Lab", "Game Design", "Seminar"];
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const results = await Promise.allSettled([
      api.getConstraints(),        // 0
      api.getConstraintTypes(),    // 1
      api.getLecturers(),          // 2
      api.getGroups(),             // 3
      api.getModules(),            // 4
      api.getRooms(),              // 5
    ]);

    const getValue = (i) => (results[i].status === "fulfilled" ? results[i].value : null);

    const cData = getValue(0) || [];
    const tData = getValue(1) || [];
    const lData = getValue(2) || [];
    const gData = getValue(3) || [];
    const mData = getValue(4) || [];
    const rData = getValue(5) || [];

    // Log EXACTLY what failed (super importante)
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error("loadData failed at index:", i, r.reason);
      }
    });

    setConstraints(cData);
    setTypes(tData);

    setTargets((prev) => ({
      ...prev,
      LECTURER: lData.map((x) => ({
        id: x.id,
        name: x.full_name || x.name || x.lecturer_name || "Unnamed",
      })),
      GROUP: gData.map((x) => ({
        id: x.id,
        name: x.group_name || x.name || "Unnamed",
      })),
      MODULE: mData.map((x) => ({
        id: x.module_id ?? x.id,
        name: x.module_name || x.name || "Unnamed",
      })),
      ROOM: rData.map((x) => ({
        id: x.id,
        name: x.name || x.room_name || "Unnamed",
      })),
      GLOBAL: [{ id: 0, name: "Global (All)" }],
    }));
  }

  function openAdd() {
    setEditingId(null);
    setDraft({
      name: "",
      constraint_type_id: types[0]?.id || 1,
      hardness: "HARD",
      scope: "GLOBAL",
      target_id: 0,
      valid_from: "2026-04-01",
      valid_to: "2026-09-30",
      constraint_rule: "",
      active: true,
      config: {},
    });
    setModalOpen(true);
  }

  function openEdit(c) {
    setEditingId(c.id);
    setDraft({ ...c });
    setModalOpen(true);
  }

  async function save() {
    try {
      const payload = {
        ...draft,
        target_id: Number(draft.target_id),
      };

      if (editingId) {
        await api.updateConstraint(editingId, payload);
      } else {
        await api.createConstraint(payload);
      }

      setModalOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error saving constraint.");
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete rule?")) return;
    try {
      await api.deleteConstraint(id);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error deleting constraint.");
    }
  }

  const renderParameters = () => {
    if (!draft) return null;

    const activeCode = types.find((t) => t.id === Number(draft.constraint_type_id))?.code;

    if (activeCode === "REQUIRED_ROOM_TYPE" || activeCode === "AVOID_ROOM_TYPE") {
      return (
        <div className="formGroup">
          <label className="label">Room Type (Format: String)</label>
          <select
            className="input"
            value={draft.config?.room_type || ""}
            onChange={(e) =>
              setDraft({ ...draft, config: { ...draft.config, room_type: e.target.value } })
            }
          >
            <option value="">-- Select Type --</option>
            {ROOM_TYPES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (activeCode === "TEACHER_UNAVAILABLE") {
      return (
        <div className="formGroup">
          <label className="label">Day (Format: String)</label>
          <select
            className="input"
            value={draft.config?.day || ""}
            onChange={(e) => setDraft({ ...draft, config: { ...draft.config, day: e.target.value } })}
          >
            <option value="">-- Select Day --</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="formGroup">
        <label className="label">Rule Configuration (JSON)</label>
        <textarea
          className="input"
          style={{ height: "60px", fontFamily: "monospace" }}
          value={JSON.stringify(draft.config || {})}
          onChange={(e) => {
            try {
              setDraft({ ...draft, config: JSON.parse(e.target.value) });
            } catch (err) {
              // ignore invalid JSON while typing
            }
          }}
        />
      </div>
    );
  };

  const targetOptions = draft ? targets[draft.scope] || [] : [];

  return (
    <div className="container">
      <div className="header">
        <h2 className="title">Scheduler Rules & Constraints</h2>
        <button className="btn" onClick={openAdd}>
          + Add Rule
        </button>
      </div>

      <table className="table">
        <thead className="thead">
          <tr>
            <th className="th">Constraint Name</th>
            <th className="th">Scope/Target</th>
            <th className="th">Validity</th>
            <th className="th">Active</th>
            <th className="th">Priority</th>
            <th className="th">Action</th>
          </tr>
        </thead>

        <tbody>
          {constraints.map((c) => {
            const typeCode = types.find((t) => t.id === c.constraint_type_id)?.code || "N/A";
            const targetName =
              (targets[c.scope] || []).find((t) => t.id === c.target_id)?.name || "All";

            return (
              <tr key={c.id}>
                <td className="td">
                  <strong>{c.name || "Unnamed"}</strong>
                  <br />
                  <small style={{ color: "#666" }}>{typeCode}</small>
                </td>

                <td className="td">
                  {c.scope}: {targetName}
                </td>

                <td className="td" style={{ fontSize: "0.8rem" }}>
                  {c.valid_from} to <br /> {c.valid_to}
                </td>

                <td className="td">
                  <span style={{ color: c.active ? "green" : "red", fontWeight: "bold" }}>
                    {c.active ? "● True" : "○ False"}
                  </span>
                </td>

                <td className="td">
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      background: c.hardness === "HARD" ? "#f8d7da" : "#d1e7dd",
                      color: c.hardness === "HARD" ? "#721c24" : "#0f5132",
                    }}
                  >
                    {c.hardness}
                  </span>
                </td>

                <td className="td">
                  <button className="editBtn" onClick={() => openEdit(c)}>
                    Edit
                  </button>
                  <button className="deleteBtn" onClick={() => remove(c.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {modalOpen && draft && (
        <div className="modalOverlay">
          <div className="modalContent">
            <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Constraint" : "Create Constraint"}</h3>

            <div className="formGroup">
              <label className="label">Constraint Name</label>
              <input
                className="input"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g., Mohammed NO Teaching on Fridays"
              />
            </div>

            <div style={{ display: "flex", gap: "15px" }}>
              <div className="formGroup" style={{ flex: 1 }}>
                <label className="label">Valid From (Date)</label>
                <input
                  type="date"
                  className="input"
                  value={draft.valid_from}
                  onChange={(e) => setDraft({ ...draft, valid_from: e.target.value })}
                />
              </div>

              <div className="formGroup" style={{ flex: 1 }}>
                <label className="label">Valid To (Date)</label>
                <input
                  type="date"
                  className="input"
                  value={draft.valid_to}
                  onChange={(e) => setDraft({ ...draft, valid_to: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "15px" }}>
              <div className="formGroup" style={{ flex: 1 }}>
                <label className="label">Constraint Level</label>
                <select
                  className="input"
                  value={draft.scope}
                  onChange={(e) => setDraft({ ...draft, scope: e.target.value, target_id: 0 })}
                >
                  {["GLOBAL", "LECTURER", "GROUP", "MODULE", "ROOM"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formGroup" style={{ flex: 1 }}>
                <label className="label">Constraint Target</label>
                <select
                  className="input"
                  value={draft.target_id}
                  onChange={(e) => setDraft({ ...draft, target_id: e.target.value })}
                >
                  <option value={0}>-- Select Target --</option>
                  {targetOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="formGroup">
              <label className="label">Constraint Rule (Logic Description)</label>
              <textarea
                className="input"
                style={{ height: "50px" }}
                value={draft.constraint_rule}
                onChange={(e) => setDraft({ ...draft, constraint_rule: e.target.value })}
                placeholder="e.g., Mohammed is not available on Fridays for lectures"
              />
            </div>

            <div
              style={{
                background: "#f9f9f9",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #eee",
              }}
            >
              <label className="label">Constraint Format & Type</label>
              <select
                className="input"
                value={draft.constraint_type_id}
                onChange={(e) => setDraft({ ...draft, constraint_type_id: e.target.value, config: {} })}
              >
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code}
                  </option>
                ))}
              </select>

              <div style={{ marginTop: "10px" }}>{renderParameters()}</div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div className="formGroup" style={{ marginBottom: 0 }}>
                <label className="label">Priority (Hardness)</label>
                <select
                  className="input"
                  value={draft.hardness}
                  onChange={(e) => setDraft({ ...draft, hardness: e.target.value })}
                >
                  <option value="HARD">HARD (Must)</option>
                  <option value="SOFT">SOFT (Prefer)</option>
                </select>
              </div>

              <div className="formGroup" style={{ marginBottom: 0 }}>
                <label className="label">Active Status (Boolean)</label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                  />
                  {draft.active ? "Active" : "Inactive"}
                </label>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                className="btn"
                style={{ background: "#f8f9fa", border: "1px solid #ddd", color: "#333" }}
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>

              <button className="btn" onClick={save}>
                {editingId ? "Update Constraint" : "Create Constraint"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
