import React, { useState, useEffect } from 'react';
import api from "../api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { AlertCircle, Calendar, Clock, CheckCircle, Download, Filter } from 'lucide-react';

// --- YOUR CSS STYLES INTEGRATED ---
const styles = {
  container: { padding: "20px", fontFamily: "'Inter', 'Segoe UI', sans-serif", maxWidth: "1400px", margin: "0 auto", color: "#334155" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "1px solid #e2e8f0", paddingBottom: "20px" },
  title: { margin: 0, fontSize: "1.75rem", fontWeight: "700", color: "#0f172a" },
  subtitle: { margin: "5px 0 0 0", color: "#64748b", fontSize: "0.95rem" },
  controlsBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "15px" },
  filterContainer: { display: "flex", gap: "10px", alignItems: "center" },
  btn: { padding: "10px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600", transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: "6px" },
  primaryBtn: { background: "#2563eb", color: "white", boxShadow: "0 2px 4px rgba(37,99,235,0.2)" },
  select: { padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", background: "white", cursor: "pointer", outline: "none", minWidth: "200px" },
  // Dashboard Specific Layout
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" },
  card: { background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  chartSection: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" },
  chartBox: { background: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }
};

const COLORS = ['#2563eb', '#94a3b8', '#ef4444', '#10b981', '#f59e0b'];

const AnalyticsDashboard = () => {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [metrics, setMetrics] = useState({
    missingUnits: 0,
    pendingRequests: 0,
    progress: 0,
    totalModules: 0,
    staffData: [],
    barData: []
  });
  const handleExport = () => {
  const reportData = JSON.stringify(metrics, null, 2);
  const blob = new Blob([reportData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Analytics_Report_${selectedSemester}.json`;
  link.click();
  alert("Exporting data summary as JSON...");
};

  // 1. Fetch Data from your FastAPI Backend
  useEffect(() => {
    const fetchSemester = async () => {
      try {
        // Fetching Semesters for the dropdown
        const semData = await api.getSemesters();
        setSemesters(semData);
        if (semData.length > 0) setSelectedSemester(semData[0].id);
        } catch (err) {
        console.error(err);
        }
      };
    fetchSemester();
  }, []);
  useEffect(() => {
    if (!selectedSemester) return;

    const fetchMetrics = async () => {
      try {
        // Replace with your actual API endpoint and response structure
        const data = await api.getAnalyticsMetrics(selectedSemester);
        setMetrics({
          missingUnits: data.missing_units,
          pendingRequests: data.pending_requests,
          progress: data.planning_progress,
          totalModules: data.total_modules,
          staffData: data.staff_composition,
          barData: data.teaching_load_comparison
        });
      } catch (err) {
        console.error("Failed to fetch analytics:", err);

      }
    };
    fetchMetrics();
  }, [selectedSemester]);


  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Scheduling Analytics</h1>
          <p style={styles.subtitle}>Regulatory compliance and workload summaries</p>
        </div>
        <button 
        onClick={handleExport}
        style={{...styles.btn, ...styles.primaryBtn}}>
          <Download size={18} /> Export Data
        </button>
      </div>

      {/* FILTERS */}
      <div style={styles.controlsBar}>
        <div style={styles.filterContainer}>
          <Filter size={20} color="#64748b" />
          <select 
            style={styles.select} 
            value={selectedSemester} 
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            {semesters.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            <option value="mock">Summer Semester 2026 (Demo)</option>
          </select>
        </div>
      </div>

      {/* KPI CARDS (THE TOP 5 BOXES) */}
      <div style={styles.statsGrid}>
        <div style={{...styles.card, borderLeft: '4px solid #ef4444'}}>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span style={{fontSize: '0.85rem', fontWeight: '600'}}>Missing Units</span>
            <AlertCircle color="#ef4444" size={20} />
          </div>
          <h2 style={{fontSize: '1.8rem', margin: '10px 0'}}>{metrics.missingUnits}</h2>
          <span style={{fontSize: '0.75rem', color: '#ef4444'}}>Requires Attention</span>
        </div>

        <div style={{...styles.card, borderLeft: '4px solid #f59e0b'}}>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span style={{fontSize: '0.85rem', fontWeight: '600'}}>Pending Requests</span>
            <Clock color="#f59e0b" size={20} />
          </div>
          <h2 style={{fontSize: '1.8rem', margin: '10px 0'}}>{metrics.pendingRequests}</h2>
          <span style={{fontSize: '0.75rem', color: '#64748b'}}>Waitlist entries</span>
        </div>

        <div style={{...styles.card, borderLeft: '4px solid #10b981'}}>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span style={{fontSize: '0.85rem', fontWeight: '600'}}>Planning Progress</span>
            <CheckCircle color="#10b981" size={20} />
          </div>
          <h2 style={{fontSize: '1.8rem', margin: '10px 0'}}>{metrics.progress}%</h2>
          <div style={{width: '100%', bg: '#f1f5f9', height: '6px', borderRadius: '3px'}}>
             <div style={{width: `${metrics.progress}%`, background: '#10b981', height: '100%', borderRadius: '3px'}} />
          </div>
        </div>

        <div style={{...styles.card, borderLeft: '4px solid #2563eb'}}>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span style={{fontSize: '0.85rem', fontWeight: '600'}}>Total Modules</span>
            <Calendar color="#2563eb" size={20} />
          </div>
          <h2 style={{fontSize: '1.8rem', margin: '10px 0'}}>{metrics.totalModules}</h2>
          <span style={{fontSize: '0.75rem', color: '#64748b'}}>Active this semester</span>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div style={styles.chartSection}>
        {/* BAR CHART: NEEDED VS SCHEDULED */}
        <div style={styles.chartBox}>
          <h3 style={{fontSize: '1rem', fontWeight: '700', marginBottom: '20px'}}>Teaching Load Comparison</h3>
          <div style={{height: '300px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="needed" name="Required Hours" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scheduled" name="Scheduled Hours" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE CHART: LECTURER TYPES */}
        <div style={styles.chartBox}>
          <h3 style={{fontSize: '1rem', fontWeight: '700', marginBottom: '20px'}}>Lecturer Composition</h3>
          <div style={{height: '300px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metrics.staffData} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value">
                  {metrics.staffData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;