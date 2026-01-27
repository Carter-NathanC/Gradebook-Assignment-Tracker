import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, CheckCircle, Clock, GraduationCap, LayoutDashboard, 
  LogOut, Plus, Settings, Calendar as CalendarIcon, 
  ChevronRight, Trash2, X, Download, Wrench, 
  Printer, FileText, Lock, Shield, Key, Save,
  AlertTriangle, ExternalLink
} from 'lucide-react';

/* GRADE TRACKER FRONTEND (Local "Pro" Version)
   Features: Local Node Backend + Advanced Grading/Reporting
*/

// --- Configuration & Defaults ---
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

// --- Helper Components ---
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
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>{status.replace('_', ' ')}</span>;
};

// --- Main Application ---
export default function GradeTracker() {
  // Auth State
  const [accessKey, setAccessKey] = useState(localStorage.getItem('gt_access_key') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Data State
  const [universityName, setUniversityName] = useState(DEFAULT_THEME.universityName);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [events, setEvents] = useState([]);

  // UI State
  const [view, setView] = useState('DASHBOARD');
  const [activeClassId, setActiveClassId] = useState(null);
  const [activeAssignment, setActiveAssignment] = useState(null);
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isClassSettingsOpen, setIsClassSettingsOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // --- API / Backend Logic ---
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

  // --- Initialization ---
  useEffect(() => {
    if (accessKey) verifyAndLoad();
    else setLoading(false);
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
  const handleLogout = () => {
      localStorage.removeItem('gt_access_key');
      setAccessKey(''); setIsAuthenticated(false);
  };

  // --- Calculations Engine ---
  const getGradeDetails = (percentage, scale = DEFAULT_GRADING_SCALE) => {
    const sortedScale = [...scale].sort((a, b) => b.min - a.min);
    return sortedScale.find(g => percentage >= g.min) || sortedScale[sortedScale.length - 1];
  };

  const calculateClassGrade = (classId) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return { percent: 0, letter: 'N/A', gpa: 0.0, earned: 0, total: 0 };

    const now = new Date().toLocaleDateString('en-CA');
    let classAssignments = assignments.filter(a => {
        if (a.classId !== classId) return false;
        // Include Graded, Turned In (What-If), or Past Due
        return (a.status === 'GRADED' || a.status === 'TURNED_IN' || (a.dueDate && a.dueDate < now));
    });

    // Apply "Drop Lowest" Rules
    if (cls.rules && cls.rules.length > 0) {
        cls.rules.forEach(rule => {
            if (rule.type === 'DROP_LOWEST') {
                const targetCat = rule.category;
                const count = parseInt(rule.count) || 1;
                let inCat = classAssignments.filter(a => a.category === targetCat).sort((a,b) => {
                    const scoreA = parseFloat(a.total) === 0 ? 0 : parseFloat(a.grade)/parseFloat(a.total);
                    const scoreB = parseFloat(b.total) === 0 ? 0 : parseFloat(b.grade)/parseFloat(b.total);
                    return scoreA - scoreB;
                });
                if (inCat.length > 0) {
                   const toDrop = inCat.slice(0, count).map(a => a.id);
                   classAssignments = classAssignments.filter(a => !toDrop.includes(a.id));
                }
            }
        });
    }

    let finalPercent = 100;
    const rawTotalPoints = classAssignments.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
    const rawEarnedPoints = classAssignments.reduce((acc, curr) => acc + (parseFloat(curr.grade) || 0), 0);

    if (cls.gradingType === 'WEIGHTED' && cls.categories && cls.categories.length > 0) {
        let totalWeightedScore = 0;
        let totalWeightUsed = 0;
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
        else finalPercent = 100;
    } else {
        // Points Based
        finalPercent = rawTotalPoints === 0 ? 100 : (rawEarnedPoints / rawTotalPoints) * 100;
    }

    const scale = cls.gradingScale || DEFAULT_GRADING_SCALE;
    const details = getGradeDetails(finalPercent, scale);
    return { percent: finalPercent, letter: details.letter, gpa: details.gpa, earned: rawEarnedPoints, total: rawTotalPoints };
  };

  const getCumulativeGPA = () => {
    let totalPoints = 0;
    let totalCredits = 0;
    classes.forEach(cls => {
      const stats = calculateClassGrade(cls.id);
      const credits = parseFloat(cls.credits) || 0;
      totalPoints += (stats.gpa * credits);
      totalCredits += credits;
    });
    return totalCredits === 0 ? "0.00" : (totalPoints / totalCredits).toFixed(2);
  };

  // --- CRUD Handlers ---
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
      const [localSettings, setLocalSettings] = useState({...cls});
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

      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-bold text-lg">Class Settings: {cls.name}</h3>
                    <button onClick={() => setIsClassSettingsOpen(false)}><X size={20}/></button>
                </div>
                <div className="flex border-b">
                    {['GENERAL', 'GRADING', 'SCALE', 'DANGER'].map(t => (
                        <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm font-bold ${tab===t?'border-b-2 border-blue-600 text-blue-600':'text-gray-500'}`}>{t}</button>
                    ))}
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    {tab === 'GENERAL' && (
                        <div className="space-y-4">
                            <input value={localSettings.name} onChange={e=>setLocalSettings({...localSettings, name: e.target.value})} className="border p-2 w-full rounded" placeholder="Class Name"/>
                            <div className="grid grid-cols-2 gap-4">
                                <input value={localSettings.code} onChange={e=>setLocalSettings({...localSettings, code: e.target.value})} className="border p-2 w-full rounded" placeholder="Code"/>
                                <input value={localSettings.credits} onChange={e=>setLocalSettings({...localSettings, credits: e.target.value})} className="border p-2 w-full rounded" placeholder="Credits" type="number"/>
                            </div>
                        </div>
                    )}
                    {tab === 'GRADING' && (
                        <div className="space-y-4">
                            <div className="flex gap-4 mb-4">
                                <button onClick={()=>setLocalSettings({...localSettings, gradingType: 'POINTS'})} className={`flex-1 p-2 border rounded ${localSettings.gradingType==='POINTS'?'bg-blue-50 border-blue-500 text-blue-700':''}`}>Total Points</button>
                                <button onClick={()=>setLocalSettings({...localSettings, gradingType: 'WEIGHTED'})} className={`flex-1 p-2 border rounded ${localSettings.gradingType==='WEIGHTED'?'bg-blue-50 border-blue-500 text-blue-700':''}`}>Weighted</button>
                            </div>
                            {localSettings.gradingType === 'WEIGHTED' && (
                                <div>
                                    <div className="flex justify-between mb-2"><span className="font-bold text-sm">Categories</span><button onClick={addCategory} className="text-blue-600 text-xs">+ Add</button></div>
                                    {localSettings.categories?.map((cat, i) => (
                                        <div key={i} className="flex gap-2 mb-2">
                                            <input value={cat.name} onChange={e=>updateCat(i, 'name', e.target.value)} className="border p-1 flex-1 rounded"/>
                                            <input type="number" value={cat.weight} onChange={e=>updateCat(i, 'weight', e.target.value)} className="border p-1 w-16 rounded"/>
                                            <button onClick={()=>removeCat(i)} className="text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                    <div className="text-right text-xs text-gray-500">Total: {localSettings.categories?.reduce((a,b)=>a+(parseFloat(b.weight)||0),0)}%</div>
                                </div>
                            )}
                        </div>
                    )}
                    {tab === 'DANGER' && (
                        <div className="bg-red-50 p-4 rounded text-center">
                            <p className="text-red-600 text-sm mb-2">Delete class and all data?</p>
                            <button onClick={()=>handleDeleteClass(localSettings.id)} className="bg-red-600 text-white px-4 py-2 rounded">Delete Class</button>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-xl">
                    <button onClick={()=>setIsClassSettingsOpen(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                    <button onClick={()=>handleUpdateClass(localSettings)} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Save Changes</button>
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
      
      // Conic Gradient for Chart
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
                  <h2 className="text-2xl font-bold">Performance Report</h2>
                  <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900"><Printer size={16}/> Print</button>
              </div>
              <div className="bg-white p-8 rounded-xl shadow border print:shadow-none print:border-none">
                  <div className="flex justify-between border-b pb-6 mb-6">
                      <div>
                          <h1 className="text-2xl font-bold text-slate-800">{universityName}</h1>
                          <p className="text-sm text-slate-500">Student Success Portal</p>
                      </div>
                      <div className="text-right text-xs text-slate-400">Generated: {new Date().toLocaleDateString()}</div>
                  </div>
                  
                  {/* KPIs */}
                  <div className="grid grid-cols-4 gap-6 mb-8">
                      <div className="p-4 bg-slate-50 rounded border">
                          <div className="text-xs text-slate-400 uppercase font-bold">GPA</div>
                          <div className="text-3xl font-bold text-blue-800">{getCumulativeGPA()}</div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded border">
                          <div className="text-xs text-slate-400 uppercase font-bold">Credits</div>
                          <div className="text-3xl font-bold text-slate-800">{classes.reduce((a,c)=>a+(parseFloat(c.credits)||0),0)}</div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded border">
                          <div className="text-xs text-slate-400 uppercase font-bold">Completion</div>
                          <div className="text-3xl font-bold text-slate-800">{total===0?0:Math.round((gradedCount/total)*100)}%</div>
                      </div>
                  </div>

                  {/* Visuals */}
                  <div className="grid grid-cols-2 gap-8 mb-8">
                      <div className="p-6 border rounded">
                          <h4 className="font-bold mb-4">Grade Breakdown</h4>
                          <div className="space-y-3">
                              {classes.map(c => {
                                  const s = calculateClassGrade(c.id);
                                  return (
                                      <div key={c.id}>
                                          <div className="flex justify-between text-xs mb-1"><span className="font-bold">{c.code}</span><span>{s.percent.toFixed(1)}%</span></div>
                                          <div className="h-4 w-full bg-slate-100 rounded overflow-hidden">
                                              <div className="h-full bg-blue-600" style={{width: `${s.percent}%`}}></div>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>
                      <div className="p-6 border rounded flex flex-col items-center justify-center">
                          <h4 className="font-bold mb-4 w-full text-left">Workload</h4>
                          <div className="w-32 h-32 rounded-full relative" style={{background: `conic-gradient(${gradStr})`}}>
                              <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center font-bold text-xl">{totalAssigns}</div>
                          </div>
                          <div className="flex gap-4 mt-4 text-xs">
                              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div>Graded</div>
                              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div>Todo</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const CalendarView = () => {
      // Simple list view for now, effectively serves as a timeline
      const sorted = assignments.filter(a => a.dueDate).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate));
      return (
          <div className="space-y-6">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Calendar Timeline</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sorted.map(a => (
                      <div key={a.id} className="bg-white p-4 rounded shadow border border-l-4 border-l-blue-500">
                          <div className="text-xs text-gray-500 mb-1">{a.dueDate}</div>
                          <div className="font-bold">{a.name}</div>
                          <div className="text-xs text-gray-400 mt-2 flex justify-between">
                              <span>{classes.find(c=>c.id===a.classId)?.code}</span>
                              <Badge status={a.status}/>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  // --- Views ---
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
            {classes.map(c => {
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

      <main className="flex-1 overflow-y-auto p-8 print:p-0">
         {view === 'DASHBOARD' && (
             <div className="max-w-5xl mx-auto space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <Card className="bg-gradient-to-br from-blue-800 to-blue-600 text-white border-none">
                         <div className="text-blue-100 text-sm">Cumulative GPA</div>
                         <div className="text-4xl font-bold">{getCumulativeGPA()}</div>
                     </Card>
                     <Card><div className="text-gray-500 text-sm">Assignments Due</div><div className="text-3xl font-bold">{assignments.filter(a=>a.status==='TODO').length}</div></Card>
                     <Card><div className="text-gray-500 text-sm">Completed</div><div className="text-3xl font-bold">{assignments.filter(a=>a.status==='GRADED').length}</div></Card>
                 </div>
                 {/* Class List Card */}
                 <Card>
                     <h3 className="font-bold mb-4">Class Overview</h3>
                     <div className="space-y-2">
                         {classes.map(c => {
                             const s = calculateClassGrade(c.id);
                             return (
                                 <div key={c.id} onClick={() => { setView('CLASS'); setActiveClassId(c.id); }} className="flex justify-between p-3 hover:bg-gray-50 rounded cursor-pointer border-b">
                                     <div><div className="font-bold">{c.name}</div><div className="text-xs text-gray-500">{c.code}</div></div>
                                     <div className="text-right"><div className="font-bold text-blue-700">{s.letter}</div><div className="text-xs text-gray-500">{s.percent.toFixed(1)}%</div></div>
                                 </div>
                             )
                         })}
                     </div>
                 </Card>
             </div>
         )}
         
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

         {view === 'REPORT' && <ReportView />}
         {view === 'CALENDAR' && <CalendarView />}
      </main>

      {/* --- Modals --- */}
      {isGlobalSettingsOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-xl w-full max-w-md">
                  <h3 className="font-bold text-lg mb-4">Global Settings</h3>
                  <div className="space-y-4">
                      <div><label className="text-sm">University Name</label><input value={universityName} onChange={e=>setUniversityName(e.target.value)} className="border p-2 w-full rounded"/></div>
                      <div className="flex justify-end gap-2 mt-4">
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
