import { useEffect, useMemo, useState } from "react";
import api from "../api";

// --- CONSISTENT STYLES ---
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
    color: "#444",
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

  modalOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
  },
  modalContent: {
    background: "white", padding: "25px", borderRadius: "8px",
    width: "500px", maxWidth: "95%", maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
  },
  formGroup: { marginBottom: "15px" },
  label: { display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9rem" },
  input: {
    width: "100%", padding: "8px", borderRadius: "4px",
    border: "1px solid #ccc", fontSize: "1rem", boxSizing: "border-box",
  },
  select: {
    width: "100%", padding: "8px", borderRadius: "4px",
    border: "1px solid #ccc", fontSize: "1rem", boxSizing: "border-box", background: "white"
  },
};

export default function GroupOverview() {
  const [groups, setGroups] = useState([]);
  const [programs, setPrograms] = useState([]);

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formMode, setFormMode] = useState("overview");
  const [editingId, setEditingId] = useState(null);

  const [draft, setDraft] = useState({
    groupName: "",
    size: "",
    description: "",
    email: "",
    parentGroup: "",
    program: "",
  });

  async function loadData() {
    setLoading(true);
    try {
      const [groupData, programData] = await Promise.all([
        api.getGroups(),
        api.getPrograms()
      ]);

      const mappedGroups = (Array.isArray(groupData) ? groupData : []).map((x) => ({
        id: x.id,
        groupName: x.name,
        size: x.size,
        description: x.description || "",
        email: x.email || "",
        parentGroup: x.parent_group || "",
        program: x.program || "",
      }));
      setGroups(mappedGroups);
      setPrograms(Array.isArray(programData) ? programData : []);

    } catch (e) {
      alert("Error loading data: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openAdd() {
    setEditingId(null);
    setDraft({ groupName: "", size: "", description: "", email: "", parentGroup: "", program: "" });
    setFormMode("add");
  }

  function openEdit(row) {
    setEditingId(row.id);
    setDraft({
      groupName: row.groupName || "",
      size: String(row.size ?? ""),
      description: row.description || "",
      email: row.email || "",
      parentGroup: row.parentGroup || "",
      program: row.program || "",
    });
    setFormMode("edit");
  }

  async function save() {
    if (!draft.groupName.trim()) return alert("Group name is required");

    const payload = {
      name: draft.groupName.trim(),
      size: Number(draft.size),
      description: draft.description.trim() || null,
      email: draft.email.trim() || null,
      parent_group: draft.parentGroup.trim() || null,
      program: draft.program.trim() || null,
    };

    try {
      if (formMode === "add") {
        await api.createGroup(payload);
      } else {
        await api.updateGroup(editingId, payload);
      }
      await loadData();
      setFormMode("overview");
    } catch (e) {
      console.error(e);
      alert("Backend error while saving group. Check console.");
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this group?")) return;
    try {
      await api.deleteGroup(id);
      loadData();
    } catch (e) {
      alert("Backend error while deleting group.");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      g.groupName.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.program.toLowerCase().includes(q)
    );
  }, [groups, query]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Group Overview</h2>
        <button style={{...styles.btn, ...styles.primaryBtn}} onClick={openAdd}>
          + New Group
        </button>
      </div>

      <input
        style={styles.searchBar}
        placeholder="Search by name, description, or program..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? <p>Loading...</p> : (
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Group Name</th>
              <th style={styles.th}>Size</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Parent Group</th>
              <th style={styles.th}>Program</th>
              <th style={{...styles.th, textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => (
              <tr key={g.id} style={styles.tr}>
                <td style={styles.td}>
                    <strong>{g.groupName}</strong>
                </td>
                <td style={styles.td}>{g.size}</td>
                <td style={styles.td}>{g.description || "-"}</td>
                <td style={styles.td}>{g.email || "-"}</td>
                <td style={styles.td}>{g.parentGroup || "-"}</td>
                <td style={styles.td}>{g.program || "-"}</td>
                <td style={{...styles.td, textAlign:'right', whiteSpace:'nowrap'}}>
                  <button style={{...styles.btn, ...styles.editBtn}} onClick={() => openEdit(g)}>Edit</button>
                  <button style={{...styles.btn, ...styles.deleteBtn}} onClick={() => remove(g.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* --- MODAL --- */}
      {(formMode === "add" || formMode === "edit") && (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                    <h3 style={{margin:0}}>{formMode === "add" ? "Create Group" : "Edit Group"}</h3>
                    <button onClick={() => setFormMode("overview")} style={{border:'none', background:'transparent', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Name</label>
                    <input style={styles.input} value={draft.groupName} onChange={(e) => setDraft({ ...draft, groupName: e.target.value })} placeholder=""/>
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Size</label>
                    <input type="number" style={styles.input} value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })} placeholder=""/>
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Email</label>
                    <input style={styles.input} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="" />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Brief Description</label>
                    <input style={styles.input} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="e.g., A group focused on software development"/>
                </div>

                {/* ✅ Parent Group Selector (Simplified) */}
                <div style={styles.formGroup}>
                    <label style={styles.label}>Parent Group (Optional)</label>
                    <select
                        style={styles.select}
                        value={draft.parentGroup}
                        onChange={(e) => setDraft({ ...draft, parentGroup: e.target.value })}
                    >
                        <option value="">-- No Parent Group --</option>
                        {groups
                            .filter(g => g.id !== editingId) // Prevent selecting self as parent
                            .map(g => (
                                <option key={g.id} value={g.groupName}>
                                    {g.groupName}
                                </option>
                            ))
                        }
                    </select>
                </div>

                {/* Program Selector */}
                <div style={styles.formGroup}>
                    <label style={styles.label}>Program (Optional)</label>
                    <select
                        style={styles.select}
                        value={draft.program}
                        onChange={(e) => setDraft({ ...draft, program: e.target.value })}
                    >
                        <option value="">-- Select Program --</option>
                        {programs.map(p => (
                            <option key={p.id} value={p.name}>
                                {p.name} ({p.level})
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{marginTop: '25px', display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                    <button style={{...styles.btn, background:'#f8f9fa', border:'1px solid #ddd'}} onClick={() => setFormMode("overview")}>Cancel</button>
                    <button style={{...styles.btn, ...styles.primaryBtn}} onClick={save}>
                        {formMode === "add" ? "Create" : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}