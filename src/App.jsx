import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, CheckCircle, Clock, GraduationCap, LayoutDashboard, 
  LogOut, Plus, Settings, Calendar as CalendarIcon, 
  ChevronRight, ChevronLeft, Trash2, X, Download, Wrench, 
  Printer, FileText, Lock, Shield, Key, Save,
  AlertTriangle, ExternalLink, Palette, TrendingUp, Target, Timer,
  Flame, Zap, Info
} from 'lucide-react';

/**
 * GRADE TRACKER - PRO LOAD BALANCER EDITION
 * Features: Time Tracking, Smart Quota, Daily Plan Persistence, Enhanced Calendar
 */

// --- Constants & Defaults ---
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

// --- Utilities ---
const formatTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    {children}
  </div>
);

const Badge = ({ status, customStatuses = [] }) => {
  const config = customStatuses.find(s => s.id === status) || DEFAULT_STATUSES[0];
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${config.color}`}>{config.label}</span>;
};

// --- Main Component ---
export default function GradeTracker() {
  const [accessKey, setAccessKey] = useState(localStorage.getItem('gt_access_key') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // App Data
  const [universityName, setUniversityName] = useState(DEFAULT_THEME.universityName);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [events, setEvents] = useState([]);
  const [customStatuses, setCustomStatuses] = useState(DEFAULT_STATUSES);
  const [dailyPlan, setDailyPlan] = useState({ date: '', ids: [] });

  // UI State
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

  // --- API Communications ---
  const apiCall = async (endpoint, method = 'GET', body = null) => {
    const headers = { 'Content-Type': 'application/json', 'x-access-key': accessKey };
    try {
        const res = await fetch(`/api${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : null });
        if (res.status === 401 || res.status === 403) {
            setIsAuthenticated(false);
            throw new Error("Invalid Key");
        }
        return await res.json();
    } catch (e) {
        console.error("API Error:", e);
        throw e;
    }
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
      try {
          await apiCall('/data', 'POST', dbPayload);
      } catch (e) {
          console.error("Save Failed:", e);
      }
  };

  const verifyAndLoad = async () => {
      setLoading(true);
      setAuthError('');
      try {
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
      } catch (e) {
          setAuthError("Failed to connect: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    if (accessKey) verifyAndLoad(); else setLoading(false);
  }, []);

  // --- Dashboard Sorting & Plan Logic ---
  
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const getWeekPool = () => {
      const weekRange = new Date();
      weekRange.setDate(weekRange.getDate() + 7);
      const weekRangeStr = weekRange.toISOString().split('T')[0];

      return assignments.filter(a => {
          const isDone = a.status === 'TURNED_IN' || a.status === 'GRADED';
          return a.dueDate <= weekRangeStr && a.dueDate >= todayStr && !isDone;
      });
  };

  const getDailyPlanQuota = () => {
      const pool = getWeekPool();
      return Math.ceil(pool.length / 7) || 1;
  };

  const constructPlan = () => {
      const pool = getWeekPool();
      const quota = getDailyPlanQuota();
      
      // Tier 1: Anything due Tomorrow is mandatory
      const mustDo = pool.filter(a => a.dueDate === tomorrowStr);
      
      // Tier 2: Rest of pool sorted by Impact (Weight * Total) then Due Date
      const remainingPool = pool.filter(a => a.dueDate !== tomorrowStr).sort((a, b) => {
          if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
          const getImpact = (item) => {
              const cls = classes.find(c => c.id === item.classId);
              const cat = cls?.categories?.find(c => c.name === item.category);
              const weight = parseFloat(cat?.weight || 0) / 100;
              return (parseFloat(item.total) || 0) * (weight || 1);
          };
          return getImpact(b) - getImpact(a);
      });

      const planIds = [...mustDo.map(a => a.id)];
      let i = 0;
      while (planIds.length < quota && i < remainingPool.length) {
          planIds.push(remainingPool[i].id);
          i++;
      }
      return planIds;
  };

  // Run Plan Generation only if date changed
  useEffect(() => {
    if (isAuthenticated && dailyPlan.date !== todayStr) {
        const newIds = constructPlan();
        const newPlan = { date: todayStr, ids: newIds };
        setDailyPlan(newPlan);
        saveData({ dailyPlan: newPlan });
    }
  }, [isAuthenticated, assignments, classes, universityName]);

  const todayWork = useMemo(() => {
      return assignments.filter(a => {
          const isFinished = a.status === 'TURNED_IN' || a.status === 'GRADED';
          return dailyPlan.ids.includes(a.id) && !isFinished;
      });
  }, [dailyPlan, assignments]);

  const totalTodayTime = todayWork.reduce((acc, a) => acc + (parseInt(a.estimatedTime) || 0), 0);

  // --- Grading Logic ---
  const calculateClassGrade = (classId) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return { percent: 0, letter: 'N/A', gpa: 0, earned: 0, total: 0 };
    
    let classAssignments = assignments.filter(a => {
        if (a.classId !== classId) return false;
        const sc = customStatuses.find(s => s.id === a.status);
        return sc?.countsInGrade || (a.dueDate && a.dueDate < todayStr);
    });

    const earned = classAssignments.reduce((acc, a) => acc + (parseFloat(a.grade) || 0), 0);
    const total = classAssignments.reduce((acc, a) => acc + (parseFloat(a.total) || 0), 0);
    const percent = total > 0 ? (earned / total) * 100 : 100;

    const scale = cls.gradingScale || DEFAULT_GRADING_SCALE;
    const details = [...scale].sort((a,b)=>b.min-a.min).find(s => percent >= s.min) || scale[scale.length-1];

    return { percent, letter: details?.letter || 'F', gpa: details?.gpa || 0, earned, total };
  };

  const getCumulativeGPA = () => {
    let pts = 0, crs = 0;
    classes.forEach(c => {
        const s = calculateClassGrade(c.id);
        const credits = parseFloat(c.credits) || 0;
        pts += (s.gpa * credits);
        crs += credits;
    });
    return crs > 0 ? (pts / crs).toFixed(2) : "0.00";
  };

  // --- Handlers ---
  const handleUpdateAssignment = async (updated) => {
      const newList = assignments.map(a => a.id === updated.id ? updated : a);
      setAssignments(newList);
      await saveData({ assignments: newList });
      setIsEditModalOpen(false);
  };

  const handleCreateAssignment = async (activeId) => {
      const cls = classes.find(c => c.id === activeId);
      const cat = cls?.categories?.[0];
      const newAsg = {
          id: crypto.randomUUID(),
          classId: activeId,
          name: "New Task",
          status: "TODO",
          grade: 0,
          total: 100,
          dueDate: todayStr,
          category: cat?.name || "Homework",
          estimatedTime: cat?.defaultTime || 30
      };
      const newList = [...assignments, newAsg];
      setAssignments(newList);
      await saveData({ assignments: newList });
      setActiveAssignment(newAsg);
      setIsEditModalOpen(true);
  };

  // --- Views ---

  const CalendarView = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

      return (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-slate-800">Academic Schedule</h2>
                  <button onClick={() => setIsEventModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-100">+ Event</button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <div className="p-4 flex justify-between items-center bg-slate-50 border-b">
                      <button onClick={()=>setCurrentDate(new Date(year, month-1, 1))} className="p-2 hover:bg-white rounded-full transition-colors"><ChevronLeft size={20}/></button>
                      <h3 className="text-lg font-black">{monthNames[month]} {year}</h3>
                      <button onClick={()=>setCurrentDate(new Date(year, month+1, 1))} className="p-2 hover:bg-white rounded-full transition-colors"><ChevronRight size={20}/></button>
                  </div>
                  <div className="grid grid-cols-7 text-center bg-slate-100 text-[10px] font-black text-slate-400 uppercase py-3 tracking-widest">
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d}>{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
                      {Array.from({length: firstDay}).map((_,i)=><div key={`e-${i}`} className="bg-white min-h-[120px]"></div>)}
                      {Array.from({length: daysInMonth}).map((_,i)=>{
                          const d = i+1;
                          const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                          const asgs = assignments.filter(a => a.dueDate === ds);
                          const evts = events.filter(e => e.date === ds);
                          const total = asgs.length + evts.length;
                          
                          const isToday = ds === todayStr;
                          const isTomorrow = ds === tomorrowStr;

                          return (
                              <div key={d} onClick={() => total > 0 && setSelectedDayItems({ date: ds, items: [...asgs, ...evts] })} 
                                className={`bg-white min-h-[120px] p-2 hover:bg-slate-50 relative cursor-pointer group transition-colors 
                                ${isToday ? 'bg-red-50/50' : isTomorrow ? 'bg-blue-50/50' : ''}`}>
                                  <div className={`text-xs font-black w-7 h-7 flex items-center justify-center rounded-full
                                    ${isToday ? 'bg-red-600 text-white shadow-lg shadow-red-100' : isTomorrow ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400'}`}>
                                      {d}
                                  </div>
                                  <div className="flex flex-col items-center justify-center h-full mt-1">
                                      {total > 0 && (
                                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-md border-2 border-white
                                            ${isToday ? 'bg-red-600 text-white' : isTomorrow ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'}`}>
                                              {total}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>
              {selectedDayItems && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <Card className="w-full max-w-md shadow-2xl p-0 overflow-hidden">
                          <div className="bg-slate-50 p-6 border-b flex justify-between items-center">
                              <h3 className="font-black text-lg">Due {selectedDayItems.date}</h3>
                              <button onClick={()=>setSelectedDayItems(null)}><X size={24}/></button>
                          </div>
                          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
                              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Time Remaining</div>
                                  <div className="flex items-center gap-2 text-blue-700 font-black">
                                    <Timer size={16}/>
                                    {formatTime(selectedDayItems.items.filter(i => {
                                        if (i.grade === undefined) return false;
                                        return i.status !== 'TURNED_IN' && i.status !== 'GRADED';
                                    }).reduce((acc, i) => acc + (parseInt(i.estimatedTime) || 0), 0))}
                                  </div>
                              </div>
                              {selectedDayItems.items.map((item, idx) => (
                                  <div key={idx} onClick={() => { if(item.grade!==undefined){setActiveAssignment(item); setIsEditModalOpen(true); setSelectedDayItems(null);} }} 
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md
                                    ${item.grade!==undefined ? 'border-blue-50 bg-white' : 'border-purple-50 bg-purple-50'}`}>
                                      <div className="font-bold text-slate-800">{item.name || item.title}</div>
                                      <div className="text-[10px] font-bold text-slate-400 uppercase flex justify-between mt-2">
                                          <span>{item.category || item.type}</span>
                                          {item.estimatedTime && <span className="flex items-center gap-1"><Clock size={10}/> {formatTime(item.estimatedTime)}</span>}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </Card>
                  </div>
              )}
          </div>
      );
  };

  // --- Auth & Loading States ---
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-slate-400 font-black uppercase tracking-[0.2em] animate-pulse">Establishing Link...</div>
    </div>
  );

  if (!isAuthenticated) return (
    <div className="h-screen flex items-center justify-center bg-slate-900 overflow-hidden relative">
      <div className="absolute inset-0 bg-blue-600/10 mix-blend-overlay"></div>
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md relative z-10 border-t-8 border-blue-600">
         <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl mx-auto flex items-center justify-center mb-6 text-blue-600"><Lock size={32} strokeWidth={2.5}/></div>
            <h1 className="text-2xl font-black text-slate-800">Local Encrypted Link</h1>
            <p className="text-slate-400 text-sm font-medium mt-1">GradeTracker Local Server</p>
         </div>
         <form onSubmit={handleLogin} className="space-y-6">
             <div className="relative">
                <input type="password" value={accessKey} onChange={e => setAccessKey(e.target.value)} 
                    className="w-full p-4 border-2 rounded-2xl font-mono focus:border-blue-600 outline-none transition-all placeholder-slate-300" 
                    placeholder="Enter Access Key" />
                <Key className="absolute right-4 top-4 text-slate-300" size={20}/>
             </div>
             {authError && <div className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded-lg">{authError}</div>}
             <button className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">Unlock System</button>
         </form>
         <div className="mt-8 text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest">Single User Encryption Active</div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      <aside className="w-64 bg-white border-r flex flex-col print:hidden shadow-sm">
        <div className="p-8 flex items-center gap-4">
           <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black shadow-lg shadow-slate-200">{universityName[0]}</div>
           <div className="truncate flex flex-col">
                <span className="font-black text-slate-800 text-sm leading-none">{universityName}</span>
                <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Academic Link</span>
           </div>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
            <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-black transition-all ${view==='DASHBOARD'?'bg-blue-600 text-white shadow-xl shadow-blue-100':'text-slate-400 hover:bg-slate-50'}`}><LayoutDashboard size={18}/> Dashboard</button>
            <button onClick={() => setView('CALENDAR')} className={`w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-black transition-all ${view==='CALENDAR'?'bg-blue-600 text-white shadow-xl shadow-blue-100':'text-slate-400 hover:bg-slate-50'}`}><CalendarIcon size={18}/> Calendar</button>
            <button onClick={() => setView('REPORT')} className={`w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-black transition-all ${view==='REPORT'?'bg-blue-600 text-white shadow-xl shadow-blue-100':'text-slate-400 hover:bg-slate-50'}`}><TrendingUp size={18}/> Reports</button>
            <div className="pt-8 pb-3 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-3">Courses</div>
            {classes.map((c, i) => {
                const s = calculateClassGrade(c.id);
                const isActive = view==='CLASS'&&activeClassId===c.id;
                return (
                    <button key={c.id} onClick={() => { setView('CLASS'); setActiveClassId(c.id); }} className={`w-full flex justify-between items-center p-3 rounded-2xl text-xs font-black transition-all ${isActive ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`}>
                        <span className="flex items-center gap-3 truncate"><BookOpen size={16}/> {c.code}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] ${isActive ? 'bg-white' : 'bg-slate-100'}`}>{s.letter}</span>
                    </button>
                )
            })}
            <button onClick={() => setIsAddClassModalOpen(true)} className="w-full flex gap-3 p-3 mt-4 border-2 border-dashed border-slate-100 rounded-2xl text-xs font-black text-slate-300 hover:border-blue-200 hover:text-blue-400 transition-all uppercase"><Plus size={18}/> New Course</button>
        </nav>
        <div className="p-4 border-t space-y-2 bg-slate-50/50">
            <button onClick={() => setIsGlobalSettingsOpen(true)} className="w-full flex gap-3 p-3 hover:bg-white hover:shadow-sm rounded-2xl text-xs font-black text-slate-500 transition-all"><Settings size={18}/> Settings</button>
            <button onClick={handleLogout} className="w-full flex gap-3 p-3 hover:bg-red-50 text-red-500 rounded-2xl text-xs font-black transition-all"><LogOut size={18}/> Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-10 no-scrollbar relative">
         {view === 'DASHBOARD' && (
             <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group">
                         <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><GraduationCap size={160}/></div>
                         <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Performance GPA</div>
                         <div className="text-6xl font-black mt-2 tracking-tighter">{getCumulativeGPA()}</div>
                         <div className="mt-6 flex items-center gap-2 text-[10px] text-blue-400 font-black uppercase tracking-widest"><Zap size={12}/> Academic Link Est.</div>
                     </Card>
                     <Card className="border-t-8 border-t-orange-500 shadow-lg shadow-orange-50">
                         <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Planned for Today</div>
                         <div className="text-5xl font-black text-slate-800 mt-2">{todayWork.length}</div>
                         <div className="mt-6 text-[10px] text-orange-600 font-black uppercase flex items-center gap-2 bg-orange-50 w-fit px-2 py-1 rounded-lg"><Flame size={12}/> Locked Daily Quota</div>
                     </Card>
                     <Card className="border-t-8 border-t-blue-600 shadow-lg shadow-blue-50">
                         <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Est. Daily Effort</div>
                         <div className="text-5xl font-black text-slate-800 mt-2">{formatTime(totalTodayTime)}</div>
                         <div className="mt-6 text-[10px] text-blue-600 font-black uppercase flex items-center gap-2 bg-blue-50 w-fit px-2 py-1 rounded-lg"><Timer size={12}/> Balanced Load</div>
                     </Card>
                 </div>
                 
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                     <div className="lg:col-span-8 space-y-6">
                         <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
                            <h3 className="font-black text-xl flex items-center gap-3 text-slate-800"><Flame className="text-orange-500" size={24}/> Today's Execution Plan</h3>
                            <div className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-2"><Info size={12}/> Locked until Midnight</div>
                         </div>
                         <div className="space-y-4">
                             {todayWork.length > 0 ? todayWork.map(a => {
                                    const cls = classes.find(c => c.id === a.classId);
                                    const isTomorrow = a.dueDate === tomorrowStr;
                                    return (
                                        <div key={a.id} onClick={() => { setActiveAssignment(a); setIsEditModalOpen(true); }} 
                                            className={`group flex justify-between p-6 bg-white hover:bg-slate-50 rounded-3xl border-2 transition-all cursor-pointer shadow-sm
                                            ${isTomorrow ? 'border-blue-200' : 'border-slate-50'}`}>
                                            <div className="flex gap-6">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-4 h-4 rounded-full border-4 border-white shadow-sm ${isTomorrow ? 'bg-blue-600 animate-pulse' : 'bg-slate-200'}`}></div>
                                                    <div className="w-0.5 h-full bg-slate-100 mt-2"></div>
                                                </div>
                                                <div>
                                                    <div className="text-lg font-black text-slate-800 group-hover:text-blue-600 transition-colors">{a.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-black uppercase flex gap-4 mt-2 tracking-widest">
                                                        <span className="text-slate-900">{cls?.code}</span>
                                                        <span className={isTomorrow ? 'text-blue-600 font-black' : ''}>{isTomorrow ? 'DUE TOMORROW' : 'DUE NEXT WEEK'}</span>
                                                        <span className="flex items-center gap-1"><Timer size={12}/> {formatTime(a.estimatedTime || 0)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge status={a.status} customStatuses={customStatuses} />
                                        </div>
                                    )
                                }) : (
                                    <Card className="text-center py-16 bg-white border-dashed border-2">
                                        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><CheckCircle size={40}/></div>
                                        <p className="font-black text-2xl text-slate-800">Mission Accomplished</p>
                                        <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest">Your quota for today is finished.</p>
                                    </Card>
                                )
                             }
                         </div>
                     </div>
                     <div className="lg:col-span-4 space-y-6">
                         <Card className="border-t-8 border-t-slate-800">
                             <h3 className="font-black text-lg text-slate-800 mb-6">Course Standings</h3>
                             <div className="space-y-4">
                                 {classes.map((c, i) => {
                                     const s = calculateClassGrade(c.id);
                                     const clr = CLASS_COLORS[i % CLASS_COLORS.length];
                                     return (
                                         <div key={c.id} onClick={() => { setView('CLASS'); setActiveClassId(c.id); }} 
                                            className={`flex justify-between p-5 rounded-2xl cursor-pointer border-2 hover:shadow-xl transition-all ${clr.replace('text', 'border').replace('100', '200')}`}>
                                             <div>
                                                <div className="font-black text-slate-800 leading-tight">{c.code}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Standings</div>
                                             </div>
                                             <div className="text-right">
                                                <div className="font-black text-3xl text-slate-800 leading-none">{s.letter}</div>
                                                <div className="text-[10px] font-bold text-slate-400 mt-2">{s.percent.toFixed(0)}%</div>
                                             </div>
                                         </div>
                                     )
                                 })}
                             </div>
                         </Card>
                     </div>
                 </div>
             </div>
         )}
         
         {view === 'CALENDAR' && <CalendarView />}
         
         {view === 'CLASS' && activeClassId && (() => {
             const cls = classes.find(c => c.id === activeClassId);
             const s = calculateClassGrade(activeClassId);
             return (
                 <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                     <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border flex justify-between items-center">
                         <div className="flex items-center gap-10">
                            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black ${CLASS_COLORS[classes.indexOf(cls) % CLASS_COLORS.length]} shadow-lg`}>{cls?.code[0]}</div>
                            <div>
                                <h2 className="text-4xl font-black text-slate-800 tracking-tighter">{cls?.name}</h2>
                                <div className="flex gap-4 text-xs font-black text-slate-300 uppercase mt-3 tracking-widest">
                                    <span className="text-slate-900">{cls?.code}</span><span>•</span><span>{cls?.credits} Credits</span>
                                </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-10">
                             <button onClick={() => setIsClassSettingsOpen(true)} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all border text-slate-300 hover:text-slate-800 hover:shadow-inner"><Wrench size={32}/></button>
                             <div className="text-right">
                                 <div className="text-6xl font-black text-blue-600 tracking-tighter leading-none">{s.percent.toFixed(1)}%</div>
                                 <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4 text-right">Running Grade</div>
                             </div>
                         </div>
                     </div>
                     <Card className="p-8">
                         <div className="flex justify-between items-center mb-8">
                             <h3 className="font-black text-2xl text-slate-800">Master Task List</h3>
                             <button onClick={() => handleCreateAssignment(activeClassId)} className="text-xs font-black bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl shadow-slate-100 uppercase tracking-widest">+ Create Assignment</button>
                         </div>
                         <div className="space-y-4">
                             {assignments.filter(a => a.classId === activeClassId).sort((a,b) => b.dueDate.localeCompare(a.dueDate)).map(a => (
                                 <div key={a.id} onClick={() => { setActiveAssignment(a); setIsEditModalOpen(true); }} className="flex justify-between p-6 hover:bg-slate-50 rounded-3xl border-2 border-slate-50 transition-all cursor-pointer items-center">
                                     <div className="flex-1">
                                         <div className="text-lg font-black text-slate-800">{a.name}</div>
                                         <div className="text-[10px] font-black text-slate-400 uppercase flex gap-6 mt-2 tracking-widest">
                                            <span>{a.category}</span><span>•</span><span>{a.dueDate}</span><span>•</span><span className="flex items-center gap-1"><Timer size={12}/> {formatTime(a.estimatedTime || 0)}</span>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-8">
                                         <Badge status={a.status} customStatuses={customStatuses} />
                                         <span className="text-lg font-black text-slate-800 w-20 text-right tracking-tighter">{a.grade} / {a.total}</span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </Card>
                 </div>
             )
         })()}
      </main>

      {/* --- Global Modals --- */}
      {isEditModalOpen && activeAssignment && (
           <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
               <Card className="w-full max-w-xl shadow-2xl p-0 overflow-hidden">
                   <div className="bg-slate-50 p-8 border-b flex justify-between items-center">
                       <h3 className="font-black text-2xl text-slate-800 tracking-tighter">Task Configuration</h3>
                       <button onClick={()=>setIsEditModalOpen(false)} className="text-slate-300 hover:text-slate-800"><X size={32}/></button>
                   </div>
                   <div className="p-8 space-y-6">
                       <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Primary Name</label>
                           <input value={activeAssignment.name} onChange={e => setActiveAssignment({...activeAssignment, name: e.target.value})} className="border-2 p-4 w-full rounded-2xl font-black text-slate-800 focus:border-blue-600 outline-none transition-all" />
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Result Earned</label>
                               <input type="number" value={activeAssignment.grade} onChange={e => setActiveAssignment({...activeAssignment, grade: e.target.value})} className="border-2 p-4 w-full rounded-2xl font-black focus:border-blue-600 outline-none"/>
                           </div>
                           <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Points Cap</label>
                               <input type="number" value={activeAssignment.total} onChange={e => setActiveAssignment({...activeAssignment, total: e.target.value})} className="border-2 p-4 w-full rounded-2xl font-black focus:border-blue-600 outline-none"/>
                           </div>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Deadline</label>
                               <input type="date" value={activeAssignment.dueDate} onChange={e => setActiveAssignment({...activeAssignment, dueDate: e.target.value})} className="border-2 p-4 w-full rounded-2xl font-black focus:border-blue-600 outline-none"/>
                           </div>
                           <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Workflow Status</label>
                               <select value={activeAssignment.status} onChange={e => setActiveAssignment({...activeAssignment, status: e.target.value})} className="border-2 p-4 w-full rounded-2xl font-black bg-white focus:border-blue-600 outline-none">
                                   {customStatuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                               </select>
                           </div>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Course Category</label>
                               <select value={activeAssignment.category} onChange={e => {
                                   const cn = e.target.value;
                                   const cls = classes.find(c => c.id === activeAssignment.classId);
                                   const cat = cls?.categories?.find(c => c.name === cn);
                                   setActiveAssignment({...activeAssignment, category: cn, estimatedTime: cat?.defaultTime || 30});
                               }} className="border-2 p-4 w-full rounded-2xl font-black bg-white focus:border-blue-600 outline-none">
                                   {classes.find(c => c.id === activeAssignment.classId)?.categories?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                               </select>
                           </div>
                           <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Est. Effort (Mins)</label>
                               <input type="number" value={activeAssignment.estimatedTime} onChange={e => setActiveAssignment({...activeAssignment, estimatedTime: e.target.value})} className="border-2 p-4 w-full rounded-2xl font-black focus:border-blue-600 outline-none"/>
                           </div>
                       </div>
                       <div className="flex justify-between pt-8 border-t mt-4 items-center">
                           <button onClick={() => handleDeleteAssignment(activeAssignment.id)} className="text-red-500 font-black flex items-center gap-3 hover:bg-red-50 px-6 py-3 rounded-2xl transition-all uppercase tracking-widest text-[10px]"><Trash2 size={24}/> Destroy Link</button>
                           <button onClick={() => handleUpdateAssignment(activeAssignment)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all">Synchronize</button>
                       </div>
                   </div>
               </Card>
           </div>
      )}

      {isAddClassModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
             <Card className="w-full max-w-md shadow-2xl p-10 rounded-[2.5rem]">
                 <h3 className="font-black text-3xl mb-8 text-slate-800 tracking-tighter">Initialize Course</h3>
                 <form onSubmit={(e) => { 
                     e.preventDefault(); 
                     const fd = new FormData(e.target);
                     const nc = { id: crypto.randomUUID(), name: fd.get('name'), code: fd.get('code'), credits: fd.get('credits'), categories: [{name: 'Homework', weight: 0, defaultTime: 30}], gradingType: 'POINTS' };
                     const updatedClasses = [...classes, nc];
                     setClasses(updatedClasses);
                     saveData({ classes: updatedClasses });
                     setIsAddClassModalOpen(false);
                 }} className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block ml-2">Full Course Title</label>
                        <input name="name" placeholder="Intro to Algorithms" className="border-2 p-4 w-full rounded-2xl font-black outline-none focus:border-blue-600 transition-all" required />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block ml-2">Code</label>
                            <input name="code" placeholder="CS101" className="border-2 p-4 w-full rounded-2xl font-black outline-none focus:border-blue-600 transition-all" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block ml-2">Credits</label>
                            <input name="credits" type="number" placeholder="4" className="border-2 p-4 w-full rounded-2xl font-black outline-none focus:border-blue-600 transition-all" required />
                        </div>
                     </div>
                     <button className="bg-blue-600 text-white w-full p-5 rounded-3xl font-black uppercase tracking-widest mt-4 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Begin Course</button>
                 </form>
             </Card>
          </div>
      )}

      {isGlobalSettingsOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
              <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl p-10 rounded-[2.5rem]">
                  <div className="flex justify-between items-center mb-10">
                      <h3 className="font-black text-3xl text-slate-800 tracking-tighter">Terminal Settings</h3>
                      <button onClick={()=>setIsGlobalSettingsOpen(false)}><X size={32}/></button>
                  </div>
                  <div className="space-y-10">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block ml-2">Primary Institution</label>
                          <input value={universityName} onChange={e=>setUniversityName(e.target.value)} className="border-2 p-4 w-full rounded-2xl font-black outline-none focus:border-blue-600 transition-all"/>
                      </div>
                      <div className="border-t pt-10">
                          <div className="flex justify-between items-center mb-6">
                              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block ml-2">Global Workflow Statuses</label>
                              <button onClick={() => setCustomStatuses([...customStatuses, { id: crypto.randomUUID(), label: 'New', color: STATUS_COLORS[0].class, countsInGrade: false }])} className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-all">+ Add Status</button>
                          </div>
                          <div className="space-y-4">
                              {customStatuses.map((s, i) => (
                                  <div key={s.id} className="bg-slate-50 p-6 rounded-3xl border flex flex-col gap-6">
                                      <div className="flex gap-4 items-center">
                                          <input value={s.label} onChange={(e) => { const news = [...customStatuses]; news[i].label = e.target.value; setCustomStatuses(news); }} className="border-2 p-3 flex-1 rounded-xl text-sm font-black"/>
                                          <button onClick={() => setCustomStatuses(customStatuses.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={24}/></button>
                                      </div>
                                      <div className="flex justify-between items-center">
                                          <div className="flex gap-3">
                                              {STATUS_COLORS.map(c => (
                                                  <button key={c.name} onClick={() => { const news = [...customStatuses]; news[i].color = c.class; setCustomStatuses(news); }} className={`w-8 h-8 rounded-full border-4 ${c.class.split(' ')[0]} ${s.color === c.class ? 'border-slate-800' : 'border-white'} shadow-sm transition-all`}/>
                                              ))}
                                          </div>
                                          <label className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group">
                                              <input type="checkbox" checked={s.countsInGrade} onChange={(e) => { const news = [...customStatuses]; news[i].countsInGrade = e.target.checked; setCustomStatuses(news); }} className="w-5 h-5 accent-blue-600 rounded-lg"/>
                                              GPA Impact
                                          </label>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <button onClick={() => { saveData({ universityName, customStatuses }); setIsGlobalSettingsOpen(false); }} className="w-full bg-slate-900 text-white p-5 rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all">Write System Changes</button>
                  </div>
              </Card>
          </div>
      )}

      {isClassSettingsOpen && activeClassId && (
           <ClassSettingsModal />
      )}

    </div>
  );
}
