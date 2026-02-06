import { useState, useEffect, useMemo } from "react";
import api from "../api";

const styles = {
  container: {
    padding: "20px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: "#333",
    maxWidth: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "1px solid #ccc",
    paddingBottom: "15px",
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    color: "#333",
  },
  searchBar: {
    padding: "8px 12px",
    width: "300px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "0.95rem",
    marginBottom: "15px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
    border: "1px solid #ddd",
    fontSize: "0.9rem",
  },
  thead: {
    background: "#f2f2f2",
    borderBottom: "2px solid #ccc",
  },
  th: {
    textAlign: "left",
    padding: "10px 15px",
    fontWeight: "600",
    color: "#333333",
  },
  tr: {
    borderBottom: "1px solid #eee",
  },
  td: {
    padding: "10px 15px",
    verticalAlign: "middle",
  },
  btn: {
    padding: "6px 12px",
    borderRadius: "4px",
    border: "1px solid transparent",
    cursor: "pointer",
    fontSize: "0.9rem",
    marginLeft: "5px",
  },
  primaryBtn: { background: "#007bff", color: "white" },
  editBtn: { background: "#6c757d", color: "white" },
  deleteBtn: { background: "#dc3545", color: "white" },
  assignBtn: { background: "#17a2b8", color: "white" },

  // Icon Button for Add/Delete
  iconBtn: {
    padding: "8px",
    width: "35px",
    cursor: "pointer",
    border: "1px solid #ccc",
    borderRadius: "4px",
    background: "#f0f0f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.1rem",
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    background: "white",
    padding: "25px",
    borderRadius: "8px",
    width: "720px",
    maxWidth: "95%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
  },
  formGroup: { marginBottom: "15px" },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
    fontSize: "0.9rem",
  },
  input: {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    boxSizing: "border-box",
    background: "white",
  },

  // Chips for modules
  chipWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    padding: "10px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    background: "#fafafa",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 10px",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    background: "white",
    fontSize: "0.85rem",
    maxWidth: "100%",
  },
  chipCode: { fontWeight: 700, color: "#0f172a" },
  chipName: {
    color: "#475569",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "320px",
  },
  chipX: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#dc3545",
    fontWeight: 800,
    lineHeight: 1,
  },

  // Inline table display chips
  inlineChips: { display: "flex", flexWrap: "wrap", gap: "6px" },
  inlineChip: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    background: "#f8fafc",
    fontSize: "0.78rem",
    color: "#334155",
    maxWidth: "280px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  hint: { fontSize: "0.85rem", color: "#6b7280", marginTop: "8px" },
  divider: { border: 0, borderTop: "1px solid #eee", margin: "18px 0" },
};

const TITLES = ["Dr.", "Prof."];
const STANDARD_LOCATIONS = ["Berlin", "Düsseldorf", "Munich"];

export default function LecturerOverview() {
  const [lecturers, setLecturers] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formMode, setFormMode] = useState("overview"); // overview | add | edit | assign
  const [editingId, setEditingId] = useState(null);

  // Store custom locations found in DB or added by user
  const [customLocations, setCustomLocations] = useState([]);

  // Assign modal state
  const [assigningLecturer, setAssigningLecturer] = useState(null);
  const [assignQuery, setAssignQuery] = useState("");
  const [selectedModuleCodes, setSelectedModuleCodes] = useState([]);
  const [savingAssign, setSavingAssign] = useState(false);

  const [draft, setDraft] = useState({
    firstName: "",
    lastName: "",
    title: "Dr.", // Default to first option
    employmentType: "Full time",
    personalEmail: "",
    mdhEmail: "",
    phone: "",
    location: "",
    teachingLoad: "",
  });

  async function loadAll() {
    setLoading(true);
    try {
      const [lecData, modData] = await Promise.all([api.getLecturers(), api.getModules()]);

      // modules list for dropdown
      const modList = (Array.isArray(modData) ? modData : []).map((m) => ({
        module_code: m.module_code,
        name: m.name,
      }));
      setModules(modList);

      const mapped = (Array.isArray(lecData) ? lecData : []).map((x) => ({
        id: x.id,
        firstName: x.first_name,
        lastName: x.last_name,
        title: x.title || "",
        employmentType: x.employment_type,
        personalEmail: x.personal_email || "",
        mdhEmail: x.mdh_email || "",
        phone: x.phone || "",
        location: x.location || "",
        teachingLoad: x.teaching_load || "",
        fullName: `${x.first_name} ${x.last_name || ""}`.trim(),

        // ✅ expects backend to return: modules: [{module_code, name}, ...]
        modules: Array.isArray(x.modules) ? x.modules : [],
      }));

      setLecturers(mapped);

      // Extract existing custom locations from DB
      const existingCustom = mapped
        .map((l) => l.location)
        .filter((loc) => loc && loc.trim() !== "" && !STANDARD_LOCATIONS.includes(loc));

      setCustomLocations([...new Set(existingCustom)].sort());
    } catch (e) {
      alert("Error loading data: " + e.message);
      setLecturers([]);
      setModules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openAdd() {
    setEditingId(null);
    setDraft({
      firstName: "",
      lastName: "",
      title: "Dr.",
      employmentType: "Full time",
      personalEmail: "",
      mdhEmail: "",
      phone: "",
      location: "",
      teachingLoad: "",
    });
    setFormMode("add");
  }

  function openEdit(row) {
    setEditingId(row.id);
    setDraft({
      firstName: row.firstName || "",
      lastName: row.lastName || "",
      title: row.title || "Dr.",
      employmentType: row.employmentType || "Full time",
      personalEmail: row.personalEmail || "",
      mdhEmail: row.mdhEmail || "",
      phone: row.phone || "",
      location: row.location || "",
      teachingLoad: row.teachingLoad || "",
    });
    setFormMode("edit");
  }

  // ✅ Open assign modules modal
  async function openAssign(row) {
    try {
      setAssigningLecturer(row);
      setAssignQuery("");
      setSelectedModuleCodes([]);

      // Prefer live list from endpoint (so it stays correct even if list response changes)
      const assigned = await api.getLecturerModules(row.id); // returns [{module_code, name}, ...]
      const codes = (Array.isArray(assigned) ? assigned : []).map((m) => m.module_code);
      setSelectedModuleCodes(codes);

      setFormMode("assign");
    } catch (e) {
      alert("Error loading lecturer modules: " + e.message);
    }
  }

  function closeAssign() {
    setFormMode("overview");
    setAssigningLecturer(null);
    setAssignQuery("");
    setSelectedModuleCodes([]);
    setSavingAssign(false);
  }

  function addNewLocation() {
    const newLoc = prompt("Enter new location:");
    if (newLoc && newLoc.trim() !== "") {
      const formatted = newLoc.trim();
      if (!STANDARD_LOCATIONS.includes(formatted) && !customLocations.includes(formatted)) {
        setCustomLocations([...customLocations, formatted].sort());
      }
      setDraft({ ...draft, location: formatted });
    }
  }

  function deleteLocation() {
    if (!draft.location) return;
    if (STANDARD_LOCATIONS.includes(draft.location)) {
      alert("Cannot delete standard locations.");
      return;
    }
    if (window.confirm(`Remove "${draft.location}" from the list?`)) {
      setCustomLocations(customLocations.filter((t) => t !== draft.location));
      setDraft({ ...draft, location: "" });
    }
  }

  async function remove(id) {
    if (!window.confirm("Are you sure you want to delete this lecturer?")) return;
    try {
      await api.deleteLecturer(id);
      await loadAll();
    } catch (e) {
      alert("Error deleting lecturer: " + e.message);
    }
  }

  async function save() {
    if (!draft.firstName.trim() || !draft.title.trim() || !draft.mdhEmail.trim()) {
      return alert("First Name, Title, and MDH Email are required.");
    }

    const payload = {
      first_name: draft.firstName.trim(),
      last_name: draft.lastName.trim() || null,
      title: draft.title.trim(),
      employment_type: draft.employmentType,
      personal_email: draft.personalEmail.trim() || null,
      mdh_email: draft.mdhEmail.trim(),
      phone: draft.phone.trim() || null,
      location: draft.location.trim() || null,
      teaching_load: draft.teachingLoad.trim() || null,
    };

    try {
      if (formMode === "add") await api.createLecturer(payload);
      else await api.updateLecturer(editingId, payload);

      await loadAll();
      setFormMode("overview");
    } catch (e) {
      console.error(e);
      const msg = e.message || "Unknown error";
      if (msg.includes("422")) alert("Validation Error: Please check that all fields are correct.");
      else alert("Backend error while saving lecturer.");
    }
  }

  // ✅ Save modules assignment
  async function saveAssignedModules() {
    if (!assigningLecturer) return;
    setSavingAssign(true);
    try {
      await api.setLecturerModules(assigningLecturer.id, selectedModuleCodes);
      await loadAll();
      closeAssign();
    } catch (e) {
      alert("Error saving modules: " + e.message);
      setSavingAssign(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lecturers;
    return lecturers.filter(
      (l) =>
        l.fullName.toLowerCase().includes(q) ||
        (l.location || "").toLowerCase().includes(q) ||
        (l.title || "").toLowerCase().includes(q) ||
        (Array.isArray(l.modules) ? l.modules : [])
          .map((m) => `${m.module_code} ${m.name}`.toLowerCase())
          .join(" ")
          .includes(q)
    );
  }, [lecturers, query]);

  const modulesByCode = useMemo(() => {
    const map = new Map();
    for (const m of modules) map.set(m.module_code, m);
    return map;
  }, [modules]);

  const assignFilteredModules = useMemo(() => {
    const q = assignQuery.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) => m.module_code.toLowerCase().includes(q) || (m.name || "").toLowerCase().includes(q)
    );
  }, [modules, assignQuery]);

  function moduleLabel(m) {
    if (!m) return "";
    return `${m.module_code} — ${m.name}`;
  }

  function toggleModule(code) {
    setSelectedModuleCodes((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      return [...prev, code];
    });
  }

  function removeSelected(code) {
    setSelectedModuleCodes((prev) => prev.filter((c) => c !== code));
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Lecturer Overview</h2>
        <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={openAdd}>
          + New Lecturer
        </button>
      </div>

      <input
        style={styles.searchBar}
        placeholder="Search by name, location, title, or module..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>Full Name</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Location</th>
              <th style={styles.th}>MDH Email</th>
              <th style={styles.th}>Teaching Load</th>
              <th style={styles.th}>Modules</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} style={styles.tr}>
                <td style={styles.td}>{l.title}</td>
                <td style={styles.td}>
                  <strong>{l.fullName}</strong>
                </td>
                <td style={styles.td}>{l.employmentType}</td>
                <td style={styles.td}>{l.location || "-"}</td>
                <td style={styles.td}>{l.mdhEmail || "-"}</td>
                <td style={styles.td}>{l.teachingLoad || "-"}</td>

                {/* ✅ Modules column */}
                <td style={styles.td}>
                  {Array.isArray(l.modules) && l.modules.length > 0 ? (
                    <div style={styles.inlineChips}>
                      {l.modules.slice(0, 3).map((m) => (
                        <span key={m.module_code} style={styles.inlineChip} title={moduleLabel(m)}>
                          {m.module_code}
                        </span>
                      ))}
                      {l.modules.length > 3 && (
                        <span style={styles.inlineChip} title={l.modules.map((m) => moduleLabel(m)).join("\n")}>
                          +{l.modules.length - 3} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>
                  )}
                </td>

                <td style={{ ...styles.td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <button style={{ ...styles.btn, ...styles.assignBtn }} onClick={() => openAssign(l)}>
                    Assign Modules
                  </button>
                  <button style={{ ...styles.btn, ...styles.editBtn }} onClick={() => openEdit(l)}>
                    Edit
                  </button>
                  <button style={{ ...styles.btn, ...styles.deleteBtn }} onClick={() => remove(l.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* --- MODAL: Add/Edit Lecturer --- */}
      {(formMode === "add" || formMode === "edit") && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>{formMode === "add" ? "Add Lecturer" : "Edit Lecturer"}</h3>
              <button
                onClick={() => setFormMode("overview")}
                style={{ border: "none", background: "transparent", fontSize: "1.5rem", cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            {/* Title Selector */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Title</label>
              <select style={styles.select} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}>
                {TITLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>First Name</label>
                <input
                  style={styles.input}
                  value={draft.firstName}
                  onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                  placeholder="e.g., Mohamed"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Last Name</label>
                <input
                  style={styles.input}
                  value={draft.lastName}
                  onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                  placeholder="e.g., Salah"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
              {/* Location Selector (Standard + Custom) */}
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Location</label>
                <div style={{ display: "flex", gap: "5px" }}>
                  <select
                    style={{ ...styles.select, flex: 1 }}
                    value={draft.location}
                    onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  >
                    <option value="">-- Select Location --</option>
                    <optgroup label="Standard">
                      {STANDARD_LOCATIONS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </optgroup>
                    {customLocations.length > 0 && (
                      <optgroup label="Custom">
                        {customLocations.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  <button type="button" title="Add new location" onClick={addNewLocation} style={{ ...styles.iconBtn, background: "#e2e6ea" }}>
                    +
                  </button>

                  <button
                    type="button"
                    title="Delete selected custom location"
                    onClick={deleteLocation}
                    disabled={!customLocations.includes(draft.location)}
                    style={{
                      ...styles.iconBtn,
                      background: customLocations.includes(draft.location) ? "#f8d7da" : "#eee",
                      color: customLocations.includes(draft.location) ? "#721c24" : "#aaa",
                      cursor: customLocations.includes(draft.location) ? "pointer" : "default",
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.label}>Employment Type</label>
                <select
                  style={styles.select}
                  value={draft.employmentType}
                  onChange={(e) => setDraft({ ...draft, employmentType: e.target.value })}
                >
                  <option value="Full time">Full time</option>
                  <option value="Part time">Part time</option>
                  <option value="Freelancer">Freelancer</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>MDH Email</label>
                <input
                  style={styles.input}
                  value={draft.mdhEmail}
                  onChange={(e) => setDraft({ ...draft, mdhEmail: e.target.value })}
                  placeholder="e.g., anna@mdh.de"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Personal Email (Optional)</label>
                <input
                  style={styles.input}
                  value={draft.personalEmail}
                  onChange={(e) => setDraft({ ...draft, personalEmail: e.target.value })}
                  placeholder="e.g., anna@gmail.com"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Phone Number (Optional)</label>
              <input
                style={styles.input}
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                placeholder="e.g., +49 123 45678"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Teaching Load</label>
              <input
                style={styles.input}
                value={draft.teachingLoad}
                onChange={(e) => setDraft({ ...draft, teachingLoad: e.target.value })}
                placeholder="e.g., 18 SWS"
              />
            </div>

            <div style={{ marginTop: "25px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button style={{ ...styles.btn, background: "#f8f9fa", border: "1px solid #ddd" }} onClick={() => setFormMode("overview")}>
                Cancel
              </button>
              <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={save}>
                {formMode === "add" ? "Create" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Assign Modules --- */}
      {formMode === "assign" && assigningLecturer && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <div>
                <h3 style={{ margin: 0 }}>Assign Modules</h3>
                <div style={styles.hint}>
                  Lecturer: <strong>{assigningLecturer.fullName}</strong>
                </div>
              </div>
              <button onClick={closeAssign} style={{ border: "none", background: "transparent", fontSize: "1.5rem", cursor: "pointer" }}>
                ×
              </button>
            </div>

            <hr style={styles.divider} />

            <div style={styles.formGroup}>
              <label style={styles.label}>Search modules</label>
              <input
                style={styles.input}
                value={assignQuery}
                onChange={(e) => setAssignQuery(e.target.value)}
                placeholder="Type module code or name..."
              />
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Available modules</label>
                <div style={{ border: "1px solid #ddd", borderRadius: "6px", maxHeight: "280px", overflowY: "auto", background: "white" }}>
                  {assignFilteredModules.map((m) => {
                    const checked = selectedModuleCodes.includes(m.module_code);
                    return (
                      <label
                        key={m.module_code}
                        style={{
                          display: "flex",
                          gap: "10px",
                          padding: "10px",
                          borderBottom: "1px solid #f1f5f9",
                          cursor: "pointer",
                          alignItems: "center",
                        }}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleModule(m.module_code)} />
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700 }}>{m.module_code}</span>
                          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{m.name}</span>
                        </div>
                      </label>
                    );
                  })}
                  {assignFilteredModules.length === 0 && (
                    <div style={{ padding: "12px", color: "#94a3b8", fontStyle: "italic" }}>No modules found.</div>
                  )}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.label}>Assigned modules</label>
                <div style={styles.chipWrap}>
                  {selectedModuleCodes.length === 0 && (
                    <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No modules assigned.</div>
                  )}
                  {selectedModuleCodes.map((code) => {
                    const m = modulesByCode.get(code);
                    return (
                      <div key={code} style={styles.chip} title={m ? moduleLabel(m) : code}>
                        <span style={styles.chipCode}>{code}</span>
                        {m?.name ? <span style={styles.chipName}>{m.name}</span> : null}
                        <button type="button" style={styles.chipX} onClick={() => removeSelected(code)} aria-label="Remove">
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div style={styles.hint}>Tip: you can assign many modules to the same lecturer.</div>
              </div>
            </div>

            <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                style={{ ...styles.btn, background: "#f8f9fa", border: "1px solid #ddd" }}
                onClick={closeAssign}
                disabled={savingAssign}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.btn, ...styles.assignBtn, opacity: savingAssign ? 0.8 : 1 }}
                onClick={saveAssignedModules}
                disabled={savingAssign}
              >
                {savingAssign ? "Saving..." : "Save Modules"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
