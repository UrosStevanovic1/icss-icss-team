import { useState, useMemo, useEffect } from "react";
import api from "../api";

export default function ProgramsOverview() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");

  const [formMode, setFormMode] = useState("overview"); // overview | add | edit
  const [editingId, setEditingId] = useState(null);

  const [draft, setDraft] = useState({
    name: "",
    acronym: "",
    headOfProgram: "",
    isActive: true,
    startDate: "",
    totalEcts: 180,
  });

  async function loadPrograms() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.getPrograms();
      setPrograms(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(e?.message || "Failed to load programs");
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrograms();
  }, []);

  function openAdd() {
    setEditingId(null);
    setDraft({
      name: "",
      acronym: "",
      headOfProgram: "",
      isActive: true,
      startDate: "",
      totalEcts: 180,
    });
    setFormMode("add");
  }

  function openEdit(p) {
    setEditingId(p.id);
    setDraft({
      name: p.name || "",
      acronym: p.acronym || "",
      headOfProgram: p.head_of_program || "",
      isActive: !!p.is_active,
      startDate: p.start_date || "",
      totalEcts: p.total_ects ?? 180,
    });
    setFormMode("edit");
  }

  async function save() {
    if (!draft.name.trim()) return alert("Name is required");
    if (!draft.acronym.trim()) return alert("Acronym is required");
    if (!draft.headOfProgram.trim()) return alert("Head of Study is required");
    if (!draft.startDate.trim()) return alert("Start date is required");

    const payload = {
      name: draft.name.trim(),
      acronym: draft.acronym.trim(),
      head_of_program: draft.headOfProgram.trim(),
      is_active: !!draft.isActive,
      start_date: draft.startDate.trim(),
      total_ects: Number(draft.totalEcts),
    };

    try {
      if (formMode === "add") {
        await api.createProgram(payload);
      } else {
        await api.updateProgram(editingId, payload);
      }
      await loadPrograms();
      setFormMode("overview");
      setEditingId(null);
    } catch (e) {
      console.error(e);
      alert("Backend error while saving program.");
    }
  }

  async function remove(id) {
    const ok = window.confirm("Delete this program?");
    if (!ok) return;

    try {
      await api.deleteProgram(id);
      await loadPrograms();
    } catch (e) {
      console.error(e);
      alert("Backend error while deleting program.");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter((p) => {
      const specText = (p.specializations || [])
        .map((s) => `${s.name} ${s.acronym}`)
        .join(" ")
        .toLowerCase();
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.acronym || "").toLowerCase().includes(q) ||
        (p.head_of_program || "").toLowerCase().includes(q) ||
        specText.includes(q)
      );
    });
  }, [programs, query]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Program Overview</h2>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="add-btn" onClick={loadPrograms} type="button">
            ↻ Refresh
          </button>
          {formMode === "overview" && (
            <button className="add-btn" onClick={openAdd} type="button">
              + Add Program
            </button>
          )}
        </div>
      </div>

      <input
        style={{ maxWidth: 260, marginTop: 10 }}
        placeholder="Search program / specialization"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p style={{ marginTop: 10, fontSize: 13 }}>Loading programs...</p>}

      {loadError && (
        <p style={{ marginTop: 10, fontSize: 13, color: "crimson" }}>
          Backend error: {loadError}
        </p>
      )}

      {!loading && !loadError && formMode === "overview" && (
        <>
          <p style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            Tip: click Edit to update a row.
          </p>

          <table>
            <thead>
              <tr>
                <th>Official Name</th>
                <th>Specialization</th>
                <th>Head of Study</th>
                <th>Total ECTS</th>
                <th>Status</th>
                <th style={{ width: 170 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const specs = (p.specializations || [])
                  .map((s) => s.name)
                  .join(", ");

                return (
                  <tr key={p.id}>
                    <td>
                      {p.name} - {p.acronym}
                    </td>
                    <td>{specs || "-"}</td>
                    <td>{p.head_of_program}</td>
                    <td>{p.total_ects}</td>
                    <td>{p.is_active ? "Active" : "Inactive"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => openEdit(p)} type="button">
                          Edit
                        </button>
                        <button onClick={() => remove(p.id)} type="button">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {(formMode === "add" || formMode === "edit") && (
        <div className="form">
          <label>
            Official Name:
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g., Information Technology"
            />
          </label>

          <label>
            Acronym:
            <input
              value={draft.acronym}
              onChange={(e) => setDraft({ ...draft, acronym: e.target.value })}
              placeholder="e.g., IT"
            />
          </label>

          <label>
            Head of Study:
            <input
              value={draft.headOfProgram}
              onChange={(e) => setDraft({ ...draft, headOfProgram: e.target.value })}
              placeholder="e.g., Dr. Anna Schmidt"
            />
          </label>

          <label>
            Start Date (YYYY-MM-DD):
            <input
              value={draft.startDate}
              onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
              placeholder="2025-10-01"
            />
          </label>

          <label>
            Total ECTS:
            <input
              type="number"
              value={draft.totalEcts}
              onChange={(e) => setDraft({ ...draft, totalEcts: e.target.value })}
            />
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
            />
            Active
          </label>

          <div className="buttons">
            <button onClick={() => setFormMode("overview")} type="button">
              Cancel
            </button>
            <button className="save" onClick={save} type="button">
              {formMode === "add" ? "Create" : "Update"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
