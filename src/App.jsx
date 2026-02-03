import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Clock, GraduationCap, LayoutDashboard, 
  LogOut, Plus, Settings, Calendar as CalendarIcon, 
  ChevronRight, ChevronLeft, Trash2, X, Download, Wrench, 
  Printer, FileText, Lock, AlertTriangle, 
  Palette, TrendingUp, Target, Timer, Moon, Sun, Search,
  Database, CheckCircle
} from 'lucide-react';

/* GRADE TRACKER FRONTEND
  ---------------------------------
  - Auth: LocalStorage + Header (Unsafe but reliable)
  - Features: Smart Daily Plan, 7-Day Scope, Visual Cues
*/

// --- CONSTANTS & DEFAULTS ---

const DEFAULT_THEME = {
  universityName: "My University"
};

const DEFAULT_STATUSES = [
  { id: 'TODO', label: 'To Do', color: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600', countsInGrade: false },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', countsInGrade: false },
  { id: 'TURNED_IN', label: 'Turned In', color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800', countsInGrade: true },
  { id: 'GRADED', label: 'Graded', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800', countsInGrade: true },
  { id: 'LATE', label: 'Late', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800', countsInGrade: true }
];

const STATUS_COLORS = [
    { name: 'Gray', class: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600' },
    { name: 'Blue', class: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
    { name: 'Green', class: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
    { name: 'Yellow', class: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' },
    { name: 'Red', class: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
    { name: 'Purple', class: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
    { name: 'Orange', class: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
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
    'border-blue-200 text-blue-800 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800',
    'border-green-200 text-green-800 bg-green-50 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800',
    'border-purple-200 text-purple-800 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-200 dark:border-purple-800',
    'border-orange-200 text-orange-800 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-800',
    'border-pink-200 text-pink-800 bg-pink-50 dark:bg-pink-900/20 dark:text-pink-200 dark:border-pink-800',
    'border-teal-200 text-teal-800 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-200 dark:border-teal-800',
];

// --- HELPER FUNCTIONS ---

const formatTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const isActive = (status) => {
    return status !== 'TURNED_IN' && status !== 'GRADED';
};

const getWeekRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return { today, tomorrowStr, nextWeekStr };
};

// --- HOOKS ---

const useApi = () => {
    // Unsafe Auth: Load from LocalStorage directly
    const [accessKey, setAccessKey] = useState(localStorage.getItem('gt_access_key') || '');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        universityName: "My University",
        classes: [],
        assignments: [],
        events: [],
        customStatuses: DEFAULT_STATUSES
    });

    const apiCall = async (endpoint, method = 'GET', body = null) => {
        const headers = { 
            'Content-Type': 'application/json',
            'x-access-key': accessKey // Send key in header
        };
        try {
            const res = await fetch(`/api${endpoint}`, { 
                method, 
                headers, 
                body: body ? JSON.stringify(body) : null 
            });
            if (res.status === 401 || res.status === 403) {
                setIsAuthenticated(false); 
                throw new Error("Unauthorized");
            }
            if (!res.ok) throw new Error(`Server Error: ${res.status}`);
            return await res.json();
        } catch (e) { 
            console.error(e); 
            throw e; 
        }
    };

    const loadData = async () => {
        if (!accessKey) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await apiCall('/data');
            setData({
                universityName: res.universityName || "My University",
                classes: res.classes || [],
                assignments: res.assignments || [],
                events: res.events || [],
                customStatuses: res.customStatuses || DEFAULT_STATUSES
            });
            setIsAuthenticated(true);
        } catch (e) {
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const saveData = async (updates) => {
        const previousData = { ...data };
        const newData = { ...data, ...updates };
        setData(newData); // Optimistic
        
        try {
            const res = await apiCall('/data', 'POST', newData);
            if (!res.success) throw new Error("Save returned failure");
        } catch (e) {
            console.error("Save failed:", e);
            alert("Error saving data! Changes reverted. Check connection.");
            setData(previousData);
        }
    };

    const login = async (key) => {
        // Just verify key
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessKey: key })
            });
            const json = await res.json();
            if (json.success) {
                localStorage.setItem('gt_access_key', key);
                setAccessKey(key);
                // Need to reload data with new key
                setTimeout(() => window.location.reload(), 100); 
            } else {
                alert("Invalid Key");
            }
        } catch(e) {
            alert("Login Failed");
        }
    };

    const logout = async () => {
        localStorage.removeItem('gt_access_key');
        setAccessKey('');
        setIsAuthenticated(false);
    };

    useEffect(() => { loadData(); }, [accessKey]);

    return { isAuthenticated, loading, data, saveData, login, logout, apiCall };
};

const useGrading = (classes, assignments, customStatuses) => {
    return useMemo(() => {
        const gradeMap = {};
        
        classes.forEach(cls => {
            const now = new Date().toLocaleDateString('en-CA');
            let classAssignments = assignments.filter(a => {
                if (a.classId !== cls.id) return false;
                const statusConfig = customStatuses.find(s => s.id === a.status);
                return statusConfig?.countsInGrade || (a.dueDate && a.dueDate < now);
            });

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
            
            gradeMap[cls.id] = { percent: finalPercent, letter: details.letter, gpa: details.gpa, earned: rawEarnedPoints, total: rawTotalPoints };
        });

        const cumulativeGPA = () => {
             let pts = 0, creds = 0;
             classes.forEach(c => {
                 const s = gradeMap[c.id];
                 const cr = parseFloat(c.credits) || 0;
                 if(s) {
                     pts += s.gpa * cr;
                     creds += cr;
                 }
             });
             return creds === 0 ? "0.00" : (pts / creds).toFixed(2);
        };

        return { grades: gradeMap, gpa: cumulativeGPA() };
    }, [classes, assignments, customStatuses]);
};

// Hook: Daily Plan Management
const useDailyPlan = (assignments, classes) => {
    const [plan, setPlan] = useState([]);

    useEffect(() => {
        if (!assignments || assignments.length === 0) return;

        const generatePlan = () => {
            const { today, tomorrowStr, nextWeekStr } = getWeekRange();
            const stored = localStorage.getItem('gt_daily_plan_v5'); // Bumped version
            let storedData = stored ? JSON.parse(stored) : null;

            const getImpact = (a) => {
                const cls = classes.find(c => c.id === a.classId);
                if (!cls) return 0;
                let weight = 1;
                if (cls.gradingType === 'WEIGHTED' && cls.categories) {
                    const cat = cls.categories.find(c => c.name === a.category);
                    if (cat) weight = parseFloat(cat.weight) || 0;
                }
                return (parseFloat(a.total) || 0) * weight;
            };

            const activeAssignments = assignments.filter(a => {
                if (!isActive(a.status)) return false;
                return a.dueDate >= today && a.dueDate <= nextWeekStr;
            });

            // Use Stored Plan if valid for Today
            if (storedData && storedData.date === today) {
                const currentPlanIds = storedData.ids;
                const items = assignments.filter(a => currentPlanIds.includes(a.id) && isActive(a.status));
                
                items.sort((a,b) => {
                     if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
                     return getImpact(b) - getImpact(a);
                });
                setPlan(items);
                return;
            }

            // Generate New Plan
            const totalWeekLoad = activeAssignments.length;
            const dailyQuota = Math.ceil(totalWeekLoad / 7) || 0;

            const mandatoryItems = activeAssignments.filter(a => a.dueDate <= tomorrowStr);
            const backlogItems = activeAssignments.filter(a => a.dueDate > tomorrowStr);

            backlogItems.sort((a,b) => getImpact(b) - getImpact(a));

            let selectedIds = mandatoryItems.map(a => a.id);
            let slotsRemaining = dailyQuota - selectedIds.length;
            
            if (slotsRemaining > 0) {
                const extras = backlogItems.slice(0, slotsRemaining);
                selectedIds = [...selectedIds, ...extras.map(a => a.id)];
            }

            localStorage.setItem('gt_daily_plan_v5', JSON.stringify({
                date: today,
                ids: selectedIds
            }));

            const finalItems = assignments.filter(a => selectedIds.includes(a.id) && isActive(a.status));
            finalItems.sort((a,b) => {
                 if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
                 return getImpact(b) - getImpact(a);
            });
            setPlan(finalItems);
        };

        generatePlan();
    }, [assignments, classes]);

    return plan;
};

const useTheme = () => {
    const [isDark, setIsDark] = useState(() => localStorage.getItem('gt_theme') === 'dark');
    useEffect(() => {
        const root = window.document.documentElement;
        if (isDark) root.classList.add('dark');
        else root.classList.remove('dark');
        localStorage.setItem('gt_theme', isDark ? 'dark' : 'light');
    }, [isDark]);
    return { isDark, toggle: () => setIsDark(!isDark) };
};

// --- COMPONENTS ---

const Card = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 transition-colors ${className}`}>
    {children}
  </div>
);

const Badge = ({ status, customStatuses }) => {
  const config = customStatuses.find(s => s.id === status) || DEFAULT_STATUSES[0];
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${config.color}`}>{config.label}</span>;
};

// 1. Dashboard View
const DashboardView = ({ classes, assignments, customStatuses, grades, gpa, dailyPlan, onNavigate, onEditAssignment }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const { today, nextWeekStr } = getWeekRange();

    const next7DaysAssignments = assignments.filter(a => {
        return isActive(a.status) && a.dueDate >= today && a.dueDate <= nextWeekStr;
    });

    const visiblePlan = dailyPlan.filter(a => {
        if (searchTerm && !a.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });
    
    const todaysPlanTime = visiblePlan.reduce((acc, a) => acc + (parseInt(a.estimatedTime)||0), 0);

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className="bg-gradient-to-br from-blue-800 to-blue-600 dark:from-blue-900 dark:to-blue-800 text-white border-none shadow-lg">
                     <div className="text-blue-100 text-sm">Cumulative GPA</div>
                     <div className="text-4xl font-bold">{gpa}</div>
                 </Card>
                 <Card>
                     <div className="text-gray-500 dark:text-gray-400 text-sm">Workload (Next 7 Days)</div>
                     <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{next7DaysAssignments.length} <span className="text-xs text-gray-400 font-normal">tasks</span></div>
                 </Card>
                 <Card>
                     <div className="text-gray-500 dark:text-gray-400 text-sm">Today's Est. Time</div>
                     <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{formatTime(todaysPlanTime)}</div>
                 </Card>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card>
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100"><CheckCircle className="text-green-500" size={20}/> Today's Plan</h3>
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1.5 text-gray-400"/>
                            <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search..." className="pl-7 py-1 text-sm border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none"/>
                        </div>
                     </div>
                     <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
                         {visiblePlan.length === 0 && <div className="text-center text-gray-400 text-sm py-8">No tasks for today! Great job.</div>}
                         {visiblePlan.map(a => {
                                const cls = classes.find(c => c.id === a.classId);
                                const isToday = a.dueDate === today;
                                
                                const tomorrowDate = new Date();
                                tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                                const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
                                const isTomorrow = a.dueDate === tomorrowStr;

                                const rowHighlight = isToday ? 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10' : 
                                                     isTomorrow ? 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/10' : 
                                                     'border-l-4 border-l-transparent';
                                
                                return (
                                    <div key={a.id} onClick={() => onEditAssignment(a)} className={`flex justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700 rounded border-b border-gray-100 dark:border-slate-700 cursor-pointer transition-colors ${rowHighlight}`}>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{a.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-2 mt-1">
                                                <span className="font-bold text-blue-600 dark:text-blue-400">{cls?.code}</span>
                                                <span className={`${isToday ? 'text-red-600 font-bold': isTomorrow ? 'text-blue-600 font-bold' : ''}`}>
                                                    {isToday ? 'Due Today' : isTomorrow ? 'Due Tomorrow' : a.dueDate}
                                                </span>
                                                <span>• {formatTime(a.estimatedTime || 0)}</span>
                                            </div>
                                        </div>
                                        <Badge status={a.status} customStatuses={customStatuses} />
                                    </div>
                                )
                            })
                         }
                     </div>
                 </Card>
                 <Card>
                     <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">Class Performance</h3>
                     <div className="space-y-2">
                         {classes.map((c, i) => {
                             const s = grades[c.id];
                             const colorClass = CLASS_COLORS[i % CLASS_COLORS.length];
                             return (
                                 <div key={c.id} onClick={() => onNavigate(c.id)} className={`flex justify-between p-3 rounded cursor-pointer border hover:shadow-md transition-all ${colorClass}`}>
                                     <div><div className="font-bold">{c.name}</div><div className="text-xs opacity-75">{c.code}</div></div>
                                     <div className="text-right"><div className="font-bold text-lg">{s.letter}</div><div className="text-xs">{s.percent.toFixed(1)}%</div></div>
                                 </div>
                             )
                         })}
                     </div>
                 </Card>
             </div>
        </div>
    );
};

// 2. Class Detail View
const ClassDetailView = ({ classId, classes, assignments, grades, customStatuses, onEditAssignment, onAddAssignment, onOpenSettings }) => {
    const cls = classes.find(c => c.id === classId);
    const s = grades[classId];
    
    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
             <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                 <div>
                     <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{cls?.name}</h2>
                     <div className="flex gap-2 text-sm text-gray-500 dark:text-gray-400">
                         <span>{cls?.code}</span><span>•</span><span>{cls?.credits} Credits</span>
                     </div>
                 </div>
                 <div className="flex items-center gap-4">
                     <button onClick={onOpenSettings} className="p-2 bg-gray-100 dark:bg-slate-700 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300"><Wrench size={20}/></button>
                     <div className="text-right">
                         <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{s.percent.toFixed(1)}%</div>
                         <div className="text-sm text-gray-500 dark:text-gray-400">Current Grade</div>
                     </div>
                 </div>
             </div>
             <Card>
                 <div className="flex justify-between mb-4 items-center">
                     <h3 className="font-bold text-gray-800 dark:text-gray-100">Assignments</h3>
                     <button onClick={onAddAssignment} className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded hover:bg-blue-100 transition-colors">+ Add</button>
                 </div>
                 <div className="space-y-1">
                     {assignments.filter(a => a.classId === classId).map(a => (
                         <div key={a.id} onClick={() => onEditAssignment(a)} className="flex justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700 rounded border-b border-gray-50 dark:border-slate-700 cursor-pointer items-center transition-colors">
                             <div className="flex-1">
                                 <div className="font-medium text-gray-800 dark:text-gray-200">{a.name}</div>
                                 <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-2"><span>{a.category}</span><span>•</span><span>{a.dueDate}</span><span>•</span><span>{formatTime(a.estimatedTime || 0)}</span></div>
                             </div>
                             <div className="flex items-center gap-4">
                                 <Badge status={a.status} customStatuses={customStatuses} />
                                 <span className="text-sm font-mono w-16 text-right text-gray-600 dark:text-gray-300">{a.grade}/{a.total}</span>
                             </div>
                         </div>
                     ))}
                 </div>
             </Card>
        </div>
    );
};

// 3. Calendar View
const CalendarView = ({ assignments, events, onAddEvent, onDayClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const { today, tomorrowStr } = getWeekRange();
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-gray-100 flex items-center gap-2"><CalendarIcon className="text-blue-600 dark:text-blue-400"/> Calendar</h2>
                <button onClick={onAddEvent} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={16}/> Add Event</button>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-slate-700 border-b dark:border-slate-600">
                    <button onClick={()=>setCurrentDate(new Date(year, month-1, 1))} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-full dark:text-white"><ChevronLeft/></button>
                    <h3 className="text-lg font-bold dark:text-white">{monthNames[month]} {year}</h3>
                    <button onClick={()=>setCurrentDate(new Date(year, month+1, 1))} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-full dark:text-white"><ChevronRight/></button>
                </div>
                <div className="grid grid-cols-7 text-center bg-gray-100 dark:bg-slate-900 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase py-2">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 dark:bg-slate-700 gap-px border dark:border-slate-700">
                    {Array.from({length: firstDay}).map((_,i)=><div key={`e-${i}`} className="bg-white dark:bg-slate-800 min-h-[120px]"></div>)}
                    {Array.from({length: daysInMonth}).map((_,i)=>{
                        const d = i+1;
                        const cellDate = new Date(year, month, d);
                        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

                        const dayAssignments = assignments.filter(a=>a.dueDate===dateStr);
                        const dayEvents = events.filter(e=>e.date===dateStr);
                        const totalItems = dayAssignments.length + dayEvents.length;
                        
                        const isToday = dateStr === today;
                        const isTomorrow = dateStr === tomorrowStr;

                        const activeAssignments = dayAssignments.filter(a => isActive(a.status));
                        const activeCount = activeAssignments.length;

                        return (
                            <div key={d} onClick={() => totalItems > 0 && onDayClick({ date: dateStr, items: [...dayAssignments, ...dayEvents] })} className={`bg-white dark:bg-slate-800 min-h-[120px] p-2 hover:bg-blue-50 dark:hover:bg-slate-700 relative cursor-pointer group transition-colors ${isToday ? 'bg-red-50 dark:bg-red-900/10' : isTomorrow ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                <div className={`text-sm font-bold mb-1 dark:text-gray-300 ${isToday ? 'bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : isTomorrow ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : ''}`}>{d}</div>
                                
                                <div className="flex flex-col items-center justify-center h-full mt-2">
                                    {dayAssignments.length > 0 && (
                                        <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md ring-2 ring-white dark:ring-slate-600 group-hover:scale-110 transition-transform ${activeCount === 0 ? 'bg-green-500' : isToday ? 'bg-red-500' : isTomorrow ? 'bg-blue-500' : 'bg-slate-500'}`}>
                                            {dayAssignments.length}
                                        </div>
                                    )}
                                    {dayEvents.length > 0 && (
                                        <div className="mt-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

// 4. Report View
const ReportView = ({ assignments, customStatuses, classes, gpa }) => {
    const relevantAssignments = assignments.filter(a => {
        const today = new Date().toISOString().split('T')[0];
        return a.dueDate <= today;
    });
    
    const totalPossible = relevantAssignments.reduce((acc, a) => acc + (parseFloat(a.total) || 0), 0);
    const totalEarned = relevantAssignments.reduce((acc, a) => acc + (parseFloat(a.grade) || 0), 0);
    const avgScore = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
    
    const statusCounts = relevantAssignments.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {});

    const totalItems = relevantAssignments.length;
    
    let conicSectors = "";
    let lastPercent = 0;
    const sectors = customStatuses.map(status => {
        const count = statusCounts[status.id] || 0;
        const percent = totalItems > 0 ? (count / totalItems) * 100 : 0;
        const sector = { ...status, count, percent, start: lastPercent };
        if (percent > 0) {
            const colorHex = status.color.includes('blue') ? '#3b82f6' : 
                             status.color.includes('green') ? '#10b981' : 
                             status.color.includes('yellow') ? '#f59e0b' : 
                             status.color.includes('red') ? '#ef4444' : 
                             status.color.includes('purple') ? '#8b5cf6' : 
                             status.color.includes('orange') ? '#f97316' : '#94a3b8';
            conicSectors += `${colorHex} ${lastPercent}% ${lastPercent + percent}%, `;
            lastPercent += percent;
        }
        return sector;
    });

    const downloadCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Type,Class Name,Class Code,Item Name,Category,Due Date,Status,Score,Total,Percentage,Est Time (mins)\n";
        classes.forEach(c => {
             csvContent += `Class,${c.name},${c.code},N/A,N/A,N/A,N/A,0,0,0%,0\n`;
        });
        assignments.forEach(a => {
             const parentClass = classes.find(c => c.id === a.classId);
             const percentage = a.total > 0 ? ((a.grade / a.total) * 100).toFixed(2) + "%" : "0%";
             const safeName = `"${a.name.replace(/"/g, '""')}"`;
             const statusLabel = customStatuses.find(s => s.id === a.status)?.label || a.status;
             csvContent += `Assignment,${parentClass?.name || "Unknown"},${parentClass?.code || ""},${safeName},${a.category},${a.dueDate},${statusLabel},${a.grade},${a.total},${percentage},${a.estimatedTime || 0}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `grade_tracker_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-fade-in print:p-4">
            <div className="flex justify-between items-end print:hidden">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Academic Report</h2>
                    <p className="text-slate-500 dark:text-gray-400">Summary of all performance metrics</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={downloadCSV} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"><Download size={18}/> Export CSV</button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all"><Printer size={18}/> Print</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="flex flex-col items-center justify-center border-b-4 border-b-blue-600">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-full text-blue-600 dark:text-blue-300 mb-2"><GraduationCap size={24}/></div>
                    <div className="text-2xl font-black text-slate-800 dark:text-white">{gpa}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cumulative GPA</div>
                </Card>
                <Card className="flex flex-col items-center justify-center border-b-4 border-b-green-600">
                    <div className="p-3 bg-green-50 dark:bg-green-900 rounded-full text-green-600 dark:text-green-300 mb-2"><TrendingUp size={24}/></div>
                    <div className="text-2xl font-black text-slate-800 dark:text-white">{avgScore.toFixed(1)}%</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Average Score</div>
                </Card>
                <Card className="flex flex-col items-center justify-center border-b-4 border-b-purple-600">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900 rounded-full text-purple-600 dark:text-purple-300 mb-2"><Target size={24}/></div>
                    <div className="text-2xl font-black text-slate-800 dark:text-white">{totalItems}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Items Due</div>
                </Card>
                <Card className="flex flex-col items-center justify-center border-b-4 border-b-orange-600">
                    <div className="p-3 bg-orange-50 dark:bg-orange-900 rounded-full text-orange-600 dark:text-orange-300 mb-2"><Timer size={24}/></div>
                    <div className="text-2xl font-black text-slate-800 dark:text-white">
                        {formatTime(relevantAssignments.reduce((acc,a)=>acc+(parseInt(a.estimatedTime)||0),0))}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Time Spent</div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 flex flex-col items-center">
                    <h4 className="font-bold text-slate-700 dark:text-white mb-6 w-full flex items-center gap-2"><Palette size={18} className="text-slate-400"/> Status Distribution</h4>
                    <div className="relative w-48 h-48 rounded-full shadow-inner mb-6" style={{ background: totalItems > 0 ? `conic-gradient(${conicSectors.slice(0, -2)})` : '#f1f5f9' }}>
                        <div className="absolute inset-8 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center shadow-sm">
                             <span className="text-3xl font-black text-slate-800 dark:text-white">{totalItems}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Tasks</span>
                        </div>
                    </div>
                    <div className="w-full space-y-2">
                        {sectors.filter(s => s.count > 0).map(s => (
                            <div key={s.id} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${s.color.split(' ')[0]}`}></div>
                                    <span className="font-medium text-slate-600 dark:text-slate-300">{s.label}</span>
                                </div>
                                <span className="font-bold text-slate-800 dark:text-white">{s.count} ({s.percent.toFixed(0)}%)</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="lg:col-span-2">
                     <h4 className="font-bold text-slate-700 dark:text-white mb-6 flex items-center gap-2"><Clock size={18} className="text-slate-400"/> Chronological History</h4>
                     <div className="overflow-x-auto no-scrollbar">
                         <table className="w-full text-left">
                             <thead>
                                 <tr className="border-b border-slate-100 dark:border-slate-700">
                                     <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                     <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Class</th>
                                     <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Name</th>
                                     <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                     <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Grade</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                 {relevantAssignments
                                   .sort((a,b) => b.dueDate.localeCompare(a.dueDate))
                                   .map(a => {
                                     const cls = classes.find(c => c.id === a.classId);
                                     const scorePercent = a.total > 0 ? (a.grade / a.total) * 100 : 0;
                                     let gradeColor = "text-slate-400";
                                     if (a.status === 'GRADED') {
                                         gradeColor = scorePercent >= 90 ? "text-green-600 dark:text-green-400" : scorePercent >= 80 ? "text-blue-600 dark:text-blue-400" : scorePercent >= 70 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400";
                                     }
                                     return (
                                         <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                                             <td className="py-4 text-xs text-slate-500 font-mono">{a.dueDate}</td>
                                             <td className="py-4 text-xs font-bold text-slate-700 dark:text-slate-300">{cls?.code || 'N/A'}</td>
                                             <td className="py-4 text-sm font-medium text-slate-800 dark:text-slate-200">{a.name}</td>
                                             <td className="py-4"><Badge status={a.status} customStatuses={customStatuses}/></td>
                                             <td className={`py-4 text-right text-sm font-black ${gradeColor}`}>{a.status === 'GRADED' ? `${scorePercent.toFixed(0)}%` : '--'}</td>
                                         </tr>
                                     )
                                 })}
                             </tbody>
                         </table>
                     </div>
                </Card>
            </div>
        </div>
    );
};

// 5. Main App Container
export default function GradeTracker() {
  const { isAuthenticated, loading, data, saveData, login, logout, apiCall } = useApi();
  const { isDark, toggle: toggleTheme } = useTheme();
  
  const { grades, gpa } = useGrading(data.classes, data.assignments, data.customStatuses);
  
  const dailyPlan = useDailyPlan(data.assignments, data.classes);

  const [view, setView] = useState('DASHBOARD');
  const [activeClassId, setActiveClassId] = useState(null);
  const [authKeyInput, setAuthKeyInput] = useState("");
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [selectedDayItems, setSelectedDayItems] = useState(null); 
  
  const [modals, setModals] = useState({
      edit: false,
      addClass: false,
      globalSettings: false,
      classSettings: false,
      addEvent: false
  });

  const toggleModal = (name, val) => setModals(prev => ({ ...prev, [name]: val }));

  // --- HANDLERS ---
  const handleAddClass = (formData) => {
       const newClass = { 
           id: crypto.randomUUID(), 
           name: formData.get('name'), 
           code: formData.get('code'), 
           credits: formData.get('credits'), 
           categories: [{name: 'Homework', weight: 0, defaultTime: 30}], 
           gradingType: 'POINTS' 
       };
       saveData({ classes: [...data.classes, newClass] });
       toggleModal('addClass', false);
  };

  const handleAddEvent = (formData) => {
      const newEvent = { 
          id: crypto.randomUUID(), 
          title: formData.get('title'), 
          date: formData.get('date'), 
          type: formData.get('type'), 
          description: formData.get('description') 
      };
      saveData({ events: [...data.events, newEvent] });
      toggleModal('addEvent', false);
  };

  const handleDeleteClass = async (id) => {
      if(!confirm("Delete class and all assignments?")) return;
      const newClasses = data.classes.filter(c => c.id !== id);
      const newAssignments = data.assignments.filter(a => a.classId !== id);
      saveData({ classes: newClasses, assignments: newAssignments });
      toggleModal('classSettings', false);
      setView('DASHBOARD');
  };

  const handleBackup = async () => {
     try {
         window.location.href = '/api/backup';
     } catch(e) { alert("Backup failed"); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-600 dark:bg-slate-900 dark:text-blue-400">Loading...</div>;

  if (!isAuthenticated) return (
    <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 transition-colors" style={{background: `linear-gradient(135deg, ${isDark?'#0f172a':'#1e3a8a'} 0%, ${isDark?'#1e293b':'#3b82f6'} 100%)`}}>
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md animate-fade-in">
         <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mx-auto flex items-center justify-center mb-4"><Lock className="text-blue-800 dark:text-blue-200"/></div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Secure Login</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Local Server Access</p>
         </div>
         <form onSubmit={(e) => { e.preventDefault(); login(authKeyInput); }} className="space-y-4">
             <div>
                 <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Access Key</label>
                 <input type="password" value={authKeyInput} onChange={e => setAuthKeyInput(e.target.value)} className="w-full p-2 border rounded font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Paste key from logs" />
             </div>
             <button className="w-full bg-blue-800 hover:bg-blue-900 text-white p-2 rounded font-bold transition-colors">Unlock</button>
         </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-200 font-sans transition-colors">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r dark:border-slate-700 flex flex-col print:hidden transition-colors">
        <div className="p-6 border-b dark:border-slate-700 flex items-center gap-3">
           <div className="w-8 h-8 bg-blue-900 text-white rounded flex items-center justify-center font-bold">{data.universityName[0]}</div>
           <span className="font-bold truncate text-gray-800 dark:text-white">{data.universityName}</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
            <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 p-2 rounded text-sm transition-colors ${view==='DASHBOARD'?'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300':'hover:bg-gray-50 dark:hover:bg-slate-700'}`}><LayoutDashboard size={18}/> Dashboard</button>
            <button onClick={() => setView('CALENDAR')} className={`w-full flex items-center gap-3 p-2 rounded text-sm transition-colors ${view==='CALENDAR'?'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300':'hover:bg-gray-50 dark:hover:bg-slate-700'}`}><CalendarIcon size={18}/> Calendar</button>
            <button onClick={() => setView('REPORT')} className={`w-full flex items-center gap-3 p-2 rounded text-sm transition-colors ${view==='REPORT'?'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300':'hover:bg-gray-50 dark:hover:bg-slate-700'}`}><FileText size={18}/> Reports</button>
            <div className="pt-4 text-xs font-bold text-gray-400 uppercase px-2">Classes</div>
            {data.classes.map((c) => {
                const s = grades[c.id];
                return (
                    <button key={c.id} onClick={() => { setView('CLASS'); setActiveClassId(c.id); }} className={`w-full flex justify-between p-2 rounded text-sm transition-colors ${view==='CLASS'&&activeClassId===c.id ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300':'hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                        <span className="flex items-center gap-2 truncate"><BookOpen size={16}/> {c.code}</span>
                        <span className="bg-gray-100 dark:bg-slate-700 px-1 rounded text-xs text-gray-600 dark:text-gray-300">{s.letter}</span>
                    </button>
                )
            })}
            <button onClick={() => toggleModal('addClass', true)} className="w-full flex gap-3 p-2 mt-2 border border-dashed border-gray-300 dark:border-gray-600 rounded text-sm text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500"><Plus size={18}/> Add Class</button>
        </nav>
        <div className="p-4 border-t dark:border-slate-700 space-y-2">
            <button onClick={toggleTheme} className="w-full flex gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded text-sm">
                {isDark ? <Sun size={18} className="text-yellow-400"/> : <Moon size={18} className="text-slate-400"/>} 
                {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button onClick={() => toggleModal('globalSettings', true)} className="w-full flex gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded text-sm"><Settings size={18}/> Settings</button>
            <button onClick={logout} className="w-full flex gap-3 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm"><LogOut size={18}/> Sign Out</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible no-scrollbar">
         {view === 'DASHBOARD' && (
             <DashboardView 
                classes={data.classes} 
                assignments={data.assignments} 
                customStatuses={data.customStatuses}
                grades={grades}
                gpa={gpa}
                dailyPlan={dailyPlan}
                onNavigate={(id) => { setView('CLASS'); setActiveClassId(id); }}
                onEditAssignment={(a) => { setActiveAssignment(a); toggleModal('edit', true); }}
             />
         )}

         {view === 'CALENDAR' && (
             <CalendarView
                assignments={data.assignments}
                events={data.events}
                onAddEvent={() => toggleModal('addEvent', true)}
                onDayClick={(dayData) => setSelectedDayItems(dayData)}
             />
         )}

         {view === 'REPORT' && (
             <ReportView
                assignments={data.assignments}
                customStatuses={data.customStatuses}
                classes={data.classes}
                gpa={gpa}
             />
         )}
         
         {view === 'CLASS' && activeClassId && (
            <ClassDetailView 
                classId={activeClassId}
                classes={data.classes}
                assignments={data.assignments}
                grades={grades}
                customStatuses={data.customStatuses}
                onEditAssignment={(a) => { setActiveAssignment(a); toggleModal('edit', true); }}
                onAddAssignment={() => {
                     const cls = data.classes.find(c => c.id === activeClassId);
                     const defaultCategory = cls?.categories?.[0];
                     const newAsg = { 
                         id: crypto.randomUUID(), 
                         classId: activeClassId, 
                         name: "New Assignment", 
                         status: "TODO", 
                         grade: 0, 
                         total: 100, 
                         dueDate: new Date().toISOString().split('T')[0], 
                         category: defaultCategory?.name || "Homework",
                         estimatedTime: defaultCategory?.defaultTime || 30
                     };
                     saveData({ assignments: [...data.assignments, newAsg] });
                     setActiveAssignment(newAsg);
                     toggleModal('edit', true);
                }}
                onOpenSettings={() => toggleModal('classSettings', true)}
            />
         )}
      </main>

      {/* --- MODALS --- */}
      {/* 1. Global Settings */}
      {modals.globalSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl border dark:border-slate-700">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-xl text-gray-800 dark:text-white">Global Settings</h3>
                      <button onClick={()=>toggleModal('globalSettings', false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white"><X size={24}/></button>
                  </div>
                  <div className="space-y-6">
                      <div>
                          <label className="text-sm font-bold block mb-2 text-gray-700 dark:text-gray-300">University Name</label>
                          <input value={data.universityName} onChange={e=>saveData({universityName: e.target.value})} className="border dark:border-slate-600 p-2 w-full rounded dark:bg-slate-700 dark:text-white"/>
                      </div>
                      <div className="border-t dark:border-slate-700 pt-4">
                          <h4 className="font-bold mb-4 text-gray-800 dark:text-white">Data Management</h4>
                          <button onClick={handleBackup} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors w-full justify-center">
                              <Database size={18}/> Download Full Backup
                          </button>
                      </div>
                      <div className="border-t dark:border-slate-700 pt-4">
                          <label className="text-sm block mb-2 font-bold text-gray-700 dark:text-gray-300">Change Password</label>
                          <input type="password" id="newPass" placeholder="New Access Key" className="border dark:border-slate-600 p-2 w-full rounded mb-2 dark:bg-slate-700 dark:text-white"/>
                          <button onClick={async ()=>{ 
                              const pass = document.getElementById('newPass').value; 
                              if(!pass) return;
                              try {
                                  await apiCall('/change-password', 'POST', { newPassword: pass });
                                  alert("Success");
                              } catch(e) { alert("Failed"); }
                          }} className="bg-gray-800 dark:bg-slate-900 text-white px-3 py-1 rounded text-xs hover:bg-gray-900">Update Key</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 2. Add Class Modal */}
      {modals.addClass && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-xl border dark:border-slate-700">
                 <h3 className="font-bold mb-4 text-gray-800 dark:text-white">Add Class</h3>
                 <form onSubmit={(e) => { e.preventDefault(); handleAddClass(new FormData(e.target)); }}>
                     <input name="name" placeholder="Class Name" className="border dark:border-slate-600 p-2 w-full rounded mb-2 dark:bg-slate-700 dark:text-white" required />
                     <input name="code" placeholder="Code (CS101)" className="border dark:border-slate-600 p-2 w-full rounded mb-2 dark:bg-slate-700 dark:text-white" required />
                     <input name="credits" placeholder="Credits" className="border dark:border-slate-600 p-2 w-full rounded mb-2 dark:bg-slate-700 dark:text-white" required type="number" step="0.5"/>
                     <div className="flex gap-2 mt-4">
                         <button type="button" onClick={()=>toggleModal('addClass', false)} className="flex-1 p-2 rounded text-gray-600 dark:text-gray-400">Cancel</button>
                         <button className="flex-1 bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700">Add</button>
                     </div>
                 </form>
             </div>
          </div>
      )}

      {/* 3. Add Event Modal */}
      {modals.addEvent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-xl border dark:border-slate-700">
                 <h3 className="font-bold mb-4 text-gray-800 dark:text-white">Add Calendar Event</h3>
                 <form onSubmit={(e) => { e.preventDefault(); handleAddEvent(new FormData(e.target)); }}>
                     <input name="title" placeholder="Event Title" className="border dark:border-slate-600 p-2 w-full rounded mb-2 dark:bg-slate-700 dark:text-white" required />
                     <input name="date" type="date" className="border dark:border-slate-600 p-2 w-full rounded mb-2 dark:bg-slate-700 dark:text-white" required />
                     <select name="type" className="border dark:border-slate-600 p-2 w-full rounded mb-2 dark:bg-slate-700 dark:text-white">
                        <option value="exam">Exam</option>
                        <option value="study">Study Session</option>
                        <option value="other">Other</option>
                     </select>
                     <textarea name="description" placeholder="Description" className="border dark:border-slate-600 p-2 w-full rounded mb-2 dark:bg-slate-700 dark:text-white h-24"/>
                     <div className="flex gap-2 mt-4">
                         <button type="button" onClick={()=>toggleModal('addEvent', false)} className="flex-1 p-2 rounded text-gray-600 dark:text-gray-400">Cancel</button>
                         <button className="flex-1 bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700">Save Event</button>
                     </div>
                 </form>
             </div>
          </div>
      )}

      {/* 4. Edit Assignment Modal */}
      {modals.edit && activeAssignment && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
               <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-lg shadow-xl border dark:border-slate-700">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="font-bold text-lg text-gray-800 dark:text-white">Edit Item</h3>
                       <button onClick={()=>toggleModal('edit', false)} className="text-gray-500 dark:text-gray-400"><X size={20}/></button>
                   </div>
                   <div className="space-y-4">
                       <div>
                           <label className="text-xs text-gray-500 dark:text-gray-400">Name</label>
                           <input value={activeAssignment.name} onChange={e => setActiveAssignment({...activeAssignment, name: e.target.value})} className="border dark:border-slate-600 p-2 w-full rounded dark:bg-slate-700 dark:text-white" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div><label className="text-xs text-gray-500 dark:text-gray-400">Score</label><input type="number" value={activeAssignment.grade} onChange={e => setActiveAssignment({...activeAssignment, grade: e.target.value})} className="border dark:border-slate-600 p-2 w-full rounded dark:bg-slate-700 dark:text-white"/></div>
                           <div><label className="text-xs text-gray-500 dark:text-gray-400">Total</label><input type="number" value={activeAssignment.total} onChange={e => setActiveAssignment({...activeAssignment, total: e.target.value})} className="border dark:border-slate-600 p-2 w-full rounded dark:bg-slate-700 dark:text-white"/></div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div><label className="text-xs text-gray-500 dark:text-gray-400">Due Date</label><input type="date" value={activeAssignment.dueDate} onChange={e => setActiveAssignment({...activeAssignment, dueDate: e.target.value})} className="border dark:border-slate-600 p-2 w-full rounded dark:bg-slate-700 dark:text-white"/></div>
                           <div>
                               <label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
                               <select value={activeAssignment.status} onChange={e => setActiveAssignment({...activeAssignment, status: e.target.value})} className="border dark:border-slate-600 p-2 w-full rounded dark:bg-slate-700 dark:text-white">
                                   {data.customStatuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                               </select>
                           </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="text-xs text-gray-500 dark:text-gray-400">Category</label>
                               <select value={activeAssignment.category} onChange={e => {
                                   const catName = e.target.value;
                                   const cls = data.classes.find(c => c.id === activeAssignment.classId);
                                   const cat = cls?.categories?.find(c => c.name === catName);
                                   setActiveAssignment({...activeAssignment, category: catName, estimatedTime: cat?.defaultTime || 30});
                               }} className="border dark:border-slate-600 p-2 w-full rounded dark:bg-slate-700 dark:text-white">
                                   {data.classes.find(c => c.id === activeAssignment.classId)?.categories?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                               </select>
                           </div>
                           <div>
                               <label className="text-xs text-gray-500 dark:text-gray-400">Est Time (mins)</label>
                               <input type="number" min="0" value={activeAssignment.estimatedTime === 0 ? 0 : (activeAssignment.estimatedTime || '')} onChange={e => setActiveAssignment({...activeAssignment, estimatedTime: e.target.value === '' ? '' : parseInt(e.target.value)})} className="border dark:border-slate-600 p-2 w-full rounded dark:bg-slate-700 dark:text-white"/>
                           </div>
                       </div>
                       <div className="flex justify-between pt-4 border-t dark:border-slate-700 mt-4">
                           <button onClick={() => {
                               const newAsg = data.assignments.filter(a => a.id !== activeAssignment.id);
                               saveData({ assignments: newAsg });
                               toggleModal('edit', false);
                           }} className="text-red-500 text-sm flex items-center gap-1 hover:text-red-600"><Trash2 size={16}/> Delete</button>
                           <button onClick={() => {
                               // Sanitize before saving: ensure estimatedTime is a number
                               const sanitized = {...activeAssignment, estimatedTime: activeAssignment.estimatedTime === '' ? 0 : (parseInt(activeAssignment.estimatedTime) || 0)};
                               const newAsg = data.assignments.map(a => a.id === activeAssignment.id ? sanitized : a);
                               saveData({ assignments: newAsg });
                               toggleModal('edit', false);
                           }} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition-colors">Save Changes</button>
                       </div>
                   </div>
               </div>
           </div>
      )}

      {/* 5. Calendar Item Modal */}
      {selectedDayItems && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl shadow-2xl p-6 border dark:border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg dark:text-white">Due on {selectedDayItems.date}</h3>
                      <button onClick={()=>setSelectedDayItems(null)} className="dark:text-gray-400"><X/></button>
                  </div>
                  
                  {/* Total Time Calculation for Calendar Popup */}
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex justify-between items-center">
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Total Estimated Time:</span>
                      <span className="text-lg font-black text-blue-800 dark:text-blue-200">
                          {formatTime(selectedDayItems.items.reduce((acc, i) => acc + (parseInt(i.estimatedTime)||0), 0))}
                      </span>
                  </div>

                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                      {selectedDayItems.items.map((item, idx) => (
                          <div key={idx} onClick={() => { 
                              if (item.grade !== undefined) { 
                                  setActiveAssignment(item); 
                                  toggleModal('edit', true); 
                                  setSelectedDayItems(null);
                              } 
                          }} className={`p-3 rounded-lg border-l-4 shadow-sm hover:translate-x-1 transition-transform cursor-pointer ${item.grade !== undefined ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'}`}>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{item.name || item.title}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between mt-1">
                                  <span>{item.category || item.type}</span>
                                  {item.estimatedTime && <span><Timer size={10} className="inline mr-1"/>{formatTime(item.estimatedTime)}</span>}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* 6. Class Settings Modal */}
      {modals.classSettings && activeClassId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-lg border dark:border-slate-700">
                 <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">Class Settings</h3>
                 <div className="space-y-4">
                     <p className="text-sm text-gray-500 dark:text-gray-400">Detailed settings (Weights, Rules, Scales) are managed here.</p>
                     <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-100 dark:border-red-900">
                        <button onClick={() => handleDeleteClass(activeClassId)} className="text-red-600 dark:text-red-400 font-bold text-sm w-full text-left">Delete Class</button>
                     </div>
                     <div className="flex justify-end gap-2">
                         <button onClick={()=>toggleModal('classSettings', false)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400">Close</button>
                     </div>
                 </div>
             </div>
        </div>
      )}

    </div>
  );
}
