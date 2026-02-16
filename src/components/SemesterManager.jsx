import React, { useState, useEffect } from "react";
import { Trash2, Plus, Calendar, Loader2 } from "lucide-react";
import api from "../api";

export default function SemesterManager({ currentUserRole }) {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    acronym: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    fetchSemesters();
  }, []);

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
      fetchSemesters();
    } catch (err) {
      alert(err.message || "Error creating semester");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this semester?")) return;
    try {
      await api.deleteSemester(id);
      fetchSemesters();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const role = (currentUserRole || "").toLowerCase();
  const canEdit = ["pm", "admin"].includes(role);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Calendar className="text-blue-600" /> Semester Management
      </h2>

      {canEdit && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border mb-8 grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium mb-1">Semester Name</label>
            <input type="text" placeholder="e.g. Winter Semester 2025" className="w-full p-2 border rounded" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium mb-1">Acronym</label>
            <input type="text" placeholder="e.g. WS25" className="w-full p-2 border rounded" value={formData.acronym} onChange={(e) => setFormData({...formData, acronym: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input type="date" className="w-full p-2 border rounded" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input type="date" className="w-full p-2 border rounded" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} required />
          </div>
          <button type="submit" disabled={submitting} className="col-span-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex justify-center items-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Semester
          </button>
        </form>
      )}

      <div className="grid gap-4">
        {semesters.map((s) => (
          <div key={s.id} className="bg-white p-4 rounded-lg border flex justify-between items-center shadow-sm">
            <div>
              <h3 className="font-semibold text-lg">{s.name} <span className="text-gray-400 text-sm">({s.acronym})</span></h3>
              <p className="text-sm text-gray-500">{s.start_date} to {s.end_date}</p>
            </div>
            {canEdit && (
              <button onClick={() => handleDelete(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
        {semesters.length === 0 && <p className="text-gray-500 italic">No semesters found.</p>}
      </div>
    </div>
  );
}