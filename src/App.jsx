import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, CheckCircle, Clock, GraduationCap, LayoutDashboard, 
  LogOut, Plus, Settings, Calendar as CalendarIcon, 
  ChevronRight, ChevronLeft, Trash2, X, Download, Wrench, 
  Printer, FileText, Lock, Shield, Key, Save,
  AlertTriangle, ExternalLink, Palette, TrendingUp, Target, Timer,
  Flame, Zap
} from 'lucide-react';

/* GRADE TRACKER - LOAD BALANCER EDITION */

// --- Configuration ---
const DEFAULT_THEME = {
  colors: { primary: "#1e3a8a", secondary: "#3b82f6" },
  universityName: "My University"
};

const DEFAULT_STATUSES = [
  { id: 'TODO', label: 'To Do', color: 'bg-gray-100 text-gray-600 border-gray-200', countsInGrade: false },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200', countsInGrade: false },
  { id: 'TURNED_IN', label: 'Turned In', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', countsInGrade: true },
  { id: 'GRADED', label: 'Graded', color: 'bg-green-100 text-green-700 border-green-200', countsInGrade: true },
  { id: 'LATE', label: 'Late', color: 'bg-red-100 text-red-700 border-red-200', countsInGrade: true }
];

const STATUS_COLORS = [
    { name: 'Gray', class: 'bg-gray-100 text-gray-600 border-gray-200' },
    { name: 'Blue', class: 'bg-blue-100 text-blue-700 border-blue-200' },
    { name: 'Green', class: 'bg-green-100 text-green-700 border-green-200' },
    { name: 'Yellow', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { name: 'Red', class: 'bg-red-100 text-red-700 border-red-200' },
    { name: 'Purple', class: 'bg-purple-100 text-purple-700 border-purple-200' },
];

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

const Badge = ({ status, customStatuses = [] }) => {
  const config = customStatuses.find(s => s.id === status) || DEFAULT_STATUSES[0];
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${config.color}`}>{config.label}</span>;
};

const formatTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

// --- Main App ---
export default function GradeTracker() {
  const [accessKey, setAccessKey] = useState(localStorage.getItem('gt_access_key') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Data
  const [universityName, setUniversityName] = useState(DEFAULT_THEME.universityName);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [events, setEvents] = useState([]);
  const [customStatuses, setCustomStatuses] = useState(DEFAULT_STATUSES);
  
  // Persistence for the Daily Plan
  const [dailyPlan, setDailyPlan] = useState({ date: '', ids: [] });

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
  const [selectedDayItems, setSelectedDayItems] = useState(null);

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
          classes: overrideData?.classes ?? classes,
          assignments: overrideData?.assignments ?? assignments,
          events: overrideData?.events ?? events,
          customStatuses: overrideData?.customStatuses ?? customStatuses,
          dailyPlan: overrideData?.dailyPlan ?? dailyPlan
      };
      await apiCall('/data', 'POST', dbPayload);
  };

  const verifyAndLoad = async () => {
      try {
          setLoading(true);
          const data = await apiCall('/data');
          if (data) {
              setUniversityName(data.universityName || "My University");
              setClasses(data.classes || []);
              setAssignments(data.assignments || []);
              setEvents(data.events || []);
              setCustomStatuses(data.customStatuses || DEFAULT_STATUSES);
              setDailyPlan(data.dailyPlan || { date: '', ids: [] });
              setIsAuthenticated(true);
              localStorage.setItem('gt_access_key', accessKey);
          }
      } catch (e) { setAuthError("Session expired or invalid key."); } 
      finally { setLoading(false); }
  };

  const handleLogin = (e) => { e.preventDefault(); verifyAndLoad(); };
  const handleLogout = () => { localStorage.removeItem('gt_access_key'); setAccessKey(''); setIsAuthenticated(false); };

  // --- Sorting & Load Balancing Logic ---
  
  const get7DayWorkload = () => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      return assignments.filter(a => {
          const due = new Date(a.dueDate);
          const statusConfig = customStatuses.find(s => s.id === a.status);
          const isDone = statusConfig?.countsInGrade || a.status === 'TURNED_IN' || a.status === 'GRADED';
          return due >= today && due <= nextWeek && !isDone;
      });
  };

  const generateDailyPlan = () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const weekWork = get7DayWorkload();
      const quota = Math.ceil(weekWork.length / 7);

      // 1. Mandatory items (Due Tomorrow)
      const dueTomorrow = weekWork.filter(a => a.dueDate === tomorrowStr);
      
      // 2. Remaining pool for filling quota
      const pool = weekWork.filter(a => a.dueDate !== tomorrowStr).sort((a, b) => {
          // Sort by Due Date first
          if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
          
          // Then by Impact (Weight * Points)
          const getImpact = (item) => {
              const cls = classes.find(c => c.id === item.classId);
              const cat = cls?.categories?.find(c => c.name === item.category);
              const weight = parseFloat(cat?.weight || 0) / 100;
              return (parseFloat(item.total) || 0) * (weight || 1);
          };
          return getImpact(b) - getImpact(a);
      });

      const planIds = [...dueTomorrow.map(a => a.id)];
      
      // Fill quota if tomorrow's items don't meet it
      let i = 0;
      while (planIds.length < quota && i < pool.length) {
          planIds.push(pool[i].id);
          i++;
      }

      return { date: todayStr, ids: planIds };
  };

  // Logic to ensure the plan is fresh
  useEffect(() => {
    if (isAuthenticated) {
        const todayStr = new Date().toISOString().split('T')[0];
        // If the saved daily plan is from yesterday, or empty, generate a new one
        if (dailyPlan.date !== todayStr) {
            const newPlan = generateDailyPlan();
            setDailyPlan(newPlan);
            saveData({ dailyPlan: newPlan });
        }
    }
  }, [isAuthenticated, assignments, classes]);

  // --- Grade Calculation ---
  const calculateClassGrade = (classId) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return { percent: 0, letter: 'N/A', gpa: 0.0, earned: 0, total: 0 };

    const now = new Date().toLocaleDateString('en-CA');
    let classAssignments = assignments.filter(a => {
        if (a.classId !== classId) return false;
        const statusConfig = customStatuses.find(s => s.id === a.status);
        return statusConfig?.countsInGrade || (a.dueDate && a.dueDate < now);
    });

    const rawTotalPoints = classAssignments.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
    const rawEarnedPoints = classAssignments.reduce((acc, curr) => acc + (parseFloat(curr.grade) || 0), 0);
    let finalPercent = rawTotalPoints === 0 ? 100 : (rawEarnedPoints / rawTotalPoints) * 100;

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

  // --- Views ---

  const ReportView = () => {
      const weekWork = get7DayWorkload();
      const totalTime = weekWork.reduce((acc, a) => acc + (parseInt(a.estimatedTime) || 0), 0);
      return (
          <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-end">
                  <h2 className="text-3xl font-bold text-slate-800">7-Day Workload Forecast</h2>
                  <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Print Report</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-l-4 border-l-blue-600">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upcoming Tasks</div>
                      <div className="text-3xl font-black text-slate-800 mt-1">{weekWork.length}</div>
                  </Card>
                  <Card className="border-l-4 border-l-purple-600">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Time Required</div>
                      <div className="text-3xl font-black text-slate-800 mt-1">{formatTime(totalTime)}</div>
                  </Card>
                  <Card className="border-l-4 border-l-orange-600">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daily Average</div>
                      <div className="text-3xl font-black text-slate-800 mt-1">{formatTime(Math.ceil(totalTime / 7))}</div>
                  </Card>
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

      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      return (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-800">Academic Calendar</h2>
                  <button onClick={() => setIsEventModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow flex items-center gap-2"><Plus size={16}/> Add Event</button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 flex justify-between items-center bg-gray-50 border-b">
                      <button onClick={()=>setCurrentDate(new Date(year, month-1, 1))} className="p-2 hover:bg-white rounded-full"><ChevronLeft/></button>
                      <h3 className="text-lg font-bold">{monthNames[month]} {year}</h3>
                      <button onClick={()=>setCurrentDate(new Date(year, month+1, 1))} className="p-2 hover:bg-white rounded-full"><ChevronRight/></button>
                  </div>
                  <div className="grid grid-cols-7 text-center bg-gray-100 text-xs font-bold text-gray-500 uppercase py-2">
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d}>{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px">
                      {Array.from({length: firstDay}).map((_,i)=><div key={`e-${i}`} className="bg-white min-h-[120px]"></div>)}
                      {Array.from({length: daysInMonth}).map((_,i)=>{
                          const d = i+1;
                          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                          const dayAssignments = assignments.filter(a => a.dueDate === dateStr);
                          const dayEvents = events.filter(e => e.date === dateStr);
                          const totalItems = dayAssignments.length + dayEvents.length;
                          
                          // Highlighting
                          const isToday = dateStr === todayStr;
                          const isTomorrow = dateStr === tomorrowStr;

                          return (
                              <div key={d} onClick={() => totalItems > 0 && setSelectedDayItems({ date: dateStr, items: [...dayAssignments, ...dayEvents] })} 
                                className={`bg-white min-h-[120px] p-2 hover:bg-blue-50 relative cursor-pointer group transition-colors 
                                ${isToday ? 'bg-red-50' : isTomorrow ? 'bg-blue-50' : ''}`}>
                                  <div className={`text-sm font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                                    ${isToday ? 'bg-red-600 text-white' : isTomorrow ? 'bg-blue-600 text-white' : ''}`}>
                                      {d}
                                  </div>
                                  <div className="flex flex-col items-center justify-center h-full mt-2">
                                      {totalItems > 0 && (
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md ring-2 ring-white group-hover:scale-110 transition-transform 
                                            ${isToday ? 'bg-red-600 text-white' : isTomorrow ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white'}`}>
                                              {totalItems}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>
              {selectedDayItems && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-lg">Timeline: {selectedDayItems.date}</h3>
                              <button onClick={()=>setSelectedDayItems(null)}><X/></button>
                          </div>
                          <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
                              <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between text-xs font-bold text-slate-600">
                                  <span>TIME REMAINING:</span>
                                  <span className="flex items-center gap-1 text-blue-600">
                                    <Timer size={14}/>
                                    {formatTime(selectedDayItems.items.filter(i => {
                                        // If it's an assignment, check status
                                        if (i.grade === undefined) return false;
                                        const sc = customStatuses.find(s => s.id === i.status);
                                        return !sc?.countsInGrade && i.status !== 'TURNED_IN';
                                    }).reduce((acc, i) => acc + (parseInt(i.estimatedTime) || 0), 0))}
                                  </span>
                              </div>
                              {selectedDayItems.items.map((item, idx) => (
                                  <div key={idx} onClick={() => { if(item.grade!==undefined){setActiveAssignment(item); setIsEditModalOpen(true); setSelectedDayItems(null);} }} 
                                    className={`p-3 rounded-lg border-l-4 shadow-sm hover:translate-x-1 transition-transform cursor-pointer 
                                    ${item.grade!==undefined ? 'border-blue-500 bg-blue-50' : 'border-purple-500 bg-purple-50'}`}>
                                      <div className="font-bold text-slate-800">{item.name || item.title}</div>
                                      <div className="text-xs text-slate-500 flex justify-between mt-1">
                                          <span>{item.category || item.type}</span>
                                          {item.estimatedTime && <span>{formatTime(item.estimatedTime)}</span>}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  };

  // --- Dashboard Logic ---
  const todayWork = useMemo(() => {
      // Filter the assignments to only those in the locked daily plan IDs
      // and ensure we don't show items the user has already finished TODAY
      return assignments.filter(a => {
          const isFinishing = a.status === 'TURNED_IN' || a.status === 'GRADED';
          return dailyPlan.ids.includes(a.id) && !isFinishing;
      });
  }, [dailyPlan, assignments]);

  const totalTodayTime = todayWork.reduce((acc, a) => acc + (parseInt(a.estimatedTime) || 0), 0);

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-600">Connecting to Vault...</div>;
  if (!isAuthenticated) return (
    <div className="h-screen flex items-center justify-center bg-gray-50" style={{background: `linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)`}}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
         <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4"><Lock className="text-blue-800"/></div>
            <h1 className="text-2xl font-bold">Secure Access</h1>
            <p className="text-gray-500 text-sm">Local Server Connection</p>
         </div>
         <form onSubmit={handleLogin} className="space-y-4">
             <input type="password" value={accessKey} onChange={e => setAccessKey(e.target.value)} className="w-full p-2 border rounded font-mono" placeholder="Encryption Key" />
             {authError && <div className="text-red-500 text-sm">{authError}</div>}
             <button className="w-full bg-blue-800 text-white p-2 rounded font-bold hover:bg-blue-900">Unlock System</button>
         </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      <aside className="w-64 bg-white border-r flex flex-col print:hidden shadow-sm z-10">
        <div className="p-6 border-b flex items-center gap-3">
           <div className="w-8 h-8 bg-blue-900 text-white rounded flex items-center justify-center font-bold">{universityName[0]}</div>
           <span className="font-bold truncate text-sm">{universityName}</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
            <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 p-2 rounded text-sm font-medium transition-colors ${view==='DASHBOARD'?'bg-blue-50 text-blue-700':'hover:bg-gray-50'}`}><LayoutDashboard size={18}/> Dashboard</button>
            <button onClick={() => setView('CALENDAR')} className={`w-full flex items-center gap-3 p-2 rounded text-sm font-medium transition-colors ${view==='CALENDAR'?'bg-blue-50 text-blue-700':'hover:bg-gray-50'}`}><CalendarIcon size={18}/> Calendar</button>
            <button onClick={() => setView('REPORT')} className={`w-full flex items-center gap-3 p-2 rounded text-sm font-medium transition-colors ${view==='REPORT'?'bg-blue-50 text-blue-700':'hover:bg-gray-50'}`}><TrendingUp size={18}/> Workload</button>
            <div className="pt-6 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Classes</div>
            {classes.map((c) => {
                const s = calculateClassGrade(c.id);
                return (
                    <button key={c.id} onClick={() => { setView('CLASS'); setActiveClassId(c.id); }} className={`w-full flex justify-between p-2 rounded text-sm font-medium ${view==='CLASS'&&activeClassId===c.id ? 'bg-blue-50 text-blue-700':'hover:bg-gray-50'}`}>
                        <span className="flex items-center gap-2 truncate"><BookOpen size={16}/> {c.code}</span>
                        <span className="bg-gray-100 px-1.5 rounded text-[10px] font-bold">{s.letter}</span>
                    </button>
                )
            })}
        </nav>
        <div className="p-4 border-t space-y-1 bg-gray-50">
            <button onClick={() => setIsGlobalSettingsOpen(true)} className="w-full flex gap-3 p-2 hover:bg-white rounded text-sm font-medium"><Settings size={18}/> Settings</button>
            <button onClick={handleLogout} className="w-full flex gap-3 p-2 hover:bg-red-50 text-red-600 rounded text-sm font-medium"><LogOut size={18}/> Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 no-scrollbar">
         {view === 'DASHBOARD' && (
             <div className="max-w-5xl mx-auto space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <Card className="bg-gradient-to-br from-blue-800 to-blue-600 text-white border-none shadow-xl flex flex-col justify-between">
                         <div className="text-blue-100 text-xs font-bold uppercase tracking-wider">Current GPA</div>
                         <div className="text-5xl font-black mt-2">{getCumulativeGPA()}</div>
                         <div className="mt-4 text-[10px] opacity-75 font-bold uppercase">Dean's List Status</div>
                     </Card>
                     <Card className="flex flex-col justify-between border-t-4 border-t-orange-500">
                         <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Tasks Locked for Today</div>
                         <div className="text-4xl font-black text-slate-800 mt-2">{todayWork.length}</div>
                         <div className="mt-4 text-[10px] text-orange-600 font-bold uppercase flex items-center gap-1"><Zap size={10}/> Quota Adjusted</div>
                     </Card>
                     <Card className="flex flex-col justify-between border-t-4 border-t-blue-500">
                         <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">Today's Est. Time</div>
                         <div className="text-4xl font-black text-slate-800 mt-2">{formatTime(totalTodayTime)}</div>
                         <div className="mt-4 text-[10px] text-blue-600 font-bold uppercase">Balanced Workload</div>
                     </Card>
                 </div>
                 
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                     <Card className="lg:col-span-7">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800"><Flame className="text-orange-500" size={20}/> Today's To-Do</h3>
                            <div className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded">Daily Goal Met at 0</div>
                         </div>
                         <div className="space-y-3">
                             {todayWork.length > 0 ? todayWork.map(a => {
                                    const cls = classes.find(c => c.id === a.classId);
                                    const isTomorrow = a.dueDate === new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
                                    return (
                                        <div key={a.id} onClick={() => { setActiveAssignment(a); setIsEditModalOpen(true); }} 
                                            className={`group flex justify-between p-4 bg-white hover:bg-slate-50 rounded-xl border-2 transition-all cursor-pointer
                                            ${isTomorrow ? 'border-blue-100 shadow-sm' : 'border-slate-50'}`}>
                                            <div className="flex gap-4">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className={`w-2 h-2 rounded-full ${isTomorrow ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                                    <div className="w-px h-full bg-slate-100 mt-1"></div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors">{a.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase flex gap-2 mt-1">
                                                        <span>{cls?.code}</span>
                                                        <span className={isTomorrow ? 'text-blue-600' : ''}>{a.dueDate === new Date().toISOString().split('T')[0] ? 'TODAY' : isTomorrow ? 'TOMORROW' : a.dueDate}</span>
                                                        <span>• {formatTime(a.estimatedTime || 0)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge status={a.status} customStatuses={customStatuses} />
                                        </div>
                                    )
                                }) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32}/></div>
                                        <p className="font-bold text-slate-800">Today's Goal Complete!</p>
                                        <p className="text-xs text-slate-400 mt-1 uppercase">New plan unlocks at midnight.</p>
                                    </div>
                                )
                             }
                         </div>
                     </Card>
                     <Card className="lg:col-span-5">
                         <h3 className="font-bold mb-6 text-slate-800">7-Day Snapshot</h3>
                         <div className="space-y-3">
                             {classes.map((c, i) => {
                                 const s = calculateClassGrade(c.id);
                                 const colorClass = CLASS_COLORS[i % CLASS_COLORS.length];
                                 return (
                                     <div key={c.id} onClick={() => { setView('CLASS'); setActiveClassId(c.id); }} 
                                        className={`flex justify-between p-4 rounded-xl cursor-pointer border-2 hover:shadow-lg transition-all ${colorClass.replace('text', 'border').replace('100', '200')}`}>
                                         <div>
                                            <div className="font-black text-slate-800">{c.code}</div>
                                            <div className="text-[10px] font-bold opacity-60 uppercase">{c.name}</div>
                                         </div>
                                         <div className="text-right">
                                            <div className="font-black text-2xl text-slate-800 leading-none">{s.letter}</div>
                                            <div className="text-[10px] font-bold opacity-60 mt-1">{s.percent.toFixed(1)}%</div>
                                         </div>
                                     </div>
                                 )
                             })}
                         </div>
                     </Card>
                 </div>
             </div>
         )}
         
         {view === 'REPORT' && <ReportView />}
         {view === 'CALENDAR' && <CalendarView />}
         
         {view === 'CLASS' && activeClassId && (() => {
             const cls = classes.find(c => c.id === activeClassId);
             const s = calculateClassGrade(activeClassId);
             return (
                 <div className="max-w-5xl mx-auto space-y-6">
                     <div className="flex justify-between items-center bg-white p-8 rounded-2xl shadow-sm border">
                         <div className="flex items-center gap-6">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${CLASS_COLORS[classes.indexOf(cls) % CLASS_COLORS.length]}`}>{cls?.code[0]}</div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-800">{cls?.name}</h2>
                                <div className="flex gap-3 text-xs font-bold text-slate-400 uppercase mt-1">
                                    <span>{cls?.code}</span><span>•</span><span>{cls?.credits} Credits</span>
                                </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-6">
                             <button onClick={() => setIsClassSettingsOpen(true)} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border text-slate-400 hover:text-slate-600"><Wrench size={24}/></button>
                             <div className="text-right">
                                 <div className="text-4xl font-black text-blue-700 leading-none">{s.percent.toFixed(1)}%</div>
                                 <div className="text-[10px] font-bold text-slate-400 uppercase mt-2">Class Average</div>
                             </div>
                         </div>
                     </div>
                     <Card>
                         <div className="flex justify-between items-center mb-6">
                             <h3 className="font-bold text-xl text-slate-800">Assignments</h3>
                             <button onClick={() => {
                                 const newId = crypto.randomUUID();
                                 const defaultCategory = cls?.categories?.[0];
                                 const newAsg = { 
                                     id: newId, 
                                     classId: activeClassId, 
                                     name: "New Task", 
                                     status: "TODO", 
                                     grade: 0, 
                                     total: 100, 
                                     dueDate: new Date().toISOString().split('T')[0], 
                                     category: defaultCategory?.name || "Homework",
                                     estimatedTime: defaultCategory?.defaultTime || 30
                                 };
                                 const updatedAsgs = [...assignments, newAsg];
                                 setAssignments(updatedAsgs);
                                 saveData({ assignments: updatedAsgs });
                                 setActiveAssignment(newAsg);
                                 setIsEditModalOpen(true);
                             }} className="text-xs font-black bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg shadow-blue-100 uppercase">+ New Assignment</button>
                         </div>
                         <div className="space-y-2">
                             {assignments.filter(a => a.classId === activeClassId).sort((a,b) => b.dueDate.localeCompare(a.dueDate)).map(a => (
                                 <div key={a.id} onClick={() => { setActiveAssignment(a); setIsEditModalOpen(true); }} className="flex justify-between p-4 hover:bg-slate-50 rounded-xl border border-slate-50 transition-all cursor-pointer items-center">
                                     <div className="flex-1">
                                         <div className="font-bold text-slate-800">{a.name}</div>
                                         <div className="text-[10px] font-bold text-slate-400 uppercase flex gap-3 mt-1">
                                            <span>{a.category}</span><span>•</span><span>{a.dueDate}</span><span>•</span><span>{formatTime(a.estimatedTime || 0)}</span>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-6">
                                         <Badge status={a.status} customStatuses={customStatuses} />
                                         <span className="text-sm font-black text-slate-800 w-16 text-right">{a.grade}/{a.total}</span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </Card>
                 </div>
             )
         })()}
      </main>

      {/* --- Modals --- */}
      {isGlobalSettingsOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-8 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="font-black text-2xl text-slate-800">System Preferences</h3>
                      <button onClick={()=>setIsGlobalSettingsOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={24}/></button>
                  </div>
                  <div className="space-y-8">
                      <div>
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Institution Name</label>
                          <input value={universityName} onChange={e=>setUniversityName(e.target.value)} className="border-2 p-3 w-full rounded-xl focus:border-blue-500 outline-none transition-colors font-bold"/>
                      </div>
                      <div className="border-t pt-6">
                          <div className="flex justify-between items-center mb-6">
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Status Workflow</label>
                              <button onClick={() => setCustomStatuses([...customStatuses, { id: crypto.randomUUID(), label: 'New', color: STATUS_COLORS[0].class, countsInGrade: false }])} className="text-blue-600 text-[10px] font-black uppercase tracking-wider bg-blue-50 px-2 py-1 rounded">+ Create Status</button>
                          </div>
                          <div className="space-y-4">
                              {customStatuses.map((s, i) => (
                                  <div key={s.id} className="bg-slate-50 p-4 rounded-xl border flex flex-col gap-4">
                                      <div className="flex gap-4 items-center">
                                          <input value={s.label} onChange={(e) => { const news = [...customStatuses]; news[i].label = e.target.value; setCustomStatuses(news); }} className="border-2 p-2 flex-1 rounded-lg text-sm font-bold"/>
                                          <button onClick={() => setCustomStatuses(customStatuses.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={20}/></button>
                                      </div>
                                      <div className="flex justify-between items-center">
                                          <div className="flex gap-2">
                                              {STATUS_COLORS.map(c => (
                                                  <button key={c.name} onClick={() => { const news = [...customStatuses]; news[i].color = c.class; setCustomStatuses(news); }} className={`w-8 h-8 rounded-full border-2 ${c.class.split(' ')[0]} ${s.color === c.class ? 'border-slate-800' : 'border-transparent'}`}/>
                                              ))}
                                          </div>
                                          <label className="flex items-center gap-3 text-xs font-bold text-slate-600 cursor-pointer">
                                              <input type="checkbox" checked={s.countsInGrade} onChange={(e) => { const news = [...customStatuses]; news[i].countsInGrade = e.target.checked; setCustomStatuses(news); }} className="w-4 h-4 accent-blue-600"/>
                                              Calculates GPA
                                          </label>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="pt-6">
                          <button onClick={() => { saveData({ universityName, customStatuses }); setIsGlobalSettingsOpen(false); }} className="w-full bg-slate-900 text-white p-4 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-slate-200">Save Configuration</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {isAddClassModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
             <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
                 <h3 className="font-black text-xl mb-6 text-slate-800">Add New Course</h3>
                 <form onSubmit={(e) => { 
                     e.preventDefault(); 
                     const fd = new FormData(e.target);
                     const newClass = { id: crypto.randomUUID(), name: fd.get('name'), code: fd.get('code'), credits: fd.get('credits'), categories: [{name: 'Homework', weight: 0, defaultTime: 30}], gradingType: 'POINTS' };
                     setClasses([...classes, newClass]);
                     saveData({ classes: [...classes, newClass] });
                     setIsAddClassModalOpen(false);
                 }} className="space-y-4">
                     <input name="name" placeholder="Course Full Name" className="border-2 p-3 w-full rounded-xl font-bold" required />
                     <input name="code" placeholder="Course Code (e.g. CS101)" className="border-2 p-3 w-full rounded-xl font-bold" required />
                     <input name="credits" placeholder="Credits" type="number" className="border-2 p-3 w-full rounded-xl font-bold" required />
                     <button className="bg-blue-600 text-white w-full p-4 rounded-xl font-black uppercase tracking-widest mt-2">Create Course</button>
                 </form>
             </div>
          </div>
      )}

      {isEditModalOpen && activeAssignment && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
               <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-2xl">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="font-black text-xl text-slate-800">Task Details</h3>
                       <button onClick={()=>setIsEditModalOpen(false)} className="text-slate-400"><X size={24}/></button>
                   </div>
                   <div className="space-y-5">
                       <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Title</label><input value={activeAssignment.name} onChange={e => setActiveAssignment({...activeAssignment, name: e.target.value})} className="border-2 p-3 w-full rounded-xl font-bold" /></div>
                       <div className="grid grid-cols-2 gap-4">
                           <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Score Earned</label><input type="number" value={activeAssignment.grade} onChange={e => setActiveAssignment({...activeAssignment, grade: e.target.value})} className="border-2 p-3 w-full rounded-xl font-bold"/></div>
                           <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Points</label><input type="number" value={activeAssignment.total} onChange={e => setActiveAssignment({...activeAssignment, total: e.target.value})} className="border-2 p-3 w-full rounded-xl font-bold"/></div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Due Date</label><input type="date" value={activeAssignment.dueDate} onChange={e => setActiveAssignment({...activeAssignment, dueDate: e.target.value})} className="border-2 p-3 w-full rounded-xl font-bold"/></div>
                           <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</label>
                               <select value={activeAssignment.status} onChange={e => setActiveAssignment({...activeAssignment, status: e.target.value})} className="border-2 p-3 w-full rounded-xl font-bold bg-white">
                                   {customStatuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                               </select>
                           </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Category</label>
                               <select value={activeAssignment.category} onChange={e => {
                                   const catName = e.target.value;
                                   const cls = classes.find(c => c.id === activeAssignment.classId);
                                   const cat = cls?.categories?.find(c => c.name === catName);
                                   setActiveAssignment({...activeAssignment, category: catName, estimatedTime: cat?.defaultTime || 30});
                               }} className="border-2 p-3 w-full rounded-xl font-bold bg-white">
                                   {classes.find(c => c.id === activeAssignment.classId)?.categories?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                               </select>
                           </div>
                           <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estimate (mins)</label>
                               <input type="number" value={activeAssignment.estimatedTime} onChange={e => setActiveAssignment({...activeAssignment, estimatedTime: e.target.value})} className="border-2 p-3 w-full rounded-xl font-bold"/>
                           </div>
                       </div>
                       <div className="flex justify-between pt-6 border-t mt-4">
                           <button onClick={() => handleDeleteAssignment(activeAssignment.id)} className="text-red-500 font-bold flex items-center gap-2 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"><Trash2 size={20}/> Delete</button>
                           <button onClick={() => handleUpdateAssignment(activeAssignment)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest shadow-xl">Apply Updates</button>
                       </div>
                   </div>
               </div>
           </div>
      )}

    </div>
  );
}
