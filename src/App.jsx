import { useState, useEffect } from "react";

const EXERCISES = {
  Push: ["Shoulder Press", "Incline Dumbbell Press", "Lateral Raises", "Chest Fly", "Dips", "Tricep Pushdown"],
  Pull: ["Pull Ups", "Lat Pulldown", "Seated Cable Row", "45° Bicep Curls", "Preacher Curls"],
  Legs: ["Romanian Deadlift", "Squats", "Leg Press", "Leg Extensions", "Hamstring Curls", "Adductors", "Crunches" ],
  Cardio: ["Running", "Cycling"],
};

const COLORS = {
  Push:   { bg: "#fde8e8", border: "#f5b8b8", accent: "#e87878", light: "#fff5f5" },
  Pull:   { bg: "#e8f0fd", border: "#b8cef5", accent: "#7899e8", light: "#f5f8ff" },
  Legs:   { bg: "#e8fde8", border: "#b8f0b8", accent: "#78c878", light: "#f5fff5" },
  Cardio: { bg: "#fdf5e8", border: "#f5ddb8", accent: "#e8a850", light: "#fffaf5" },
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
    <div style={{ textAlign: "center", color: "#bbb", marginTop: 60, fontSize: 15 }}>
      <p>No sessions yet.</p>
      <p style={{ fontSize: 13 }}>Log some workouts to see your stats!</p>
    </div>
  );

  const counts = { Push: 0, Pull: 0, Legs: 0, Cardio: 0 };
  for (const session of history)
    for (const tab of TABS)
      if ((session.data[tab] || []).some(e => e.exercise)) counts[tab]++;

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <h2 style={{ textAlign: "center", color: "#888", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
        Workout Breakdown · {history.length} session{history.length !== 1 ? "s" : ""}
      </h2>
      {TABS.map(tab => {
        const pct = Math.round((counts[tab] / total) * 100);
        const col = COLORS[tab];
        return (
          <div key={tab} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: col.accent, fontSize: 14 }}>{tab}</span>
              <span style={{ fontWeight: 700, color: "#aaa", fontSize: 14 }}>{pct}% <span style={{ fontWeight: 400, fontSize: 12 }}>({counts[tab]} session{counts[tab] !== 1 ? "s" : ""})</span></span>
            </div>
            <div style={{ background: "#ede9e5", borderRadius: 20, height: 18, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, background: col.accent, height: "100%", borderRadius: 20, transition: "width 0.6s ease" }} />
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
    <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: "100vh", background: "#f9f7f4", padding: "20px 12px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#555", margin: 0 }}>🏋️ Workout Tracker</h1>
          <p style={{ color: "#aaa", margin: "4px 0 4px", fontSize: 13 }}>{formatDate(new Date())}</p>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#b0c4de", letterSpacing: 2, fontVariantNumeric: "tabular-nums" }}>
            {String(Math.floor(elapsed / 3600)).padStart(2,"0")}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2,"0")}:{String(elapsed % 60).padStart(2,"0")}
          </div>
        </div>

        {/* View Toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "center" }}>
          {["log", "history", "stats"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "8px 22px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: view === v ? "#b0c4de" : "#e8e4e0", color: view === v ? "#fff" : "#888", transition: "all 0.2s"
            }}>{v === "log" ? "📝 Log" : v === "history" ? "📅 History" : "📊 Stats"}</button>
          ))}
        </div>

        {view === "log" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  flex: 1, padding: "10px 4px", borderRadius: 12,
                  border: `2px solid ${activeTab === t ? COLORS[t].accent : "transparent"}`,
                  background: activeTab === t ? COLORS[t].bg : "#ede9e5",
                  color: activeTab === t ? COLORS[t].accent : "#999",
                  cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.2s"
                }}>{t}</button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {entries[activeTab].map((entry, eIdx) => {
                const lastStats = entry.exercise ? getLastStats(history, entry.exercise) : null;
                return (
                  <div key={eIdx} style={{ background: c.light, border: `1.5px solid ${c.border}`, borderRadius: 16, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ background: c.bg, color: c.accent, borderRadius: 20, padding: "2px 10px", fontWeight: 700, fontSize: 12 }}>#{eIdx + 1}</span>
                      <select value={entry.exercise} onChange={e => updateEntry(eIdx, "exercise", e.target.value)}
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${c.border}`, background: "#fff", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        <option value="">— Select Exercise —</option>
                        {EXERCISES[activeTab].map(ex => <option key={ex} value={ex}>{ex}</option>)}
                      </select>
                      {entries[activeTab].length > 1 && (
                        <button onClick={() => removeExercise(eIdx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 18 }}>✕</button>
                      )}
                    </div>

                    {lastStats && (
                      <div style={{ background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 10, padding: "8px 12px", marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: c.accent, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                          📊 Last session · {formatDate(lastStats.date)}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                          {lastStats.rows.map((r, i) => (
                            <span key={i} style={{ background: "#fff", color: "#777", borderRadius: 8, padding: "3px 10px", fontSize: 12, border: `1px solid ${c.border}` }}>
                              Set {i + 1}: {r.weight ? `${r.weight}kg` : "—"} × {r.reps ? `${r.reps} reps` : "—"}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: c.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>🏆 Best Set</span>
                          <span style={{ background: c.accent, color: "#fff", borderRadius: 8, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                            {lastStats.best.weight ? `${lastStats.best.weight}kg` : "—"} × {lastStats.best.reps ? `${lastStats.best.reps} reps` : "—"}
                          </span>
                        </div>
                      </div>
                    )}

                    {entry.exercise && (
                      <>
                        {entry.rows.map((row, rIdx) => (
                          <div key={rIdx} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${c.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                              <span style={{ fontSize: 12, color: "#bbb", fontWeight: 600, width: 20 }}>Set {rIdx + 1}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: c.accent, width: 50 }}>{activeTab === "Cardio" ? "Distance" : "Weight"}</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                                    <span style={{ background: "#fff", border: `1.5px solid ${c.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 16, fontWeight: 700, color: "#555", minWidth: "50px", textAlign: "center" }}>{row.weight || "—"} {activeTab === "Cardio" ? "km" : "kg"}</span>
                                    <button onClick={() => updateRow(eIdx, rIdx, "weight", Math.max(0, (parseFloat(row.weight) || 0) - 1).toString())} style={{ background: c.bg, border: `1.5px solid ${c.border}`, color: c.accent, borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>−1</button>
                                    <button onClick={() => updateRow(eIdx, rIdx, "weight", ((parseFloat(row.weight) || 0) + 1).toString())} style={{ background: c.bg, border: `1.5px solid ${c.border}`, color: c.accent, borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+1</button>
                                    <button onClick={() => updateRow(eIdx, rIdx, "weight", ((parseFloat(row.weight) || 0) + 5).toString())} style={{ background: c.bg, border: `1.5px solid ${c.border}`, color: c.accent, borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+5</button>
                                  </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: c.accent, width: 50 }}>{activeTab === "Cardio" ? "Time" : "Reps"}</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                                    <span style={{ background: "#fff", border: `1.5px solid ${c.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 16, fontWeight: 700, color: "#555", minWidth: "50px", textAlign: "center" }}>{row.reps || "—"} {activeTab === "Cardio" ? "min" : ""}</span>
                                    <button onClick={() => updateRow(eIdx, rIdx, "reps", Math.max(0, (parseFloat(row.reps) || 0) - 1).toString())} style={{ background: c.bg, border: `1.5px solid ${c.border}`, color: c.accent, borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>−1</button>
                                    <button onClick={() => updateRow(eIdx, rIdx, "reps", ((parseFloat(row.reps) || 0) + 1).toString())} style={{ background: c.bg, border: `1.5px solid ${c.border}`, color: c.accent, borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+1</button>
                                    <button onClick={() => updateRow(eIdx, rIdx, "reps", ((parseFloat(row.reps) || 0) + 5).toString())} style={{ background: c.bg, border: `1.5px solid ${c.border}`, color: c.accent, borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+5</button>
                                    <button onClick={() => { updateRow(eIdx, rIdx, "weight", ""); updateRow(eIdx, rIdx, "reps", ""); }} style={{ background: "#f0f0f0", border: `1.5px solid #ddd`, color: "#999", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Reset</button>
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => removeSet(eIdx, rIdx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", fontSize: 18, flex: 0, alignSelf: "flex-start" }}>✕</button>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => addSet(eIdx)} style={{
                          marginTop: 6, width: "100%", padding: "7px", borderRadius: 10,
                          border: `1.5px dashed ${c.border}`, background: "transparent",
                          color: c.accent, fontSize: 12, fontWeight: 600, cursor: "pointer"
                        }}>+ Add Set</button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={addExercise} style={{
              marginTop: 12, width: "100%", padding: "12px", borderRadius: 14,
              border: `2px dashed ${c.border}`, background: "transparent",
              color: c.accent, fontSize: 14, fontWeight: 700, cursor: "pointer"
            }}>+ Add Exercise</button>

            <button onClick={saveSession} style={{
              marginTop: 12, width: "100%", padding: "13px", borderRadius: 14, border: "none",
              background: saved ? "#a8d8a8" : "#b0c4de", color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: "pointer", transition: "background 0.3s"
            }}>{saved ? "✅ Session Saved!" : "💾 Save Session"}</button>
          </>
        )}

        {view === "history" && (
          <div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", color: "#bbb", marginTop: 60, fontSize: 15 }}>
                <p>No sessions saved yet.</p>
                <p style={{ fontSize: 13 }}>Complete a workout and hit Save Session!</p>
              </div>
            ) : (
              history.map(session => (
                <div key={session.id} style={{ background: "#fff", border: "1.5px solid #ede9e5", borderRadius: 16, padding: 16, marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, color: "#666", fontSize: 14 }}>📅 {formatDate(session.date)}</span>
                    <button onClick={() => deleteSession(session.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", fontSize: 14 }}>🗑</button>
                  </div>
                  {TABS.map(tab => {
                    const exs = session.data[tab]?.filter(e => e.exercise) || [];
                    if (!exs.length) return null;
                    const col = COLORS[tab];
                    return (
                      <div key={tab} style={{ marginBottom: 10 }}>
                        <div style={{ display: "inline-block", background: col.bg, color: col.accent, borderRadius: 20, padding: "2px 12px", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{tab}</div>
                        {exs.map((e, i) => (
                          <div key={i} style={{ marginLeft: 8, marginBottom: 6 }}>
                            <div style={{ fontWeight: 600, color: "#666", fontSize: 13 }}>{e.exercise}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 3 }}>
                              {e.rows.map((r, ri) => (r.weight || r.reps) ? (
                                <span key={ri} style={{ background: col.bg, color: col.accent, borderRadius: 8, padding: "3px 10px", fontSize: 12 }}>
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

        {view === "stats" && <StatsView history={history} />}

      </div>
    </div>
  );
}
