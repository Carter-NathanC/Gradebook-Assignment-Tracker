import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, CheckCircle, Clock, GraduationCap, LayoutDashboard, 
  LogOut, Plus, Settings, Calendar as CalendarIcon, 
  ChevronRight, ChevronLeft, Trash2, X, Download, Wrench, 
  Printer, FileText, Lock, Shield, Key, Save,
  AlertTriangle, ExternalLink
} from 'lucide-react';

/* GRADE TRACKER FRONTEND (Pro Version) */

// --- Configuration ---
const DEFAULT_THEME = {
  colors: { primary: "#1e3a8a", secondary: "#3b82f6" },
  universityName: "My University"
};

const DEFAULT_GRADING_SCALE = [
  { letter: 'A', min: 93, gpa: 4.0 }, { letter: 'A-', min: 90, gpa: 3.7 },
  { letter: 'B+', min: 87, gpa: 3.3 }, { letter: 'B', min: 83, gpa: 3.0 },
  { letter: 'B-', min: 80, gpa: 2.7 }, { letter: 'C+', min: 77, gpa: 2.3 },
  { letter: 'C', min: 73, gpa: 2.0 }, { letter: 'C-', min: 70, gpa: 1.7 },
  { letter: 'D+', min: 67, gpa: 1.3 }, { letter: 'D', min: 62, gpa: 1.0 },
  { letter: 'D-', min: 60, gpa: 0.7 }, { letter: 'F', min: 0, gpa: 0.0 },
];

const CLASS_COLORS = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-teal-100 text-teal-800 border-teal-200',
];

// --- Helpers ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    'TODO': 'bg-gray-100 text-gray-600 border-gray-200',
    'IN_PROGRESS': 'bg-blue-100 text-blue-700 border-blue-200',
    'TURNED_IN': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'GRADED': 'bg-green-100 text-green-700 border-green-200'
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles['TODO']}`}>{status.replace('_', ' ')}</span>;
};

// --- Main App ---
export default function GradeTracker() {
  const [accessKey, setAccessKey] = useState(localStorage.getItem('gt_access_key') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Data
  const [universityName, setUniversityName] = useState(DEFAULT_THEME.universityName);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [events, setEvents] = useState([]);

  // UI
  const [view, setView] = useState('DASHBOARD');
  const [activeClassId, setActiveClassId] = useState(null);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isClassSettingsOpen, setIsClassSettingsOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // --- API ---
  const apiCall = async (endpoint, method = 'GET', body = null) => {
    const headers = { 'Content-Type': 'application/json', 'x-access-key': accessKey };
    try {
        const res = await fetch(`/api${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : null });
        if (res.status === 401 || res.status === 403) {
            setIsAuthenticated(false); setLoading(false); throw new Error("Invalid Key");
        }
        return await res.json();
    } catch (e) { console.error(e); throw e; }
  };

  const saveData = async (overrideData) => {
      const dbPayload = {
          universityName: overrideData?.universityName ?? universityName,
          years: overrideData?.years ?? years,
          classes: overrideData?.classes ?? classes,
          assignments: overrideData?.assignments ?? assignments,
          events: overrideData?.events ?? events
      };
      await apiCall('/data', 'POST', dbPayload);
  };

  // --- Password Update Logic (FIXED) ---
  const handleUpdatePassword = async (newPass) => {
      if (!newPass) return;
      if (!confirm("Are you sure you want to change your password? You will need this new key to log in next time.")) return;
      
      try {
          const res = await apiCall('/change-password', 'POST', { newPassword: newPass });
          if (res.success) {
              setAccessKey(newPass);
              localStorage.setItem('gt_access_key', newPass);
              alert("Password updated successfully.");
              setIsGlobalSettingsOpen(false);
          } else {
              alert("Failed to update password.");
          }
      } catch (e) {
          alert("Error updating password: " + e.message);
      }
  };

  // --- CSV Export Logic ---
  const downloadCSV = () => {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Type,Class Name,Class Code,Item Name,Category,Due Date,Status,Score,Total,Percentage\n";

      // Add Classes (Summary Rows)
      classes.forEach(c => {
          const s = calculateClassGrade(c.id);
          csvContent += `Class,${c.name},${c.code},N/A,N/A,N/A,N/A,${s.earned || 0},${s.total || 0},${s.percent.toFixed(2)}%\n`;
      });

      // Add Assignments
      assignments.forEach(a => {
          const parentClass = classes.find(c => c.id === a.classId);
          const percentage = a.total > 0 ? ((a.grade / a.total) * 100).toFixed(2) + "%" : "0%";
          // Escape commas in names
          const safeName = `"${a.name.replace(/"/g, '""')}"`;
          const safeClass = parentClass ? `"${parentClass.name.replace(/"/g, '""')}"` : "Unknown";
          
          csvContent += `Assignment,${safeClass},${parentClass?.code || ""},${safeName},${a.category},${a.dueDate},${a.status},${a.grade},${a.total},${percentage}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `grade_tracker_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  useEffect(() => {
    if (accessKey) verifyAndLoad(); else setLoading(false);
  }, []);

  const verifyAndLoad = async () => {
      try {
          setLoading(true);
          const data = await apiCall('/data');
          if (data) {
              setUniversityName(data.universityName || "My University");
              setYears(data.years || []);
              setClasses(data.classes || []);
              setAssignments(data.assignments || []);
              setEvents(data.events || []);
              setIsAuthenticated(true);
              localStorage.setItem('gt_access_key', accessKey);
          }
      } catch (e) { setAuthError("Session expired or invalid key."); } 
      finally { setLoading(false); }
  };

  const handleLogin = (e) => { e.preventDefault(); verifyAndLoad(); };
  const handleLogout = () => { localStorage.removeItem('gt_access_key'); setAccessKey(''); setIsAuthenticated(false); };

  // --- Logic ---
  const calculateClassGrade = (classId) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return { percent: 0, letter: 'N/A', gpa: 0.0 };

    const now = new Date().toLocaleDateString('en-CA');
    let classAssignments = assignments.filter(a => {
        if (a.classId !== classId) return false;
        return (a.status === 'GRADED' || a.status === 'TURNED_IN' || (a.dueDate && a.dueDate < now));
    });

    // Drop Lowest Logic
    if (cls.rules) {
        cls.rules.forEach(rule => {
            if (rule.type === 'DROP_LOWEST') {
                let inCat = classAssignments.filter(a => a.category === rule.category).sort((a,b) => {
                    const scoreA = parseFloat(a.total) === 0 ? 0 : parseFloat(a.grade)/parseFloat(a.total);
                    const scoreB = parseFloat(b.total) === 0 ? 0 : parseFloat(b.grade)/parseFloat(b.total);
                    return scoreA - scoreB;
                });
                if (inCat.length > 0) {
                   const toDrop = inCat.slice(0, parseInt(rule.count)||1).map(a => a.id);
                   classAssignments = classAssignments.filter(a => !toDrop.includes(a.id));
                }
            }
        });
    }

    const rawTotalPoints = classAssignments.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
    const rawEarnedPoints = classAssignments.reduce((acc, curr) => acc + (parseFloat(curr.grade) || 0), 0);
    let finalPercent = 100;

    if (cls.gradingType === 'WEIGHTED' && cls.categories) {
        let totalWeightedScore = 0, totalWeightUsed = 0;
        cls.categories.forEach(cat => {
            const catAssignments = classAssignments.filter(a => a.category === cat.name);
            if (catAssignments.length === 0) return;
            const catPoints = catAssignments.reduce((acc, curr) => acc + parseFloat(curr.grade || 0), 0);
            const catTotal = catAssignments.reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0);
            if (catTotal > 0) {
                const catPercent = catPoints / catTotal;
                totalWeightedScore += (catPercent * parseFloat(cat.weight));
                totalWeightUsed += parseFloat(cat.weight);
            }
        });
        if (totalWeightUsed > 0) finalPercent = (totalWeightedScore / totalWeightUsed) * 100;
    } else {
        finalPercent = rawTotalPoints === 0 ? 100 : (rawEarnedPoints / rawTotalPoints) * 100;
    }

    const scale = cls.gradingScale || DEFAULT_GRADING_SCALE;
    const sortedScale = [...scale].sort((a, b) => b.min - a.min);
    const details = sortedScale.find(g => finalPercent >= g.min) || sortedScale[sortedScale.length - 1];
    
    return { percent: finalPercent, letter: details.letter, gpa: details.gpa, earned: rawEarnedPoints, total: rawTotalPoints };
  };

  const getCumulativeGPA = () => {
    let pts = 0, creds = 0;
    classes.forEach(c => {
      const s = calculateClassGrade(c.id);
      const cr = parseFloat(c.credits) || 0;
      pts += s.gpa * cr;
      creds += cr;
    });
    return creds === 0 ? "0.00" : (pts / creds).toFixed(2);
  };

  // --- CRUD Handlers ---
  const handleCreateEvent = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const newEvent = {
          id: crypto.randomUUID(),
          title: fd.get('title'),
          date: fd.get('date'),
          type: fd.get('type'),
          description: fd.get('description')
      };
      setEvents([...events, newEvent]);
      await saveData({ events: [...events, newEvent] });
      setIsEventModalOpen(false);
  };

  const handleUpdateClass = async (updatedClass) => {
      const updatedClasses = classes.map(c => c.id === updatedClass.id ? updatedClass : c);
      setClasses(updatedClasses);
      await saveData({ classes: updatedClasses });
      setIsClassSettingsOpen(false);
  };

  const handleDeleteClass = async (id) => {
      if(!confirm("Are you sure? This deletes the class and all assignments.")) return;
      const newClasses = classes.filter(c => c.id !== id);
      const newAssignments = assignments.filter(a => a.classId !== id);
      setClasses(newClasses);
      setAssignments(newAssignments);
      await saveData({ classes: newClasses, assignments: newAssignments });
      setIsClassSettingsOpen(false);
      setView('DASHBOARD');
  };

  const handleUpdateAssignment = async (updated) => {
      const newAsg = assignments.map(a => a.id === updated.id ? updated : a);
      setAssignments(newAsg);
      await saveData({ assignments: newAsg });
      setIsEditModalOpen(false);
  };

  const handleDeleteAssignment = async (id) => {
      if(!confirm("Delete assignment?")) return;
      const newAsg = assignments.filter(a => a.id !== id);
      setAssignments(newAsg);
      await saveData({ assignments: newAsg });
      setIsEditModalOpen(false);
  };

  // --- Sub-Components (Modals) ---

  const ClassSettingsModal = () => {
      const cls = classes.find(c => c.id === activeClassId);
      if(!cls) return null;
      const [localSettings, setLocalSettings] = useState({...cls, gradingScale: cls.gradingScale || DEFAULT_GRADING_SCALE});
      const [tab, setTab] = useState('GENERAL');

      const addCategory = () => setLocalSettings({...localSettings, categories: [...(localSettings.categories||[]), {name: 'New', weight: 0}]});
      const updateCat = (i, f, v) => {
          const cats = [...localSettings.categories]; cats[i][f] = v;
          setLocalSettings({...localSettings, categories: cats});
      };
      const removeCat = (i) => {
          const cats = localSettings.categories.filter((_, idx) => idx !== i);
          setLocalSettings({...localSettings, categories: cats});
      };

      const updateScale = (i, f, v) => {
          const sc = [...localSettings.gradingScale]; sc[i][f] = v;
          setLocalSettings({...localSettings, gradingScale: sc});
      };

      const addRule = () => setLocalSettings({...localSettings, rules: [...(localSettings.rules||[]), {type: 'DROP_LOWEST', count: 1, category: 'Homework'}]});
      const updateRule = (i, f, v) => {
          const rs = [...localSettings.rules]; rs[i][f] = v;
          setLocalSettings({...localSettings, rules: rs});
      };
      const removeRule = (i) => {
          const rs = localSettings.rules.filter((_, idx) => idx !== i);
          setLocalSettings({...localSettings, rules: rs});
      };

      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-bold text-lg">Class Settings: {cls.name}</h3>
                    <button onClick={() => setIsClassSettingsOpen(false)}><X size={20}/></button>
                </div>
                <div className="flex border-b overflow-x-auto">
                    {['GENERAL', 'GRADING', 'SCALE', 'RULES', 'DANGER'].map(t => (
                        <button key={t} onClick={()=>setTab(t)} className={`px-4 py-3 text-sm font-bold whitespace-nowrap ${tab===t?'border-b-2 border-blue-600 text-blue-600':'text-gray-500'}`}>{t}</button>
                    ))}
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    {tab === 'GENERAL' && (
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-700">Class Information</label>
                            <input value={localSettings.name} onChange={e=>setLocalSettings({...localSettings, name: e.target.value})} className="border p-2 w-full rounded" placeholder="Class Name"/>
                            <div className="grid grid-cols-2 gap-4">
                                <input value={localSettings.code} onChange={e=>setLocalSettings({...localSettings, code: e.target.value})} className="border p-2 w-full rounded" placeholder="Code"/>
                                <input value={localSettings.credits} onChange={e=>setLocalSettings({...localSettings, credits: e.target.value})} className="border p-2 w-full rounded" placeholder="Credits" type="number"/>
                            </div>
                        </div>
                    )}
                    {tab === 'GRADING' && (
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                {['POINTS', 'WEIGHTED', 'CUSTOM'].map(type => (
                                    <button key={type} onClick={()=>setLocalSettings({...localSettings, gradingType: type})} 
                                        className={`flex-1 p-3 rounded border text-center font-bold ${localSettings.gradingType===type ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                                        {type === 'POINTS' && "Total Points"}
                                        {type === 'WEIGHTED' && "Weighted"}
                                        {type === 'CUSTOM' && "Custom Logic"}
                                    </button>
                                ))}
                            </div>

                            {localSettings.gradingType === 'WEIGHTED' && (
                                <div className="bg-gray-50 p-4 rounded border">
                                    <div className="flex justify-between mb-2"><span className="font-bold text-sm">Weighted Categories</span><button onClick={addCategory} className="text-blue-600 text-xs font-bold">+ ADD CATEGORY</button></div>
                                    {localSettings.categories?.map((cat, i) => (
                                        <div key={i} className="flex gap-2 mb-2 items-center">
                                            <input value={cat.name} onChange={e=>updateCat(i, 'name', e.target.value)} className="border p-1 flex-1 rounded text-sm" placeholder="Name"/>
                                            <div className="flex items-center gap-1"><input type="number" value={cat.weight} onChange={e=>updateCat(i, 'weight', e.target.value)} className="border p-1 w-16 rounded text-right text-sm"/><span className="text-sm">%</span></div>
                                            <button onClick={()=>removeCat(i)} className="text-red-400 p-1 hover:text-red-600"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                    <div className="text-right text-xs font-bold text-gray-500 mt-2">Total Weight: {localSettings.categories?.reduce((a,b)=>a+(parseFloat(b.weight)||0),0)}%</div>
                                </div>
                            )}
                            
                            {localSettings.gradingType === 'CUSTOM' && (
                                <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                                    <p className="text-sm text-yellow-800 font-medium mb-2"><AlertTriangle size={16} className="inline mr-1"/> Custom Logic</p>
                                    <textarea 
                                        value={localSettings.customScript || ''} 
                                        onChange={e=>setLocalSettings({...localSettings, customScript: e.target.value})}
                                        className="w-full h-32 p-2 border rounded font-mono text-xs"
                                        placeholder="// Enter custom logic description or code snippet here..."
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    {tab === 'SCALE' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">Define percentage cutoffs for each letter grade.</p>
                            <div className="grid grid-cols-3 gap-2 font-bold text-xs text-gray-400 uppercase"><div>Letter</div><div>Min %</div><div>GPA</div></div>
                            {localSettings.gradingScale.map((s, i) => (
                                <div key={i} className="grid grid-cols-3 gap-4">
                                    <div className="p-2 bg-gray-100 rounded text-center font-bold text-gray-700">{s.letter}</div>
                                    <input type="number" value={s.min} onChange={e => updateScale(i, 'min', e.target.value)} className="p-2 border rounded" />
                                    <input type="number" value={s.gpa} onChange={e => updateScale(i, 'gpa', e.target.value)} className="p-2 border rounded" step="0.1" />
                                </div>
                            ))}
                        </div>
                    )}
                    {tab === 'RULES' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center"><p className="text-sm text-gray-500">Special Grading Rules</p><button onClick={addRule} className="text-blue-600 text-xs font-bold">+ ADD RULE</button></div>
                            {localSettings.rules?.map((rule, i) => (
                                <div key={i} className="bg-gray-50 p-3 rounded border flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span>Drop Lowest</span>
                                        <input type="number" value={rule.count} onChange={e=>updateRule(i, 'count', e.target.value)} className="w-12 p-1 border rounded text-center"/>
                                        <span>from</span>
                                        <select value={rule.category} onChange={e=>updateRule(i, 'category', e.target.value)} className="p-1 border rounded bg-white">
                                            {localSettings.categories?.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={()=>removeRule(i)}><X size={16} className="text-gray-400 hover:text-red-500"/></button>
                                </div>
                            ))}
                            {(!localSettings.rules || localSettings.rules.length === 0) && <p className="text-center text-gray-400 text-sm italic">No rules defined.</p>}
                        </div>
                    )}
                    {tab === 'DANGER' && (
                        <div className="bg-red-50 p-6 rounded text-center border border-red-100">
                            <h4 className="text-red-800 font-bold mb-2">Delete Class</h4>
                            <p className="text-red-600 text-sm mb-4">This action cannot be undone.</p>
                            <button onClick={()=>handleDeleteClass(localSettings.id)} className="bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700">Delete Permanently</button>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-xl">
                    <button onClick={()=>setIsClassSettingsOpen(false)} className="px-4 py-2 text-gray-600 font-medium">Cancel</button>
                    <button onClick={()=>handleUpdateClass(localSettings)} className="px-6 py-2 bg-blue-600 text-white rounded font-bold shadow hover:bg-blue-700">Save Changes</button>
                </div>
            </div>
        </div>
      );
  };

  const ReportView = () => {
      // Calculate Stats
      const totalAssigns = assignments.length;
      const gradedCount = assignments.filter(a => a.status === 'GRADED').length;
      const statusCounts = assignments.reduce((acc, curr) => {
          acc[curr.status] = (acc[curr.status] || 0) + 1;
          return acc;
      }, { 'TODO': 0, 'IN_PROGRESS': 0, 'TURNED_IN': 0, 'GRADED': 0 });
      
      const total = Object.values(statusCounts).reduce((a,b)=>a+b, 0);
      const colors = { 'TODO': '#fbbf24', 'IN_PROGRESS': '#3b82f6', 'TURNED_IN': '#f59e0b', 'GRADED': '#10b981' };
      let gradStr = "", acc = 0;
      Object.entries(statusCounts).forEach(([k,v]) => {
          const p = (v/total)*100;
          gradStr += `${colors[k]} ${acc}% ${acc+p}%, `;
          acc += p;
      });
      gradStr = total === 0 ? '#e5e7eb 0% 100%' : gradStr.slice(0, -2);

      return (
          <div className="space-y-8 animate-fade-in print:w-full">
              <div className="flex justify-between items-center print:hidden">
                  <h2 className="text-2xl font-bold text-slate-800">Performance Report</h2>
                  <div className="flex gap-2">
                      <button onClick={downloadCSV} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 shadow"><Download size={16}/> CSV</button>
                      <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900 shadow"><Printer size={16}/> Print</button>
                  </div>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0">
                  <div className="flex justify-between border-b border-slate-100 pb-6 mb-6">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold text-xl print:bg-blue-900 print:text-white">{universityName.charAt(0)}</div>
                          <div>
                              <h1 className="text-2xl font-bold text-slate-800">{universityName}</h1>
                              <p className="text-sm text-slate-500">Student Success Portal</p>
                          </div>
                      </div>
                      <div className="text-right text-xs text-slate-400">Generated: {new Date().toLocaleDateString()}</div>
                  </div>
                  
                  {/* KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 print:grid-cols-4">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 print:border-slate-300">
                          <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">GPA</div>
                          <div className="text-3xl font-bold text-blue-800 mt-1 print:text-blue-800">{getCumulativeGPA()}</div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 print:border-slate-300">
                          <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Credits</div>
                          <div className="text-3xl font-bold text-slate-800 mt-1">{classes.reduce((a,c)=>a+(parseFloat(c.credits)||0),0)}</div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 print:border-slate-300">
                          <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Assignments</div>
                          <div className="text-3xl font-bold text-slate-800 mt-1">{totalAssigns}</div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 print:border-slate-300">
                          <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Completion</div>
                          <div className="text-3xl font-bold text-slate-800 mt-1">{total===0?0:Math.round((gradedCount/total)*100)}%</div>
                      </div>
                  </div>

                  {/* Visuals */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 print:grid-cols-2">
                      <div className="p-6 border border-slate-200 rounded-xl print:border-slate-300">
                          <h4 className="font-bold text-slate-800 mb-6">Grade Breakdown</h4>
                          <div className="space-y-4">
                              {classes.map(c => {
                                  const s = calculateClassGrade(c.id);
                                  return (
                                      <div key={c.id}>
                                          <div className="flex justify-between text-xs mb-1 font-medium"><span className="text-slate-700">{c.name}</span><span className="text-slate-500">{s.percent.toFixed(1)}% ({s.letter})</span></div>
                                          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden print:bg-slate-200">
                                              <div className="h-full bg-blue-600 print:bg-blue-600" style={{width: `${s.percent}%`}}></div>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>
                      <div className="p-6 border border-slate-200 rounded-xl flex flex-col items-center justify-center print:border-slate-300">
                          <h4 className="font-bold text-slate-800 mb-6 w-full text-left">Workload</h4>
                          <div className="w-40 h-40 rounded-full relative shadow-inner print:print-color-adjust" style={{background: `conic-gradient(${gradStr})`}}>
                              <div className="absolute inset-6 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                                  <span className="text-2xl font-bold text-slate-800">{totalAssigns}</span>
                                  <span className="text-xs text-slate-400 uppercase">Items</span>
                              </div>
                          </div>
                          <div className="flex flex-wrap gap-4 mt-6 text-xs justify-center">
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 print:print-color-adjust"></div>Graded</div>
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400 print:print-color-adjust"></div>Todo</div>
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 print:print-color-adjust"></div>In Progress</div>
                          </div>
                      </div>
                  </div>
                  
                  {/* Detailed Log for Print */}
                  <div className="mt-8 border-t pt-4">
                      <h4 className="font-bold mb-4">Detailed Assignment Log</h4>
                      <table className="w-full text-left text-xs">
                          <thead><tr className="border-b"><th className="pb-2">Date</th><th className="pb-2">Class</th><th className="pb-2">Assignment</th><th className="pb-2 text-right">Score</th></tr></thead>
                          <tbody>
                              {assignments.sort((a,b)=>new Date(b.dueDate)-new Date(a.dueDate)).map(a => (
                                  <tr key={a.id} className="border-b border-gray-50">
                                      <td className="py-2 text-gray-500">{a.dueDate}</td>
                                      <td className="py-2 font-bold">{classes.find(c=>c.id===a.classId)?.code}</td>
                                      <td className="py-2">{a.name}</td>
                                      <td className="py-2 text-right">{a.grade}/{a.total}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  };

  const CalendarView = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

      const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
      const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

      return (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><CalendarIcon className="text-blue-600"/> Academic Calendar</h2>
                  <button onClick={() => setIsEventModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-blue-700 flex items-center gap-2"><Plus size={16}/> Add Event</button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 flex justify-between items-center bg-gray-50 border-b">
                      <button onClick={prevMonth} className="p-2 hover:bg-white rounded-full"><ChevronLeft/></button>
                      <h3 className="text-lg font-bold">{monthNames[month]} {year}</h3>
                      <button onClick={nextMonth} className="p-2 hover:bg-white rounded-full"><ChevronRight/></button>
                  </div>
                  <div className="grid grid-cols-7 text-center bg-gray-100 text-xs font-bold text-gray-500 uppercase py-2">
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d}>{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px">
                      {Array.from({length: firstDay}).map((_,i)=><div key={`e-${i}`} className="bg-white min-h-[100px]"></div>)}
                      {Array.from({length: daysInMonth}).map((_,i)=>{
                          const d = i+1;
                          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                          const daysItems = [...assignments.filter(a=>a.dueDate===dateStr), ...events.filter(e=>e.date===dateStr)];
                          return (
                              <div key={d} className="bg-white min-h-[100px] p-2 hover:bg-blue-50 transition-colors group relative">
                                  <div className={`text-sm font-bold mb-1 ${new Date().toDateString() === new Date(year,month,d).toDateString() ? 'text-blue-600':''}`}>{d}</div>
                                  <div className="space-y-1">
                                      {daysItems.map((item, idx) => (
                                          <div key={idx} onClick={()=>{ if(item.grade!==undefined){setActiveAssignment(item); setIsEditModalOpen(true);} }} className={`text-[10px] px-1 rounded truncate cursor-pointer ${item.grade!==undefined ? (item.status==='GRADED'?'bg-green-100 text-green-800':'bg-blue-100 text-blue-800') : 'bg-purple-100 text-purple-800'}`}>
                                              {item.name || item.title}
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>
          </div>
      );
  };

  // --- Views Handling ---
  if (loading) return <div className="h-screen flex items-center justify-center text-blue-600">Loading Local Data...</div>;
  if (!isAuthenticated) return (
    <div className="h-screen flex items-center justify-center bg-gray-50" style={{background: `linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)`}}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
         <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4"><Lock className="text-blue-800"/></div>
            <h1 className="text-2xl font-bold">Secure Login</h1>
            <p className="text-gray-500 text-sm">Local Server Access</p>
         </div>
         <form onSubmit={handleLogin} className="space-y-4">
             <div><label className="block text-sm font-medium mb-1">Access Key</label><input type="password" value={accessKey} onChange={e => setAccessKey(e.target.value)} className="w-full p-2 border rounded font-mono" placeholder="Paste key from logs" /></div>
             {authError && <div className="text-red-500 text-sm">{authError}</div>}
             <button className="w-full bg-blue-800 text-white p-2 rounded font-bold hover:bg-blue-900">Unlock</button>
         </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      <aside className="w-64 bg-white border-r flex flex-col print:hidden">
        <div className="p-6 border-b flex items-center gap-3">
           <div className="w-8 h-8 bg-blue-900 text-white rounded flex items-center justify-center font-bold">{universityName[0]}</div>
           <span className="font-bold truncate">{universityName}</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 p-2 rounded text-sm ${view==='DASHBOARD'?'bg-blue-50 text-blue-700':''}`}><LayoutDashboard size={18}/> Dashboard</button>
            <button onClick={() => setView('CALENDAR')} className={`w-full flex items-center gap-3 p-2 rounded text-sm ${view==='CALENDAR'?'bg-blue-50 text-blue-700':''}`}><CalendarIcon size={18}/> Calendar</button>
            <button onClick={() => setView('REPORT')} className={`w-full flex items-center gap-3 p-2 rounded text-sm ${view==='REPORT'?'bg-blue-50 text-blue-700':''}`}><FileText size={18}/> Reports</button>
            <div className="pt-4 text-xs font-bold text-gray-400 uppercase px-2">Classes</div>
            {classes.map((c, i) => {
                const s = calculateClassGrade(c.id);
                return (
                    <button key={c.id} onClick={() => { setView('CLASS'); setActiveClassId(c.id); }} className={`w-full flex justify-between p-2 rounded text-sm ${view==='CLASS'&&activeClassId===c.id ? 'bg-blue-50 text-blue-700':''}`}>
                        <span className="flex items-center gap-2 truncate"><BookOpen size={16}/> {c.code}</span>
                        <span className="bg-gray-100 px-1 rounded text-xs">{s.letter}</span>
                    </button>
                )
            })}
            <button onClick={() => setIsAddClassModalOpen(true)} className="w-full flex gap-3 p-2 mt-2 border border-dashed rounded text-sm text-gray-500"><Plus size={18}/> Add Class</button>
        </nav>
        <div className="p-4 border-t space-y-2">
            <button onClick={() => setIsGlobalSettingsOpen(true)} className="w-full flex gap-3 p-2 hover:bg-gray-50 rounded text-sm"><Settings size={18}/> Settings</button>
            <button onClick={handleLogout} className="w-full flex gap-3 p-2 hover:bg-red-50 text-red-600 rounded text-sm"><LogOut size={18}/> Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
         {view === 'DASHBOARD' && (
             <div className="max-w-5xl mx-auto space-y-6">
                 {/* Dashboard Stats */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <Card className="bg-gradient-to-br from-blue-800 to-blue-600 text-white border-none">
                         <div className="text-blue-100 text-sm">Cumulative GPA</div>
                         <div className="text-4xl font-bold">{getCumulativeGPA()}</div>
                     </Card>
                     <Card><div className="text-gray-500 text-sm">Assignments Due</div><div className="text-3xl font-bold">{assignments.filter(a=>a.status==='TODO').length}</div></Card>
                     <Card><div className="text-gray-500 text-sm">Completed</div><div className="text-3xl font-bold">{assignments.filter(a=>a.status==='GRADED').length}</div></Card>
                 </div>
                 
                 {/* Todo List - Student Aid */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <Card>
                         <h3 className="font-bold mb-4 flex items-center gap-2"><Clock className="text-orange-500" size={20}/> Upcoming To-Do</h3>
                         <div className="space-y-2 max-h-[300px] overflow-y-auto">
                             {assignments
                                .filter(a => a.status !== 'GRADED')
                                .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate))
                                .map(a => {
                                    const cls = classes.find(c => c.id === a.classId);
                                    const clsIndex = classes.findIndex(c => c.id === a.classId);
                                    const colorClass = CLASS_COLORS[clsIndex % CLASS_COLORS.length] || 'bg-gray-100';
                                    
                                    // Bold Logic: Due within 7 days
                                    const due = new Date(a.dueDate);
                                    const today = new Date();
                                    const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7);
                                    // Normalize for date comparison
                                    due.setHours(0,0,0,0); today.setHours(0,0,0,0); nextWeek.setHours(0,0,0,0);
                                    const isThisWeek = due >= today && due <= nextWeek;
                                    
                                    return (
                                        <div key={a.id} onClick={() => { setActiveAssignment(a); setIsEditModalOpen(true); }} className={`flex justify-between p-3 hover:bg-gray-50 rounded border-b border-gray-50 cursor-pointer ${!isThisWeek ? 'opacity-60 grayscale' : ''}`}>
                                            <div>
                                                <div className={`text-sm ${isThisWeek ? 'font-bold text-slate-800' : 'font-medium text-gray-500'}`}>{a.name}</div>
                                                <div className="text-xs text-gray-500 flex gap-2 mt-1">
                                                    <span className={`px-1.5 rounded ${colorClass} text-[10px] font-bold`}>{cls?.code}</span>
                                                    <span className={isThisWeek ? 'text-red-500 font-bold' : ''}>{a.dueDate}</span>
                                                </div>
                                            </div>
                                            <Badge status={a.status} />
                                        </div>
                                    )
                                })
                             }
                             {assignments.filter(a => a.status !== 'GRADED').length === 0 && <p className="text-gray-400 text-sm text-center py-4">All caught up!</p>}
                         </div>
                     </Card>

                     <Card>
                         <h3 className="font-bold mb-4">Class Performance</h3>
                         <div className="space-y-2">
                             {classes.map((c, i) => {
                                 const s = calculateClassGrade(c.id);
                                 const colorClass = CLASS_COLORS[i % CLASS_COLORS.length];
                                 return (
                                     <div key={c.id} onClick={() => { setView('CLASS'); setActiveClassId(c.id); }} className={`flex justify-between p-3 rounded cursor-pointer border hover:shadow-md transition-all ${colorClass.replace('text', 'border')}`}>
                                         <div><div className="font-bold">{c.name}</div><div className="text-xs opacity-75">{c.code}</div></div>
                                         <div className="text-right"><div className="font-bold text-lg">{s.letter}</div><div className="text-xs">{s.percent.toFixed(1)}%</div></div>
                                     </div>
                                 )
                             })}
                         </div>
                     </Card>
                 </div>
             </div>
         )}
         
         {/* ... (Other views CLASS, REPORT, CALENDAR remain the same, ReportView logic is above) ... */}
         {view === 'REPORT' && <ReportView />}
         
         {view === 'CLASS' && activeClassId && (() => {
             const cls = classes.find(c => c.id === activeClassId);
             const s = calculateClassGrade(activeClassId);
             return (
                 <div className="max-w-5xl mx-auto space-y-6">
                     <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
                         <div>
                             <h2 className="text-2xl font-bold">{cls?.name}</h2>
                             <div className="flex gap-2 text-sm text-gray-500">
                                 <span>{cls?.code}</span><span>•</span><span>{cls?.credits} Credits</span>
                                 {cls?.gradingType === 'WEIGHTED' && <span className="bg-purple-100 text-purple-700 px-2 rounded text-xs font-bold">Weighted</span>}
                             </div>
                         </div>
                         <div className="flex items-center gap-4">
                             <button onClick={() => setIsClassSettingsOpen(true)} className="p-2 bg-gray-100 rounded hover:bg-gray-200"><Wrench size={20}/></button>
                             <div className="text-right">
                                 <div className="text-3xl font-bold text-blue-700">{s.percent.toFixed(1)}%</div>
                                 <div className="text-sm text-gray-500">Current Grade</div>
                             </div>
                         </div>
                     </div>
                     <Card>
                         <div className="flex justify-between mb-4">
                             <h3 className="font-bold">Assignments</h3>
                             <button onClick={() => {
                                 const newId = crypto.randomUUID();
                                 const newAsg = { id: newId, classId: activeClassId, name: "New Assignment", status: "TODO", grade: 0, total: 100, dueDate: new Date().toISOString().split('T')[0], category: cls?.categories?.[0]?.name || "Homework" };
                                 setAssignments([...assignments, newAsg]);
                                 saveData({ assignments: [...assignments, newAsg] });
                                 setActiveAssignment(newAsg);
                                 setIsEditModalOpen(true);
                             }} className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">+ Add</button>
                         </div>
                         <div className="space-y-1">
                             {assignments.filter(a => a.classId === activeClassId).map(a => (
                                 <div key={a.id} onClick={() => { setActiveAssignment(a); setIsEditModalOpen(true); }} className="flex justify-between p-3 hover:bg-gray-50 rounded border-b border-gray-50 cursor-pointer items-center">
                                     <div className="flex-1">
                                         <div className="font-medium">{a.name}</div>
                                         <div className="text-xs text-gray-500 flex gap-2"><span>{a.category}</span><span>•</span><span>{a.dueDate}</span></div>
                                     </div>
                                     <div className="flex items-center gap-4">
                                         <Badge status={a.status} />
                                         <span className="text-sm font-mono w-16 text-right">{a.grade}/{a.total}</span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </Card>
                 </div>
             )
         })()}

         {view === 'CALENDAR' && <CalendarView />}
      </main>

      {/* --- Modals --- */}
      {isGlobalSettingsOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-xl w-full max-w-md">
                  <h3 className="font-bold text-lg mb-4">Global Settings</h3>
                  <div className="space-y-4">
                      <div><label className="text-sm">University Name</label><input value={universityName} onChange={e=>setUniversityName(e.target.value)} className="border p-2 w-full rounded"/></div>
                      
                      {/* Password Update Section */}
                      <div className="border-t pt-4">
                          <label className="text-sm block mb-2 font-bold">Change Password</label>
                          <input type="password" id="newPass" placeholder="New Password" className="border p-2 w-full rounded mb-2"/>
                          <button onClick={()=>{
                              const pass = document.getElementById('newPass').value;
                              if(pass) handleUpdatePassword(pass);
                          }} className="bg-gray-800 text-white px-3 py-1 rounded text-xs">Update Password</button>
                      </div>

                      {/* Data Export Section */}
                      <div className="border-t pt-4">
                          <label className="text-sm block mb-2 font-bold">Export Data</label>
                          <button onClick={downloadCSV} className="bg-green-600 text-white px-3 py-2 rounded text-sm w-full flex items-center justify-center gap-2">
                              <Download size={16}/> Download as CSV
                          </button>
                          <p className="text-xs text-gray-500 mt-2">Export classes and assignments to a spreadsheet.</p>
                      </div>

                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                          <button onClick={()=>setIsGlobalSettingsOpen(false)} className="px-4 py-2">Close</button>
                          <button onClick={() => { saveData({ universityName }); setIsGlobalSettingsOpen(false); }} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {isAddClassModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
             <div className="bg-white p-6 rounded-xl w-full max-w-md">
                 <h3 className="font-bold mb-4">Add Class</h3>
                 <form onSubmit={(e) => { 
                     e.preventDefault(); 
                     const fd = new FormData(e.target);
                     const newClass = { id: crypto.randomUUID(), name: fd.get('name'), code: fd.get('code'), credits: fd.get('credits'), categories: [{name: 'Homework', weight: 0}], gradingType: 'POINTS' };
                     setClasses([...classes, newClass]);
                     saveData({ classes: [...classes, newClass] });
                     setIsAddClassModalOpen(false);
                 }}>
                     <input name="name" placeholder="Class Name" className="border p-2 w-full rounded mb-2" required />
                     <input name="code" placeholder="Code (CS101)" className="border p-2 w-full rounded mb-2" required />
                     <input name="credits" placeholder="Credits" className="border p-2 w-full rounded mb-2" required />
                     <button className="bg-blue-600 text-white w-full p-2 rounded font-bold">Add</button>
                 </form>
             </div>
          </div>
      )}

      {isEventModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
             <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl border-t-4 border-purple-600">
                 <h3 className="font-bold text-lg mb-4">Add Calendar Event</h3>
                 <form onSubmit={handleCreateEvent}>
                     <input name="title" placeholder="Event Title" className="border p-2 w-full rounded mb-2" required />
                     <div className="grid grid-cols-2 gap-2 mb-2">
                         <input name="date" type="date" className="border p-2 w-full rounded" required />
                         <select name="type" className="border p-2 w-full rounded">
                             <option value="EVENT">Event</option><option value="EXAM">Exam</option>
                         </select>
                     </div>
                     <textarea name="description" placeholder="Description" className="border p-2 w-full rounded mb-2 h-20"/>
                     <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setIsEventModalOpen(false)} className="px-3 py-1 text-gray-500">Cancel</button>
                        <button type="submit" className="px-3 py-1 bg-purple-600 text-white rounded">Add</button>
                    </div>
                 </form>
             </div>
          </div>
      )}

      {isEditModalOpen && activeAssignment && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
               <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-xl">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="font-bold text-lg">Edit Assignment</h3>
                       <button onClick={()=>setIsEditModalOpen(false)}><X size={20}/></button>
                   </div>
                   <div className="space-y-4">
                       <div><label className="text-xs text-gray-500">Name</label><input value={activeAssignment.name} onChange={e => setActiveAssignment({...activeAssignment, name: e.target.value})} className="border p-2 w-full rounded" /></div>
                       <div className="grid grid-cols-2 gap-4">
                           <div><label className="text-xs text-gray-500">Score</label><input type="number" value={activeAssignment.grade} onChange={e => setActiveAssignment({...activeAssignment, grade: e.target.value})} className="border p-2 w-full rounded"/></div>
                           <div><label className="text-xs text-gray-500">Total</label><input type="number" value={activeAssignment.total} onChange={e => setActiveAssignment({...activeAssignment, total: e.target.value})} className="border p-2 w-full rounded"/></div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div><label className="text-xs text-gray-500">Due Date</label><input type="date" value={activeAssignment.dueDate} onChange={e => setActiveAssignment({...activeAssignment, dueDate: e.target.value})} className="border p-2 w-full rounded"/></div>
                           <div>
                               <label className="text-xs text-gray-500">Category</label>
                               <select value={activeAssignment.category} onChange={e => setActiveAssignment({...activeAssignment, category: e.target.value})} className="border p-2 w-full rounded">
                                   {classes.find(c=>c.id===activeAssignment.classId)?.categories?.map(cat=><option key={cat.name} value={cat.name}>{cat.name}</option>) || <option>Homework</option>}
                               </select>
                           </div>
                       </div>
                       <div>
                           <label className="text-xs text-gray-500">Status</label>
                           <select value={activeAssignment.status} onChange={e => setActiveAssignment({...activeAssignment, status: e.target.value})} className="border p-2 w-full rounded">
                               <option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="TURNED_IN">Turned In</option><option value="GRADED">Graded</option>
                           </select>
                       </div>
                       <div><label className="text-xs text-gray-500">Link (Optional)</label><input value={activeAssignment.link || ''} onChange={e => setActiveAssignment({...activeAssignment, link: e.target.value})} className="border p-2 w-full rounded" placeholder="https://..."/></div>
                       
                       <div className="flex justify-between pt-4 border-t mt-4">
                           <button onClick={() => handleDeleteAssignment(activeAssignment.id)} className="text-red-500 text-sm flex items-center gap-1"><Trash2 size={16}/> Delete</button>
                           <button onClick={() => handleUpdateAssignment(activeAssignment)} className="bg-blue-600 text-white px-4 py-2 rounded font-bold">Save Changes</button>
                       </div>
                   </div>
               </div>
           </div>
      )}

      {isClassSettingsOpen && <ClassSettingsModal />}

    </div>
  );
}
