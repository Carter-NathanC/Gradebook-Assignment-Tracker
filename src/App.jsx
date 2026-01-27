import React, { useState, useEffect } from 'react';
import { 
  BookOpen, CheckCircle, Clock, GraduationCap, LayoutDashboard, 
  LogOut, Plus, Settings, Calendar as CalendarIcon, 
  ChevronRight, Trash2, X, Download, Wrench, 
  Printer, FileText, Lock, Shield, Key, Save
} from 'lucide-react';

/* GRADE TRACKER FRONTEND (Local Version) */

// Default Config
const DEFAULT_THEME = {
  colors: { primary: "#1e3a8a", secondary: "#3b82f6" },
  universityName: "My University"
};

// --- Components ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    'TODO': 'bg-gray-100 text-gray-600',
    'IN_PROGRESS': 'bg-blue-100 text-blue-700',
    'TURNED_IN': 'bg-yellow-100 text-yellow-800',
    'GRADED': 'bg-green-100 text-green-700'
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status.replace('_', ' ')}</span>;
};

// --- Main Component ---
export default function GradeTracker() {
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // --- API Helpers ---
  const apiCall = async (endpoint, method = 'GET', body = null) => {
    const headers = { 
        'Content-Type': 'application/json',
        'x-access-key': accessKey
    };
    try {
        const res = await fetch(`/api${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });
        if (res.status === 401 || res.status === 403) {
            setIsAuthenticated(false);
            setLoading(false);
            throw new Error("Invalid Key");
        }
        return await res.json();
    } catch (e) {
        console.error(e);
        throw e;
    }
  };

  const saveData = async (overrideData) => {
      // Construct the full DB object
      const dbPayload = {
          universityName: overrideData?.universityName ?? universityName,
          years: overrideData?.years ?? years,
          classes: overrideData?.classes ?? classes,
          assignments: overrideData?.assignments ?? assignments,
          events: overrideData?.events ?? events
      };
      await apiCall('/data', 'POST', dbPayload);
  };

  // --- Init ---
  useEffect(() => {
    if (accessKey) {
        verifyAndLoad();
    } else {
        setLoading(false);
    }
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
              localStorage.setItem('gt_access_key', accessKey); // Persist key in browser
          }
      } catch (e) {
          setAuthError("Session expired or invalid key.");
      } finally {
          setLoading(false);
      }
  };

  const handleLogin = (e) => {
      e.preventDefault();
      verifyAndLoad();
  };

  const handleLogout = () => {
      localStorage.removeItem('gt_access_key');
      setAccessKey('');
      setIsAuthenticated(false);
      setClasses([]);
      setAssignments([]);
  };

  // --- Logic ---
  const calculateClassGrade = (classId) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return { percent: 0, letter: 'N/A', gpa: 0.0 };
    
    // Filter active items
    const items = assignments.filter(a => a.classId === classId && (a.status === 'GRADED' || a.status === 'TURNED_IN'));
    const total = items.reduce((acc, curr) => acc + (parseFloat(curr.total)||0), 0);
    const earned = items.reduce((acc, curr) => acc + (parseFloat(curr.grade)||0), 0);
    
    const percent = total === 0 ? 100 : (earned / total) * 100;
    
    // Simple Scale Logic
    let letter = 'F', gpa = 0.0;
    if (percent >= 93) { letter='A'; gpa=4.0; }
    else if (percent >= 90) { letter='A-'; gpa=3.7; }
    else if (percent >= 87) { letter='B+'; gpa=3.3; }
    else if (percent >= 83) { letter='B'; gpa=3.0; }
    else if (percent >= 80) { letter='B-'; gpa=2.7; }
    else if (percent >= 70) { letter='C'; gpa=2.0; }
    else if (percent >= 60) { letter='D'; gpa=1.0; }
    
    return { percent, letter, gpa };
  };

  const getGPA = () => {
      let pts = 0, creds = 0;
      classes.forEach(c => {
          const s = calculateClassGrade(c.id);
          const cr = parseFloat(c.credits) || 0;
          pts += s.gpa * cr;
          creds += cr;
      });
      return creds === 0 ? "0.00" : (pts / creds).toFixed(2);
  };

  // --- CRUD Operations ---
  const addClass = async (formData) => {
      const newClass = {
          id: crypto.randomUUID(),
          name: formData.get('name'),
          code: formData.get('code'),
          credits: formData.get('credits'),
          categories: [{name: 'Homework', weight: 0}],
          gradingType: 'POINTS'
      };
      const updatedClasses = [...classes, newClass];
      setClasses(updatedClasses);
      await saveData({ classes: updatedClasses });
      setIsAddClassModalOpen(false);
  };

  const addAssignment = async () => {
      const newAsg = {
          id: crypto.randomUUID(),
          classId: activeClassId,
          name: "New Assignment",
          status: "TODO",
          grade: 0,
          total: 100,
          dueDate: new Date().toISOString().split('T')[0]
      };
      const updated = [...assignments, newAsg];
      setAssignments(updated);
      await saveData({ assignments: updated });
  };

  const updateAssignment = async (updatedAsg) => {
      const updated = assignments.map(a => a.id === updatedAsg.id ? updatedAsg : a);
      setAssignments(updated);
      setIsEditModalOpen(false);
      await saveData({ assignments: updated });
  };

  const deleteAssignment = async (id) => {
      const updated = assignments.filter(a => a.id !== id);
      setAssignments(updated);
      setIsEditModalOpen(false);
      await saveData({ assignments: updated });
  };

  const updateSettings = async (newName, newPass) => {
      if(newName !== universityName) {
          setUniversityName(newName);
          await saveData({ universityName: newName });
      }
      if(newPass) {
          try {
              await apiCall('/change-password', 'POST', { newPassword: newPass });
              alert("Password changed. You will be logged out.");
              handleLogout();
          } catch(e) {
              alert("Failed to change password.");
          }
      }
      setIsSettingsModalOpen(false);
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
             <div>
                <label className="block text-sm font-medium mb-1">Access Key</label>
                <input type="password" value={accessKey} onChange={e => setAccessKey(e.target.value)} className="w-full p-2 border rounded font-mono" placeholder="Paste key from logs" />
             </div>
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
            <button onClick={() => setView('DASHBOARD')} className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded text-sm"><LayoutDashboard size={18}/> Dashboard</button>
            <div className="pt-4 text-xs font-bold text-gray-400 uppercase px-2">Classes</div>
            {classes.map(c => (
                <button key={c.id} onClick={() => { setView('CLASS'); setActiveClassId(c.id); }} className="w-full flex justify-between p-2 hover:bg-gray-50 rounded text-sm">
                    <span className="flex items-center gap-2"><BookOpen size={16}/> {c.code}</span>
                    <span className="bg-gray-100 px-1 rounded text-xs">{calculateClassGrade(c.id).letter}</span>
                </button>
            ))}
            <button onClick={() => setIsAddClassModalOpen(true)} className="w-full flex gap-3 p-2 mt-2 border border-dashed rounded text-sm text-gray-500"><Plus size={18}/> Add Class</button>
        </nav>
        <div className="p-4 border-t space-y-2">
            <button onClick={() => setIsSettingsModalOpen(true)} className="w-full flex gap-3 p-2 hover:bg-gray-50 rounded text-sm"><Settings size={18}/> Settings</button>
            <button onClick={handleLogout} className="w-full flex gap-3 p-2 hover:bg-red-50 text-red-600 rounded text-sm"><LogOut size={18}/> Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
         {view === 'DASHBOARD' && (
             <div className="max-w-5xl mx-auto space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <Card className="bg-gradient-to-br from-blue-800 to-blue-600 text-white border-none">
                         <div className="text-blue-100 text-sm">Cumulative GPA</div>
                         <div className="text-4xl font-bold">{getGPA()}</div>
                     </Card>
                     <Card><div className="text-gray-500 text-sm">Assignments Due</div><div className="text-3xl font-bold">{assignments.filter(a=>a.status==='TODO').length}</div></Card>
                     <Card><div className="text-gray-500 text-sm">Completed</div><div className="text-3xl font-bold">{assignments.filter(a=>a.status==='GRADED').length}</div></Card>
                 </div>
             </div>
         )}
         
         {view === 'CLASS' && activeClassId && (
             <div className="max-w-5xl mx-auto space-y-6">
                 <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
                     <h2 className="text-2xl font-bold">{classes.find(c=>c.id===activeClassId)?.name}</h2>
                     <div className="text-3xl font-bold text-blue-700">{calculateClassGrade(activeClassId).percent.toFixed(1)}%</div>
                 </div>
                 <Card>
                     <div className="flex justify-between mb-4">
                         <h3 className="font-bold">Assignments</h3>
                         <button onClick={addAssignment} className="text-sm font-bold text-blue-600">+ Add</button>
                     </div>
                     <div className="space-y-2">
                         {assignments.filter(a => a.classId === activeClassId).map(a => (
                             <div key={a.id} onClick={() => { setActiveAssignment(a); setIsEditModalOpen(true); }} className="flex justify-between p-3 hover:bg-gray-50 rounded border-b border-gray-50 cursor-pointer">
                                 <span>{a.name}</span>
                                 <div className="flex items-center gap-4">
                                     <Badge status={a.status} />
                                     <span className="text-sm font-mono">{a.grade}/{a.total}</span>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </Card>
             </div>
         )}
      </main>

      {/* Modals */}
      {isSettingsModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-xl w-full max-w-md">
                  <h3 className="font-bold text-lg mb-4">Settings</h3>
                  <div className="space-y-4">
                      <div><label className="text-sm block">University Name</label><input id="uniName" defaultValue={universityName} className="border p-2 w-full rounded"/></div>
                      <div><label className="text-sm block">New Access Key (Optional)</label><input id="newPass" type="password" className="border p-2 w-full rounded"/></div>
                      <div className="flex justify-end gap-2 mt-4">
                          <button onClick={()=>setIsSettingsModalOpen(false)} className="px-4 py-2">Cancel</button>
                          <button onClick={() => updateSettings(document.getElementById('uniName').value, document.getElementById('newPass').value)} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {isAddClassModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
             <div className="bg-white p-6 rounded-xl w-full max-w-md">
                 <h3 className="font-bold mb-4">Add Class</h3>
                 <form onSubmit={(e) => { e.preventDefault(); addClass(new FormData(e.target)); }}>
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
               <div className="bg-white p-6 rounded-xl w-full max-w-md">
                   <h3 className="font-bold mb-4">Edit Assignment</h3>
                   <div className="space-y-3">
                       <input value={activeAssignment.name} onChange={e => setActiveAssignment({...activeAssignment, name: e.target.value})} className="border p-2 w-full rounded" />
                       <div className="grid grid-cols-2 gap-2">
                           <input type="number" value={activeAssignment.grade} onChange={e => setActiveAssignment({...activeAssignment, grade: e.target.value})} className="border p-2 rounded" placeholder="Grade"/>
                           <input type="number" value={activeAssignment.total} onChange={e => setActiveAssignment({...activeAssignment, total: e.target.value})} className="border p-2 rounded" placeholder="Total"/>
                       </div>
                       <select value={activeAssignment.status} onChange={e => setActiveAssignment({...activeAssignment, status: e.target.value})} className="border p-2 w-full rounded">
                           <option value="TODO">To Do</option><option value="GRADED">Graded</option><option value="TURNED_IN">Turned In</option>
                       </select>
                       <div className="flex justify-between mt-4">
                           <button onClick={() => deleteAssignment(activeAssignment.id)} className="text-red-500 text-sm">Delete</button>
                           <div className="flex gap-2">
                               <button onClick={() => setIsEditModalOpen(false)} className="px-3">Cancel</button>
                               <button onClick={() => updateAssignment(activeAssignment)} className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
                           </div>
                       </div>
                   </div>
               </div>
           </div>
      )}

    </div>
  );
}
