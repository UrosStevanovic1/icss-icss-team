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
  title: { margin: 0, fontSize: "1.5rem", color: "#333" },
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
  thead: { background: "#f2f2f2", borderBottom: "2px solid #ccc" },
  th: { textAlign: "left", padding: "10px 15px", fontWeight: "600", color: "#333333" },
  tr: { borderBottom: "1px solid #eee" },
  td: { padding: "10px 15px", verticalAlign: "middle" },
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
  label: { display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "0.9rem" },
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

  // Tag styles
  tagWrap: { display: "flex", flexWrap: "wrap", gap: "6px" },
  tag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    fontSize: "0.85rem",
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
  tagX: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "1rem",
    lineHeight: 1,
    color: "#4f46e5",
    padding: 0,
  },

  miniOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  miniModal: {
    background: "white",
    width: "420px",
    maxWidth: "92vw",
    borderRadius: "10px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
    overflow: "hidden",
  },
  miniHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    borderBottom: "1px solid #eee",
  },
  miniTitle: { margin: 0, fontSize: "1.05rem" },
  miniBody: { padding: "14px 16px" },
  miniFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    padding: "14px 16px",
    borderTop: "1px solid #eee",
    background: "#fafafa",
  },
  closeX: { border: "none", background: "transparent", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 },
  dangerText: { color: "#dc3545", fontSize: "0.85rem", marginTop: "8px" },
};

const TITLES = ["Dr.", "Prof."];
const STANDARD_LOCATIONS = ["Berlin", "Düsseldorf", "Munich"];

function normalizeDomainsFromLecturerRow(x) {
  // Preferred future shape: x.domains = [{id, name}] or ["Networking", ...]
  if (Array.isArray(x.domains)) {
    return x.domains
      .map((d) => {
        if (typeof d === "string") return { id: null, name: d };
        if (d && typeof d === "object") return { id: d.id ?? null, name: d.name ?? "" };
        return null;
      })
      .filter((d) => d && d.name);
  }

  // Current shape fallback: single domain string
  if (x.domain && typeof x.domain === "string") {
    return [{ id: x.domain_id ?? null, name: x.domain }];
  }

  return [];
}

export default function LecturerOverview() {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formMode, setFormMode] = useState("overview"); // overview | add | edit
  const [editingId, setEditingId] = useState(null);

  const [customLocations, setCustomLocations] = useState([]);

  // Domains from DB: [{id, name}]
  const [domains, setDomains] = useState([]);

  const [showDomainModal, setShowDomainModal] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [domainError, setDomainError] = useState("");

  // For selecting domains in the form (dropdown -> adds a tag)
  const [domainPick, setDomainPick] = useState("");

  const [draft, setDraft] = useState({
    firstName: "",
    lastName: "",
    title: "Dr.",
    employmentType: "Full time",
    personalEmail: "",
    mdhEmail: "",
    phone: "",
    location: "",
    teachingLoad: "",
    // NEW: multiple domain ids
    domain_ids: [], // array of strings (select values)
  });

  async function loadAll() {
    setLoading(true);
    try {
      const [lecData, domData] = await Promise.all([api.getLecturers(), api.getDomains()]);

      const mapped = (Array.isArray(lecData) ? lecData : []).map((x) => {
        const domainsArr = normalizeDomainsFromLecturerRow(x);

        // If backend already provides domain_ids, use them.
        // Otherwise fallback to single domain_id (if any).
        const domainIdsFromApi =
          Array.isArray(x.domain_ids) && x.domain_ids.length
            ? x.domain_ids.map((id) => String(id))
            : x.domain_id != null
              ? [String(x.domain_id)]
              : [];

        return {
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
          domains: domainsArr, // [{id, name}]
          domain_ids: domainIdsFromApi, // ["1","2"]
          fullName: `${x.first_name} ${x.last_name || ""}`.trim(),
        };
      });

      setLecturers(mapped);

      const existingCustom = mapped
        .map((l) => l.location)
        .filter((loc) => loc && loc.trim() !== "" && !STANDARD_LOCATIONS.includes(loc));
      setCustomLocations([...new Set(existingCustom)].sort());

      const doms = Array.isArray(domData) ? domData : [];
      setDomains(doms.map((d) => ({ id: d.id, name: d.name })));
    } catch (e) {
      alert("Error loading data: " + e.message);
      setLecturers([]);
      setDomains([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openAdd() {
    setEditingId(null);
    setDomainPick("");
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
      domain_ids: [],
    });
    setFormMode("add");
  }

  function openEdit(row) {
    setEditingId(row.id);
    setDomainPick("");
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
      domain_ids: Array.isArray(row.domain_ids) ? row.domain_ids : [],
    });
    setFormMode("edit");
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

  function openDomainModal() {
    setDomainError("");
    setNewDomain("");
    setShowDomainModal(true);
  }

  function closeDomainModal() {
    setShowDomainModal(false);
    setNewDomain("");
    setDomainError("");
  }

  // Add selected domain from dropdown as a tag
  function addPickedDomain() {
    const picked = (domainPick || "").trim();
    if (!picked) return;

    setDraft((prev) => {
      if (prev.domain_ids.includes(picked)) return prev;
      return { ...prev, domain_ids: [...prev.domain_ids, picked] };
    });
    setDomainPick("");
  }

  function removeDomainTag(domainIdStr) {
    setDraft((prev) => ({
      ...prev,
      domain_ids: prev.domain_ids.filter((id) => id !== domainIdStr),
    }));
  }

  // Create domain in DB, then add it to list + select it (as a tag)
  async function confirmAddDomain() {
    const formatted = (newDomain || "").trim();
    if (!formatted) {
      setDomainError("Domain name cannot be empty.");
      return;
    }

    try {
      const created = await api.createDomain({ name: formatted });
      const createdObj = { id: created.id, name: created.name };

      const next = [...domains.filter((d) => d.id !== createdObj.id), createdObj].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setDomains(next);

      // auto-add as tag
      const createdIdStr = String(createdObj.id);
      setDraft((prev) => ({
        ...prev,
        domain_ids: prev.domain_ids.includes(createdIdStr) ? prev.domain_ids : [...prev.domain_ids, createdIdStr],
      }));

      closeDomainModal();
    } catch (e) {
      setDomainError(e.message || "Error creating domain.");
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

      // NEW: multiple domains (backend will implement later)
      domain_ids: (draft.domain_ids || []).map((x) => Number(x)),
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lecturers;

    return lecturers.filter((l) => {
      const domainText = (l.domains || []).map((d) => d.name).join(" ").toLowerCase();
      return (
        l.fullName.toLowerCase().includes(q) ||
        (l.location || "").toLowerCase().includes(q) ||
        domainText.includes(q) ||
        (l.title || "").toLowerCase().includes(q)
      );
    });
  }, [lecturers, query]);

  // helper: domain id -> name
  const domainNameById = useMemo(() => {
    const map = new Map();
    domains.forEach((d) => map.set(String(d.id), d.name));
    return map;
  }, [domains]);

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
        placeholder="Search by name, location, title, or domain..."
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
              <th style={styles.th}>Domain</th>
              <th style={styles.th}>MDH Email</th>
              <th style={styles.th}>Teaching Load</th>
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

                {/* Domains as tags */}
                <td style={styles.td}>
                  {l.domains && l.domains.length ? (
                    <div style={styles.tagWrap}>
                      {l.domains.map((d, idx) => (
                        <span key={`${d.name}-${idx}`} style={styles.tag}>
                          {d.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>

                {/* Clickable email */}
                <td style={styles.td}>
                  {l.mdhEmail ? (
                    <a href={`mailto:${l.mdhEmail}`} style={{ color: "#0b5ed7", textDecoration: "none" }}>
                      {l.mdhEmail}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>

                <td style={styles.td}>{l.teachingLoad || "-"}</td>

                <td style={{ ...styles.td, textAlign: "right", whiteSpace: "nowrap" }}>
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

            {/* MULTI-DOMAIN TAG INPUT */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Domains</label>

              {/* Selected tags */}
              <div style={{ ...styles.tagWrap, marginBottom: "10px" }}>
                {(draft.domain_ids || []).length ? (
                  draft.domain_ids.map((idStr) => (
                    <span key={idStr} style={styles.tag}>
                      {domainNameById.get(idStr) || `Domain #${idStr}`}
                      <button type="button" style={styles.tagX} onClick={() => removeDomainTag(idStr)} aria-label="Remove domain">
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>No domains selected</span>
                )}
              </div>

              {/* Picker row */}
              <div style={{ display: "flex", gap: "5px" }}>
                <select style={{ ...styles.select, flex: 1 }} value={domainPick} onChange={(e) => setDomainPick(e.target.value)}>
                  <option value="">-- Select Domain --</option>
                  {domains.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name}
                    </option>
                  ))}
                </select>

                <button type="button" title="Add selected domain" onClick={addPickedDomain} style={{ ...styles.iconBtn, background: "#e2e6ea" }}>
                  +
                </button>

                <button
                  type="button"
                  title="Create new domain"
                  onClick={openDomainModal}
                  style={{ ...styles.iconBtn, background: "#e2e6ea" }}
                >
                  ✚
                </button>
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
              <button
                style={{ ...styles.btn, background: "#f8f9fa", border: "1px solid #ddd" }}
                onClick={() => setFormMode("overview")}
              >
                Cancel
              </button>
              <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={save}>
                {formMode === "add" ? "Create" : "Save Changes"}
              </button>
            </div>

            {/* Create Domain mini modal */}
            {showDomainModal && (
              <div style={styles.miniOverlay} onMouseDown={closeDomainModal}>
                <div style={styles.miniModal} onMouseDown={(e) => e.stopPropagation()}>
                  <div style={styles.miniHeader}>
                    <h4 style={styles.miniTitle}>Create domain</h4>
                    <button style={styles.closeX} onClick={closeDomainModal} aria-label="Close">
                      ×
                    </button>
                  </div>

                  <div style={styles.miniBody}>
                    <label style={styles.label}>Domain name</label>
                    <input
                      autoFocus
                      style={styles.input}
                      value={newDomain}
                      onChange={(e) => {
                        setNewDomain(e.target.value);
                        if (domainError) setDomainError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmAddDomain();
                        if (e.key === "Escape") closeDomainModal();
                      }}
                      placeholder="Type a domain name..."
                    />
                    {domainError ? <div style={styles.dangerText}>{domainError}</div> : null}
                  </div>

                  <div style={styles.miniFooter}>
                    <button style={{ ...styles.btn, background: "#fff", border: "1px solid #ddd" }} onClick={closeDomainModal}>
                      Cancel
                    </button>
                    <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={confirmAddDomain}>
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
