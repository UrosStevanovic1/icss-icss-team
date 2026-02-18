import React, { useState, useEffect, useMemo } from "react";
import { Trash2, Plus, Calendar, Loader2, Search, X } from "lucide-react";
import api from "../api";

const styles = {
    container: { padding: "20px", fontFamily: "'Inter', sans-serif", color: "#333", maxWidth: "1200px", margin: "0 auto" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
    title: { margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "#1e293b", display: "flex", alignItems: "center", gap: "10px" },

    controlsBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "15px", flexWrap: "wrap" },
    searchContainer: { position: "relative", flex: 1, maxWidth: "400px" },
    searchBar: {
        padding: "10px 15px 10px 40px",
        borderRadius: "8px",
        border: "1px solid #cbd5e1",
        fontSize: "0.95rem",
        width: "100%",
        background: "white",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        outline: "none",
    },
    searchIcon: { position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" },

    tableContainer: { border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
    table: { width: "100%", borderCollapse: "collapse", background: "white", fontSize: "0.95rem" },
    th: { background: "#f8fafc", padding: "14px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" },
    td: { padding: "14px 16px", borderBottom: "1px solid #f1f5f9", color: "#334155", verticalAlign: "middle" },

    btn: { padding: "10px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600", transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: "8px" },
    primaryBtn: { background: "#3b82f6", color: "white", boxShadow: "0 2px 4px rgba(59,130,246,0.2)" },
    secondaryBtn: { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" },
    dangerBtn: { background: "#fee2e2", color: "#ef4444" },

    overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    modal: { backgroundColor: "#ffffff", padding: "30px", borderRadius: "12px", width: "500px", maxWidth: "95vw", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" },

    formGroup: { marginBottom: "15px" },
    label: { display: "block", marginBottom: "5px", fontWeight: "600", fontSize: "0.85rem", color: "#64748b" },
    input: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box" },

    badge: { padding: "4px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "700", background: "#f1f5f9", color: "#475569" }
};

export default function SemesterManager({ currentUserRole }) {
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: "", acronym: "", start_date: "", end_date: "" });

    useEffect(() => { fetchSemesters(); }, []);

    const fetchSemesters = async () => {
        try {
            const data = await api.getSemesters();
            setSemesters(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.createSemester(formData);
            setFormData({ name: "", acronym: "", start_date: "", end_date: "" });
            setShowModal(false);
            fetchSemesters();
        } catch (err) {
            alert(err.message || "Error creating semester");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this semester? This action cannot be undone.")) return;
        try {
            await api.deleteSemester(id);
            fetchSemesters();
        } catch (err) {
            alert("Delete failed");
        }
    };

    const filteredSemesters = useMemo(() => {
        const q = query.toLowerCase().trim();
        return semesters.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.acronym.toLowerCase().includes(q)
        );
    }, [semesters, query]);

    const role = (currentUserRole || "").toLowerCase();
    const canEdit = ["pm", "admin"].includes(role);

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}><Calendar className="text-blue-500" /> Semester Management</h2>
                {canEdit && (
                    <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={() => setShowModal(true)}>
                        <Plus size={18} /> New Semester
                    </button>
                )}
            </div>

            <div style={styles.controlsBar}>
                <div style={styles.searchContainer}>
                    <Search style={styles.searchIcon} size={18} />
                    <input
                        style={styles.searchBar}
                        placeholder="Search by name or acronym..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                    <tr>
                        <th style={styles.th}>Semester Name</th>
                        <th style={styles.th}>Acronym</th>
                        <th style={styles.th}>Start Date</th>
                        <th style={styles.th}>End Date</th>
                        {canEdit && <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>}
                    </tr>
                    </thead>
                    <tbody>
                    {filteredSemesters.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td style={{ ...styles.td, fontWeight: "600", color: "#1e293b" }}>{s.name}</td>
                            <td style={styles.td}><span style={styles.badge}>{s.acronym}</span></td>
                            <td style={styles.td}>{new Date(s.start_date).toLocaleDateString()}</td>
                            <td style={styles.td}>{new Date(s.end_date).toLocaleDateString()}</td>
                            {canEdit && (
                                <td style={{ ...styles.td, textAlign: "right" }}>
                                    <button
                                        onClick={() => handleDelete(s.id)}
                                        style={{ ...styles.btn, ...styles.dangerBtn, padding: "6px" }}
                                        title="Delete Semester"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                    {filteredSemesters.length === 0 && (
                        <tr>
                            <td colSpan={canEdit ? 5 : 4} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>
                                No semesters found.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h3 style={{ margin: 0, fontSize: "1.25rem" }}>Add New Semester</h3>
                            <button onClick={() => setShowModal(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b" }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Semester Name</label>
                                <input
                                    style={styles.input}
                                    placeholder="e.g. Winter Semester 2025"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Acronym</label>
                                <input
                                    style={styles.input}
                                    placeholder="e.g. WS25"
                                    value={formData.acronym}
                                    onChange={(e) => setFormData({...formData, acronym: e.target.value})}
                                    required
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "25px" }}>
                                <div>
                                    <label style={styles.label}>Start Date</label>
                                    <input
                                        type="date"
                                        style={styles.input}
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={styles.label}>End Date</label>
                                    <input
                                        type="date"
                                        style={styles.input}
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button type="button" style={{ ...styles.btn, ...styles.secondaryBtn }} onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} style={{ ...styles.btn, ...styles.primaryBtn }}>
                                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                    Create Semester
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}