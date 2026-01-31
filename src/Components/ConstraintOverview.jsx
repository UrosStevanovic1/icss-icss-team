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

  // Helper lists for the "AI Parameters"
  const ROOM_TYPES = ["Lecture Classroom", "Computer Lab", "Game Design", "Seminar"];
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const results = await Promise.allSettled([
      api.getConstraints(),
      api.getConstraintTypes(),
      api.getLecturers(),
      api.getGroups(),
      api.getModules(),
      api.getRooms(),
    ]);

    const getValue = (i) => (results[i].status === "fulfilled" ? results[i].value : null);

    const cData = getValue(0) || [];
    const tData = getValue(1) || [];
    const lData = getValue(2) || [];
    const gData = getValue(3) || [];
    const mData = getValue(4) || [];
    const rData = getValue(5) || [];

    setConstraints(cData);
    setTypes(tData);

    setTargets((prev) => ({
      ...prev,
      LECTURER: lData.map((x) => ({
        id: x.id,
        name: `${x.first_name} ${x.last_name || ""}`.trim(),
      })),
      GROUP: gData.map((x) => ({
        id: x.id,
        name: x.name || "Unnamed",
      })),
      MODULE: mData.map((x) => ({
        id: x.module_code || x.module_code, // Use module_code as ID for modules
        name: x.name || "Unnamed",
      })),
      ROOM: rData.map((x) => ({
        id: x.id,
        name: x.name || "Unnamed",
      })),
      GLOBAL: [{ id: 0, name: "Global (All)" }],
    }));
  }

  function openAdd() {
    setEditingId(null);
    setDraft({
      constraint_type_id: types[0]?.id || 1,
      hardness: "Hard",
      scope: "Global", // Capitalized to match Literal in schema if needed, or normalized in save
      target_id: 0,
      notes: "",
      is_enabled: true,
      config: {},
    });
    setModalOpen(true);
  }

  function openEdit(c) {
    setEditingId(c.id);
    setDraft({
        ...c,
        // Ensure defaults if fields are missing
        config: c.config || {},
        notes: c.notes || "",
        is_enabled: c.is_enabled ?? true
    });
    setModalOpen(true);
  }

  async function save() {
    try {
      // ✅ FIX: Map Frontend Draft -> Backend Schema (SchedulerConstraintCreate)
      const payload = {
        constraint_type_id: Number(draft.constraint_type_id),
        hardness: draft.hardness,
        scope: draft.scope,
        target_id: Number(draft.target_id),
        config: draft.config,
        is_enabled: draft.is_enabled,
        notes: draft.notes
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
      alert("Error saving constraint. Check console for details.");
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

  // This renders the specific parameters the AI needs to follow the rule
  const renderParameters = () => {
    if (!draft) return null;

    const activeType = types.find((t) => t.id === Number(draft.constraint_type_id));
    const activeName = activeType?.name || "";

    // Example: If rule is "Required Room Type", AI needs to know WHICH type.
    if (activeName.includes("Room Type")) {
      return (
        <div className="formGroup">
          <label className="label">Parameter: Room Type</label>
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

    // Example: If rule is about specific Days
    if (activeName.includes("Day") || activeName.includes("Unavailable")) {
      return (
        <div className="formGroup">
          <label className="label">Parameter: Day</label>
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

    // Fallback: Raw JSON for advanced/unknown rules
    return (
      <div className="formGroup">
        <label className="label">AI Parameters (JSON)</label>
        <div style={{fontSize: '0.8rem', color: '#666', marginBottom: '5px'}}>
            Advanced settings for the AI Scheduler.
        </div>
        <textarea
          className="input"
          style={{ height: "60px", fontFamily: "monospace", fontSize: "0.85rem" }}
          value={JSON.stringify(draft.config || {})}
          onChange={(e) => {
            try {
              setDraft({ ...draft, config: JSON.parse(e.target.value) });
            } catch (err) {
              // Allow typing invalid JSON temporarily
            }
          }}
        />
      </div>
    );
  };

  const targetOptions = draft ? targets[draft.scope.toUpperCase()] || [] : [];

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
            <th className="th">Constraint Type</th>
            <th className="th">Target</th>
            <th className="th">Notes</th>
            <th className="th">Active</th>
            <th className="th">Priority</th>
            <th className="th">Action</th>
          </tr>
        </thead>

        <tbody>
          {constraints.map((c) => {
            const typeObj = types.find((t) => t.id === c.constraint_type_id);
            const typeName = typeObj?.name || "Unknown Type";

            const targetList = targets[c.scope.toUpperCase()] || [];
            // Handle mixing of string/int IDs
            const targetName = targetList.find((t) => String(t.id) === String(c.target_id))?.name || "All";

            return (
              <tr key={c.id}>
                <td className="td">
                  <strong>{typeName}</strong>
                </td>

                <td className="td">
                  <span style={{fontSize:'0.85rem', color:'#555', textTransform:'uppercase', fontWeight:'bold'}}>{c.scope}</span>
                  <br/>
                  {targetName}
                </td>

                <td className="td" style={{ color: "#666" }}>
                  {c.notes || "-"}
                </td>

                <td className="td">
                  <span style={{ color: c.is_enabled ? "green" : "#ccc", fontWeight: "bold" }}>
                    {c.is_enabled ? "Active" : "Inactive"}
                  </span>
                </td>

                <td className="td">
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      background: c.hardness === "Hard" ? "#f8d7da" : "#d1e7dd",
                      color: c.hardness === "Hard" ? "#721c24" : "#0f5132",
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

            <div style={{
                background: "#f9f9f9",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #eee",
              }}>
              <label className="label">Constraint Type</label>
              <select
                className="input"
                value={draft.constraint_type_id}
                onChange={(e) => setDraft({ ...draft, constraint_type_id: e.target.value, config: {} })}
              >
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <div style={{ marginTop: "10px" }}>{renderParameters()}</div>
            </div>

            <div style={{ display: "flex", gap: "15px" }}>
              <div className="formGroup" style={{ flex: 1 }}>
                <label className="label">Scope (Level)</label>
                <select
                  className="input"
                  value={draft.scope}
                  onChange={(e) => setDraft({ ...draft, scope: e.target.value, target_id: 0 })}
                >
                  {["Global", "Lecturer", "Group", "Module", "Room"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formGroup" style={{ flex: 1 }}>
                <label className="label">Target</label>
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
              <label className="label">Description / Notes</label>
              <textarea
                className="input"
                style={{ height: "50px" }}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="e.g., Room A-101 is reserved for Chemistry on Mondays"
              />
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
                <label className="label">Priority</label>
                <select
                  className="input"
                  value={draft.hardness}
                  onChange={(e) => setDraft({ ...draft, hardness: e.target.value })}
                >
                  <option value="Hard">Hard (Must Follow)</option>
                  <option value="Soft">Soft (Preference)</option>
                </select>
              </div>

              <div className="formGroup" style={{ marginBottom: 0 }}>
                <label className="label">Status</label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={draft.is_enabled}
                    onChange={(e) => setDraft({ ...draft, is_enabled: e.target.checked })}
                  />
                  {draft.is_enabled ? "Enabled" : "Disabled"}
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
                {editingId ? "Update Rule" : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}