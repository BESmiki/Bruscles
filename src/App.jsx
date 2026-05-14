import { useState, useEffect } from "react";

const EXERCISES = {
  Push: ["Shoulder Press", "Incline Dumbbell Press", "Lateral Raises", "Chest Fly", "Dips", "Tricep Pushdown"],
  Pull: ["Pull Ups", "Lat Pulldown", "Seated Cable Row", "45° Bicep Curls", "Preacher Curls"],
  Legs: ["Romanian Deadlift", "Squats", "Leg Press", "Leg Extensions", "Hamstring Curls", "Adductors", "Crunches"],
  Cardio: ["Running", "Cycling"],
};

// Refactored to map to Tailwind utility classes instead of raw hex values
const COLORS = {
  Push:   { bg: "bg-[#fde8e8]", border: "border-[#f5b8b8]", borderAccent: "border-[#e87878]", text: "text-[#e87878]", fill: "bg-[#e87878]", light: "bg-[#fff5f5]" },
  Pull:   { bg: "bg-[#e8f0fd]", border: "border-[#b8cef5]", borderAccent: "border-[#7899e8]", text: "text-[#7899e8]", fill: "bg-[#7899e8]", light: "bg-[#f5f8ff]" },
  Legs:   { bg: "bg-[#e8fde8]", border: "border-[#b8f0b8]", borderAccent: "border-[#78c878]", text: "text-[#78c878]", fill: "bg-[#78c878]", light: "bg-[#f5fff5]" },
  Cardio: { bg: "bg-[#fdf5e8]", border: "border-[#f5ddb8]", borderAccent: "border-[#e8a850]", text: "text-[#e8a850]", fill: "bg-[#e8a850]", light: "bg-[#fffaf5]" },
};

const TABS = ["Push", "Pull", "Legs", "Cardio"];

const emptySet = () => ({ weight: "", reps: "" });
const emptyEntry = () => ({ exercise: "", rows: [emptySet()] });

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function getLastStats(history, exercise) {
  for (const session of history) {
    for (const tab of TABS) {
      const exs = session.data[tab] || [];
      const match = exs.find(e => e.exercise === exercise);
      if (match && match.rows?.some(r => r.weight || r.reps)) {
        const rows = match.rows.filter(r => r.weight || r.reps);
        const best = rows.reduce((b, r) => {
          const bScore = (parseFloat(b.weight) || 0) * (parseFloat(b.reps) || 0);
          const rScore = (parseFloat(r.weight) || 0) * (parseFloat(r.reps) || 0);
          return rScore > bScore ? r : b;
        }, rows[0]);
        return { date: session.date, rows, best };
      }
    }
  }
  return null;
}

function StatsView({ history }) {
  if (history.length === 0) return (
    <div className="text-center text-[#bbb] mt-[60px] text-[15px]">
      <p>No sessions yet.</p>
      <p className="text-[13px]">Log some workouts to see your stats!</p>
    </div>
  );

  const counts = { Push: 0, Pull: 0, Legs: 0, Cardio: 0 };
  for (const session of history)
    for (const tab of TABS)
      if ((session.data[tab] || []).some(e => e.exercise)) counts[tab]++;

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <h2 className="text-center text-[#888] text-base font-bold mb-5">
        Workout Breakdown · {history.length} session{history.length !== 1 ? "s" : ""}
      </h2>
      {TABS.map(tab => {
        const pct = Math.round((counts[tab] / total) * 100);
        const col = COLORS[tab];
        return (
          <div key={tab} className="mb-[18px]">
            <div className="flex justify-between mb-1.5">
              <span className={`font-bold ${col.text} text-sm`}>{tab}</span>
              <span className="font-bold text-[#aaa] text-sm">{pct}% <span className="font-normal text-xs">({counts[tab]} session{counts[tab] !== 1 ? "s" : ""})</span></span>
            </div>
            <div className="bg-[#ede9e5] rounded-[20px] h-[18px] overflow-hidden">
              <div 
                className={`h-full rounded-[20px] transition-all duration-600 ease-in-out ${col.fill}`} 
                style={{ width: `${pct}%` }} 
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("Push");
  const [view, setView] = useState("log");
  const [entries, setEntries] = useState({ Push: [emptyEntry()], Pull: [emptyEntry()], Legs: [emptyEntry()], Cardio: [emptyEntry()] });
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTime = useState(Date.now())[0];

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      const h = localStorage.getItem("workout_history");
      if (h) setHistory(JSON.parse(h));
    } catch {}
  }, []);

  const c = COLORS[activeTab];

  const updateEntry = (idx, field, val) => {
    setEntries(prev => {
      const tab = [...prev[activeTab]];
      tab[idx] = { ...tab[idx], [field]: val, rows: field === "exercise" ? [emptySet()] : tab[idx].rows };
      return { ...prev, [activeTab]: tab };
    });
  };

  const updateRow = (eIdx, rIdx, field, val) => {
    setEntries(prev => {
      const tab = [...prev[activeTab]];
      const rows = [...tab[eIdx].rows];
      rows[rIdx] = { ...rows[rIdx], [field]: val };
      tab[eIdx] = { ...tab[eIdx], rows };
      return { ...prev, [activeTab]: tab };
    });
  };

  const addSet = eIdx => {
    setEntries(prev => {
      const tab = [...prev[activeTab]];
      const rows = tab[eIdx].rows;
      const prev2 = rows[rows.length - 1];
      const newSet = { weight: prev2.weight, reps: prev2.reps ? String(parseInt(prev2.reps) + 1) : "" };
      tab[eIdx] = { ...tab[eIdx], rows: [...rows, newSet] };
      return { ...prev, [activeTab]: tab };
    });
  };

  const removeSet = (eIdx, rIdx) => {
    setEntries(prev => {
      const tab = [...prev[activeTab]];
      const rows = tab[eIdx].rows.filter((_, i) => i !== rIdx);
      tab[eIdx] = { ...tab[eIdx], rows: rows.length ? rows : [emptySet()] };
      return { ...prev, [activeTab]: tab };
    });
  };

  const addExercise = () => {
    setEntries(prev => ({ ...prev, [activeTab]: [...prev[activeTab], emptyEntry()] }));
  };

  const removeExercise = idx => {
    setEntries(prev => {
      const tab = prev[activeTab].filter((_, i) => i !== idx);
      return { ...prev, [activeTab]: tab.length ? tab : [emptyEntry()] };
    });
  };

  const saveSession = () => {
    const session = {
      id: Date.now(),
      date: new Date().toISOString(),
      data: Object.fromEntries(
        Object.entries(entries).map(([k, v]) => [k, v.filter(e => e.exercise)])
      ),
    };
    const updated = [session, ...history];
    setHistory(updated);
    try { localStorage.setItem("workout_history", JSON.stringify(updated)); } catch {}
    setEntries({ Push: [emptyEntry()], Pull: [emptyEntry()], Legs: [emptyEntry()], Cardio: [emptyEntry()] });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const deleteSession = id => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    try { localStorage.setItem("workout_history", JSON.stringify(updated)); } catch {}
  };

  return (
    <div data-name="App-Container" className="font-sans min-h-screen bg-[#f9f7f4] py-5 px-3">
      <div data-name="Main-Content-Wrapper" className="max-w-[680px] mx-auto">

        {/* SECTION: Header & Stopwatch */}

        <div data-name="Header-Section" className="text-center mb-4">
          <img src="assets/kanbare-removebg.png" className="block mx-auto mb-2 w-24" alt="Logo" />
          {/* <h1 className="text-[26px] font-bold text-[#555] m-0">Bruscles Tracker</h1> */}
          <div data-name="Stopwatch-Display" className={`text-[72px] font-bold ${c.text} tracking-[2px] tabular-nums transition-colors duration-[900ms] ease-in-out`}>
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </div>
        </div>
          <p className="text-[#273226] my-1 text-[13px] text-center mb-8">{formatDate(new Date())}</p>

        {/* SECTION: View Switcher (Log / History / Stats) */}
        <div data-name="View-Toggle-Navigation" className="flex gap-2 mb-5 justify-center">
          {["log", "history", "stats"].map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-[22px] py-2 rounded-[20px] border-none cursor-pointer text-[13px] font-semibold transition-all duration-200 ${view === v ? "bg-[#b0c4de] text-white" : "bg-[#e8e4e0] text-[#888]"}`}>
              {v === "log" ? "📝 Log" : v === "history" ? "📅 History" : "📊 Stats"}
            </button>
          ))}
        </div>

        {/* SECTION: Logging View */}
        {view === "log" && (
          <div data-name="Workout-Log-View">
            
            {/* Subsection: Push/Pull/Legs/Cardio Selector */}
            <div data-name="Category-Tabs" className="flex gap-1.5 mb-4">
              {TABS.map(t => {
                const tabC = COLORS[t];
                return (
                  <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2.5 px-1 rounded-xl border-2 cursor-pointer font-bold text-[13px] transition-all duration-200 ${activeTab === t ? `${tabC.borderAccent} ${tabC.bg} ${tabC.text}` : "border-transparent bg-[#ede9e5] text-[#999]"}`}>
                    {t}
                  </button>
                );
              })}
            </div>

            {/* Subsection: List of Exercises */}
            <div data-name="Exercise-List" className="flex flex-col gap-3.5">
              {entries[activeTab].map((entry, eIdx) => {
                const lastStats = entry.exercise ? getLastStats(history, entry.exercise) : null;
                return (
                  <div data-name="Exercise-Card" key={eIdx} className={`${c.light} border-[1.5px] ${c.border} rounded-2xl p-4 transition-all duration-500 ease-in-out`}>
                    
                    {/* Exercise Header & Dropdown */}
                    <div data-name="Exercise-Selector-Row" className="flex items-center gap-2 mb-2.5">
                      <span className={`${c.bg} ${c.text} rounded-[20px] py-0.5 px-2.5 font-bold text-xs`}>#{eIdx + 1}</span>
                      <select value={entry.exercise} onChange={e => updateEntry(eIdx, "exercise", e.target.value)} className={`flex-1 py-2 px-3 rounded-lg border-[1.5px] ${c.border} bg-white text-[#555] text-[13px] font-semibold cursor-pointer outline-none`}>
                        <option value="">— Select Exercise —</option>
                        {EXERCISES[activeTab].map(ex => <option key={ex} value={ex}>{ex}</option>)}
                      </select>
                      {entries[activeTab].length > 1 && (
                        <button onClick={() => removeExercise(eIdx)} className="bg-transparent border-none cursor-pointer text-[#ccc] text-lg">✕</button>
                      )}
                    </div>

                    {/* Previous Session Reference Stats */}
                    {lastStats && (
                      <div data-name="Previous-Stats-Box" className={`${c.bg} border border-dashed ${c.border} rounded-lg py-2 px-3 mb-2.5`}>
                        <div className={`text-[11px] font-bold ${c.text} mb-1 uppercase tracking-[0.5px]`}>
                          📊 Last session · {formatDate(lastStats.date)}
                        </div>
                        <div data-name="Previous-Sets-Cloud" className="flex flex-wrap gap-1.5 mb-2">
                          {lastStats.rows.map((r, i) => (
                            <span key={i} className={`bg-white text-[#777] rounded-lg py-[3px] px-2.5 text-xs border-[1px] ${c.border}`}>
                              Set {i + 1}: {r.weight ? `${r.weight}kg` : "—"} × {r.reps ? `${r.reps} reps` : "—"}
                            </span>
                          ))}
                        </div>
                        <div data-name="Personal-Best-Badge" className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${c.text} uppercase tracking-[0.5px]`}>🏆 Best Set</span>
                          <span className={`${c.fill} text-white rounded-lg py-[3px] px-3 text-xs font-bold`}>
                            {lastStats.best.weight ? `${lastStats.best.weight}kg` : "—"} × {lastStats.best.reps ? `${lastStats.best.reps} reps` : "—"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Current Workout Input Rows */}
                    {entry.exercise && (
                      <div data-name="Sets-Input-Container">
                        {entry.rows.map((row, rIdx) => (
                          <div data-name="Single-Set-Row" key={rIdx} className={`mb-3 pb-3 border-b border-solid ${c.border}`}>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs text-[#bbb] font-semibold w-5">Set {rIdx + 1}</span>
                              <div data-name="Input-Controls-Wrapper" className="flex-1">
                                {/* Weight/Distance Row */}
                                <div data-name="Weight-Control-Group" className="flex items-center gap-2 mb-2">
                                  <span className={`text-base font-semibold ${c.text} w-[50px]`}>{activeTab === "Cardio" ? "Distance" : "Weight"}</span>
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className={`bg-white border-[1.5px] ${c.border} rounded-lg py-1.5 px-3 text-base font-bold text-[#555] min-w-[50px] text-center`}>{row.weight || "—"} {activeTab === "Cardio" ? "km" : "kg"}</span>
                                    <button onClick={() => updateRow(eIdx, rIdx, "weight", Math.max(0, (parseFloat(row.weight) || 0) - 1).toString())} className={`${c.bg} border-[1.5px] ${c.border} ${c.text} rounded-lg py-1.5 px-3 text-[13px] font-bold cursor-pointer`}>−1</button>
                                    <button onClick={() => updateRow(eIdx, rIdx, "weight", ((parseFloat(row.weight) || 0) + 1).toString())} className={`${c.bg} border-[1.5px] ${c.border} ${c.text} rounded-lg py-1.5 px-3 text-[13px] font-bold cursor-pointer`}>+1</button>
                                    <button onClick={() => updateRow(eIdx, rIdx, "weight", ((parseFloat(row.weight) || 0) + 5).toString())} className={`${c.bg} border-[1.5px] ${c.border} ${c.text} rounded-lg py-1.5 px-3 text-[13px] font-bold cursor-pointer`}>+5</button>
                                  </div>
                                </div>
                                {/* Reps/Time Row */}
                                <div data-name="Reps-Control-Group" className="flex items-center gap-2">
                                  <span className={`text-base font-semibold ${c.text} w-[50px]`}>{activeTab === "Cardio" ? "Time" : "Reps"}</span>
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className={`bg-white border-[1.5px] ${c.border} rounded-lg py-1.5 px-3 text-base font-bold text-[#555] min-w-[50px] text-center`}>{row.reps || "—"} {activeTab === "Cardio" ? "min" : ""}</span>
                                    <button onClick={() => updateRow(eIdx, rIdx, "reps", Math.max(0, (parseFloat(row.reps) || 0) - 1).toString())} className={`${c.bg} border-[1.5px] ${c.border} ${c.text} rounded-lg py-1.5 px-3 text-[13px] font-bold cursor-pointer`}>−1</button>
                                    <button onClick={() => updateRow(eIdx, rIdx, "reps", ((parseFloat(row.reps) || 0) + 1).toString())} className={`${c.bg} border-[1.5px] ${c.border} ${c.text} rounded-lg py-1.5 px-3 text-[13px] font-bold cursor-pointer`}>+1</button>
                                    <button onClick={() => updateRow(eIdx, rIdx, "reps", ((parseFloat(row.reps) || 0) + 5).toString())} className={`${c.bg} border-[1.5px] ${c.border} ${c.text} rounded-lg py-1.5 px-3 text-[13px] font-bold cursor-pointer`}>+5</button>
                                  </div>
                                </div>
                                {/* red reset button */}
                                    {/* <button onClick={() => { updateRow(eIdx, rIdx, "weight", ""); updateRow(eIdx, rIdx, "reps", ""); }} className="bg-[#FA502F] border-[1.5px] border-red-500 text-white rounded-lg py-1.5 px-3 text-xs font-bold cursor-pointer">Reset</button> */}
                              </div>
                              {/* <button onClick={() => removeSet(eIdx, rIdx)} className="bg-transparent border-none cursor-pointer text-[#ddd] text-lg flex-none self-start">✕</button> */}
                            </div>
                          </div>
                        ))}
                        <button data-name="Add-Set-Button" onClick={() => addSet(eIdx)} className={`mt-1.5 w-full p-[7px] rounded-lg border-[1.5px] border-dashed ${c.border} bg-transparent ${c.text} text-xs font-semibold cursor-pointer`}>
                          + Add Set
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Subsection: Global Log Actions */}
            <div data-name="Logging-Actions">
              <button onClick={addExercise} className={`mt-3 w-full p-3 rounded-xl border-2 border-dashed ${c.border} bg-transparent ${c.text} text-sm font-bold cursor-pointer transition-all duration-[900ms]`}>
                + Add Exercise
              </button>

              <button onClick={saveSession} className={`mt-3 w-full p-[13px] rounded-xl border-none text-white text-[15px] font-bold cursor-pointer transition-colors duration-300 ${saved ? "bg-[#a8d8a8]" : "bg-[#b0c4de]"}`}>
                {saved ? "✅ Session Saved!" : "💾 Save Session"}
              </button>
            </div>
          </div>
        )}

        {/* SECTION: History View */}
        {view === "history" && (
          <div data-name="Workout-History-View">
            {history.length === 0 ? (
              <div data-name="Empty-History-State" className="text-center text-[#bbb] mt-[60px] text-[15px]">
                <p>No sessions saved yet.</p>
                <p className="text-[13px]">Complete a workout and hit Save Session!</p>
              </div>
            ) : (
              history.map(session => (
                <div data-name="History-Session-Card" key={session.id} className="bg-white border-[1.5px] border-[#ede9e5] rounded-2xl p-4 mb-3.5">
                  <div data-name="History-Header" className="flex justify-between items-center mb-3">
                    <span className="font-bold text-[#666] text-sm">📅 {formatDate(session.date)}</span>
                    <button onClick={() => deleteSession(session.id)} className="bg-transparent border-none cursor-pointer text-[#ddd] text-sm">🗑</button>
                  </div>
                  {TABS.map(tab => {
                    const exs = session.data[tab]?.filter(e => e.exercise) || [];
                    if (!exs.length) return null;
                    const col = COLORS[tab];
                    return (
                      <div data-name="History-Category-Block" key={tab} className="mb-2.5">
                        <div className={`inline-block ${col.bg} ${col.text} rounded-[20px] py-0.5 px-3 text-xs font-bold mb-1.5`}>{tab}</div>
                        {exs.map((e, i) => (
                          <div data-name="History-Exercise-Item" key={i} className="ml-2 mb-1.5">
                            <div className="font-semibold text-[#666] text-base">{e.exercise}</div>
                            <div data-name="History-Sets-Row" className="flex flex-wrap gap-1.5 mt-[3px]">
                              {e.rows.map((r, ri) => (r.weight || r.reps) ? (
                                <span key={ri} className={`${col.bg} ${col.text} rounded-lg py-[3px] px-2.5 text-sm`}>
                                  Set {ri + 1}: {r.weight ? `${r.weight}kg` : "—"} × {r.reps ? `${r.reps} reps` : "—"}
                                </span>
                              ) : null)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {/* SECTION: Stats View */}
        {view === "stats" && (
          <div data-name="Workout-Stats-View">
            <StatsView history={history} />
          </div>
        )}

      </div>
    </div>
  );
}