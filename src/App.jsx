import { useState, useEffect, useRef } from "react";

const EXERCISES = {
  Push: [
    "Shoulder Press",
    "30° Incline Dumbbell Press",
    "Lateral Raises",
    "Chest Fly",
    "Tricep Pushdown",
  ],
  Pull: [
    "Pull Ups",
    "Lat Pulldown",
    "single Arm Cable Row",
    "45° Bicep Curls",
    "Preacher Curls",
  ],
  Legs: [
    "RDL",
    "Back Squats",
    "Leg Press",
    "Leg Extensions",
    "Hamstring Curls",
    "Adductors",
    "Calfs",
    "Crunches",
  ],
  Cardio: ["Running", "Cycling"],
};

const COLORS = {
  Push: {
    bg: "bg-[#F3E4E4]",
    border: "border-[#D8B7B7]",
    borderAccent: "border-[#C98C8C]",
    text: "text-[#C98C8C]",
    fill: "bg-[#C98C8C]",
    light: "bg-[#F1E2E2]",
  },
  Pull: {
    bg: "bg-[#E7EBF0]",
    border: "border-[#BCC6D2]",
    borderAccent: "border-[#7E90A8]",
    text: "text-[#7E90A8]",
    fill: "bg-[#7E90A8]",
    light: "bg-[#E3E8EE]",
  },
  Legs: {
    bg: "bg-[#E8EFE6]",
    border: "border-[#C2D0BE]",
    borderAccent: "border-[#8FA58A]",
    text: "text-[#8FA58A]",
    fill: "bg-[#8FA58A]",
    light: "bg-[#E3EBE1]",
  },
  Cardio: {
    bg: "bg-[#F3ECE3]",
    border: "border-[#DDC8AA]",
    borderAccent: "border-[#C9A06B]",
    text: "text-[#C9A06B]",
    fill: "bg-[#C9A06B]",
    light: "bg-[#EFE6DA]",
  },
};

//  DARK MODE COLOR VARIABLES
const DARK = {
  bg: "bg-[#000000]", // main app background
  bgCard: "bg-[#111111]", // exercise cards, modals, set rows
  bgCardAlt: "bg-[#141414]", // history cards
  bgInput: "bg-[#0a0a0a]", // weight/reps value display
  bgTab: "bg-[#111111]", // view switcher pill background
  bgTabInactive: "bg-[#1e1e1e]", // inactive category tabs & buttons
  bgStickyTab: "bg-[#1e1e1e]", // sticky bar inactive tabs
  border: "border-[#222222]", // general borders
  borderCard: "border-[#2a2a2a]", // card borders
  text: "text-[#f0f0f0]", // primary text
  textSecondary: "text-[#aaaaaa]", // secondary text
  textMuted: "text-[#b5b5b5]", // muted/placeholder text
  textFaint: "text-[#333333]", // very faint text / delete buttons
  divider: "bg-[#222222]", // divider lines
};

const TABS = ["Push", "Pull", "Legs", "Cardio"];

const emptySet = () => ({ weight: "", reps: "", complete: false });
const emptyEntry = () => ({ exercise: "", rows: [emptySet()] });
const isFilledSet = (row) =>
  (parseFloat(row?.weight) || 0) > 0 || (parseFloat(row?.reps) || 0) > 0;

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDaysSince(d) {
  const last = new Date(d);
  const today = new Date();
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const days = Math.max(
    0,
    Math.round((todayDay - lastDay) / (1000 * 60 * 60 * 24)),
  );

  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function formatDistanceKm(value) {
  const distance = Number.parseFloat(value);
  if (!Number.isFinite(distance) || distance <= 0) return "—";
  return `${distance.toFixed(1).replace(/\.0$/, "")}km`;
}

function getCardioTimeParts(value) {
  const totalMinutes = Number.parseFloat(value);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return { minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.round(totalMinutes * 60);
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}

function formatCardioTime(value) {
  const { minutes, seconds } = getCardioTimeParts(value);
  if (minutes === 0 && seconds === 0) return "—";
  if (seconds === 0) return `${minutes} min`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatCardioSet(row) {
  return `${formatDistanceKm(row.weight)} · ${formatCardioTime(row.reps)}`;
}

function formatStrengthSet(row) {
  const weight = row.weight ? `${row.weight}kg` : "--";
  const reps = row.reps ? `${row.reps} reps` : "--";
  return `${weight} x ${reps}`;
}

function getLastStats(history, exercise) {
  for (const session of history) {
    for (const tab of TABS) {
      const exs = session.data[tab] || [];
      const match = exs.find((e) => e.exercise === exercise);
      if (match && match.rows?.some(isFilledSet)) {
        const rows = match.rows.filter(isFilledSet);
        const best = rows.reduce((b, r) => {
          const bWeight = parseFloat(b.weight) || 0;
          const rWeight = parseFloat(r.weight) || 0;
          if (rWeight !== bWeight) return rWeight > bWeight ? r : b;
          return (parseFloat(r.reps) || 0) > (parseFloat(b.reps) || 0) ? r : b;
        }, rows[0]);
        return { date: session.date, rows, best };
      }
    }
  }
  return null;
}

function NumberWheel({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
  darkMode,
  color,
  formatOption,
  disabled = false,
}) {
  const scrollRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const itemHeight = 36;
  const parsedValue = Number.parseFloat(value);
  const selectedValue = Number.isFinite(parsedValue)
    ? Math.min(max, Math.max(min, parsedValue))
    : min;
  const valueCount = Math.floor((max - min) / step) + 1;
  const values = Array.from({ length: valueCount }, (_, i) =>
    Number((min + i * step).toFixed(3)),
  );
  const selectedIndex = Math.min(
    valueCount - 1,
    Math.max(0, Math.round((selectedValue - min) / step)),
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = selectedIndex * itemHeight;
  }, [selectedIndex]);

  const updateFromScroll = () => {
    if (disabled) return;
    const el = scrollRef.current;
    if (!el) return;
    const nextIndex = Math.min(
      valueCount - 1,
      Math.max(0, Math.round(el.scrollTop / itemHeight)),
    );
    const nextValue = values[nextIndex];
    onChange(String(nextValue));
  };

  return (
    <div className="flex-1 min-w-0">
      <div className={`text-[12px] font-bold text-center mb-2 ${color.text}`}>
        {label}
      </div>
      <div className="relative">
        <div
          className={`pointer-events-none absolute left-2 right-2 top-1/2 h-9 -translate-y-1/2 rounded-xl ${disabled ? "bg-[#f2eeee]" : color.bg}`}
        />
        <div
          ref={scrollRef}
          onScroll={() => {
            clearTimeout(scrollTimerRef.current);
            scrollTimerRef.current = setTimeout(updateFromScroll, 80);
          }}
          className={`number-wheel-scrollbar relative h-[108px] overflow-y-auto snap-y snap-mandatory rounded-2xl border ${disabled ? "border-[#ebe2e2] opacity-70" : "border-[#eee6e6]"} ${darkMode ? DARK.bgCard : "bg-[#fffdfc]"} ${disabled ? "pointer-events-none" : ""}`}
          style={{
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="h-9" />
          {values.map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onChange(String(option))}
              className={`relative z-10 h-9 w-full snap-center bg-transparent border-none text-center tabular-nums transition-colors ${
                option === values[selectedIndex]
                  ? `${disabled ? "text-[#9f9fa6]" : color.text} text-[18px] font-black`
                  : darkMode
                    ? "text-[#555] text-[14px] font-semibold"
                    : "text-[#bbb] text-[14px] font-semibold"
              }`}
            >
              {formatOption ? formatOption(option) : `${option} ${unit}`}
            </button>
          ))}
          <div className="h-9" />
        </div>
      </div>
    </div>
  );
}

function StepperControl({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
  darkMode,
  color,
  disabled = false,
}) {
  const holdDelayRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const currentValueRef = useRef(min);
  const parsedValue = Number.parseFloat(value);
  const currentValue = Number.isFinite(parsedValue)
    ? Math.min(max, Math.max(min, parsedValue))
    : min;
  const displayValue = Number.isInteger(currentValue)
    ? String(currentValue)
    : String(Number(currentValue.toFixed(2)));

  const changeBy = (delta) => {
    if (disabled) return;
    const nextValue = Math.min(
      max,
      Math.max(min, currentValueRef.current + delta),
    );
    currentValueRef.current = nextValue;
    onChange(String(Number(nextValue.toFixed(3))));
  };

  const stopHold = () => {
    clearTimeout(holdDelayRef.current);
    clearInterval(holdIntervalRef.current);
    holdDelayRef.current = null;
    holdIntervalRef.current = null;
  };

  const startHold = (delta) => {
    if (disabled) return;
    stopHold();
    holdDelayRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => {
        changeBy(delta);
      }, 90);
    }, 360);
  };

  useEffect(() => {
    currentValueRef.current = currentValue;
  }, [currentValue]);

  useEffect(() => stopHold, []);

  const arrowClass = darkMode
    ? "border-[#7f5d5d]"
    : "border-[#c85f68]";

  return (
    <div className="min-w-0 flex-1">
      <div
        className={`mb-2 text-center text-[12px] font-bold ${disabled ? (darkMode ? "text-[#555]" : "text-[#aaa]") : color.text}`}
      >
        {label}
      </div>
      <div
        className={`flex h-[108px] items-center rounded-2xl border px-3 ${
          disabled
            ? darkMode
              ? "border-[#252525] bg-[#151515] opacity-70"
              : "border-[#ebe2e2] bg-[#f5f1f1] opacity-70"
            : darkMode
              ? "border-[#2a2a2a] bg-[#111]"
              : "border-[#eee6e6] bg-[#fffdfc]"
        }`}
      >
        <div className="min-w-0 flex-1 text-center">
          <span
            className={`align-baseline text-[34px] font-black tabular-nums ${disabled ? (darkMode ? "text-[#777]" : "text-[#9f9fa6]") : color.text}`}
          >
            {displayValue}
          </span>
        </div>
        <div
          className={`ml-3 flex h-16 w-9 shrink-0 flex-col overflow-hidden border-l ${disabled ? (darkMode ? "border-[#252525]" : "border-[#e2dddd]") : darkMode ? "border-[#2a2a2a]" : "border-[#eadcdc]"}`}
        >
          <button
            type="button"
            onClick={() => changeBy(step)}
            onPointerDown={() => startHold(step)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            onBlur={stopHold}
            onContextMenu={(e) => e.preventDefault()}
            disabled={disabled || currentValue >= max}
            className="flex flex-1 select-none touch-none items-center justify-center bg-transparent disabled:opacity-35"
            style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
            aria-label={`Increase ${label}`}
          >
            <span
              className={`block h-3 w-3 rotate-[225deg] border-b-2 border-r-2 ${arrowClass}`}
            />
          </button>
          <button
            type="button"
            onClick={() => changeBy(-step)}
            onPointerDown={() => startHold(-step)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            onBlur={stopHold}
            onContextMenu={(e) => e.preventDefault()}
            disabled={disabled || currentValue <= min}
            className="flex flex-1 select-none touch-none items-center justify-center bg-transparent disabled:opacity-35"
            style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
            aria-label={`Decrease ${label}`}
          >
            <span
              className={`block h-3 w-3 rotate-45 border-b-2 border-r-2 ${arrowClass}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatsView({ history, darkMode }) {
  if (history.length === 0)
    return (
      <div className="text-center text-[#bbb] mt-[60px] text-[15px]">
        <p>No sessions yet.</p>
        <p className="text-[13px]">Log some workouts to see your stats!</p>
      </div>
    );

  const counts = { Push: 0, Pull: 0, Legs: 0, Cardio: 0 };
  for (const session of history)
    for (const tab of TABS)
      if ((session.data[tab] || []).some((e) => e.exercise)) counts[tab]++;

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  const exerciseStats = {};
  for (const session of history) {
    for (const tab of TABS) {
      const exs = session.data[tab] || [];
      for (const ex of exs) {
        const filledRows = ex.rows?.filter(isFilledSet) || [];
        if (ex.exercise && filledRows.length > 0) {
          if (!exerciseStats[ex.exercise]) {
            exerciseStats[ex.exercise] = {
              count: 0,
              totalWeight: 0,
              totalSets: 0,
              category: tab,
            };
          }
          exerciseStats[ex.exercise].count++;
          exerciseStats[ex.exercise].totalSets += filledRows.length;
          for (const row of filledRows) {
            if (row.weight) {
              exerciseStats[ex.exercise].totalWeight +=
                parseFloat(row.weight) * (parseFloat(row.reps) || 1);
            }
          }
        }
      }
    }
  }

  const mostFrequent = Object.entries(exerciseStats).sort(
    (a, b) => b[1].count - a[1].count,
  )[0];
  const mostWeight = Object.entries(exerciseStats)
    .filter(([_, stats]) => stats.category !== "Cardio")
    .sort((a, b) => b[1].totalWeight - a[1].totalWeight)[0];
  const mostSets = Object.entries(exerciseStats).sort(
    (a, b) => b[1].totalSets - a[1].totalSets,
  )[0];

  const allNonCardio = Object.entries(exerciseStats)
    .filter(([_, stats]) => stats.category !== "Cardio")
    .sort((a, b) => a[1].totalSets - b[1].totalSets);

  const fourthLowestSets =
    allNonCardio[3]?.[1].totalSets ??
    allNonCardio[allNonCardio.length - 1]?.[1].totalSets ??
    0;

  const leastPerformed = allNonCardio.slice(0, 3);

  return (
    <div>
      {leastPerformed.length > 0 && (
        <div className="mb-6 pb-6 border-b border-[#e0dbd6]">
          <h3 className="text-center text-[#888] text-base font-bold mb-4">
            Recommended Exercises
          </h3>
          <div
            className={`rounded-xl p-4 border border-[#e0dbd6] ${darkMode ? `${DARK.bgCard}` : "bg-[#f5f5f5]"}`}
          >
            <div className="text-[12px] font-bold text-[#888] uppercase tracking-[0.5px] mb-3">
              Recommended Exercises
            </div>
            <div className="flex flex-col gap-2">
              {leastPerformed.map(([exerciseName, stats], i) => (
                <div
                  key={exerciseName}
                  className={`flex items-center justify-between py-2 ${i < leastPerformed.length - 1 ? "border-b border-[#e0dbd6]" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${COLORS[stats.category].bg} ${COLORS[stats.category].text}`}
                    >
                      {stats.category}
                    </span>
                    <span
                      className={`font-bold text-sm ${COLORS[stats.category].text}`}
                    >
                      {exerciseName}
                    </span>
                  </div>
                  <span className="text-xs text-[#bbb]">
                    {Math.max(0, fourthLowestSets + 1 - stats.totalSets)} set
                    {Math.max(0, fourthLowestSets + 1 - stats.totalSets) !== 1
                      ? "s"
                      : ""}{" "}
                    needed
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <h2 className="text-center text-[#888] text-base font-bold mb-5">
        Workout Breakdown · {history.length} session
        {history.length !== 1 ? "s" : ""}
      </h2>
      {TABS.map((tab) => {
        const pct = Math.round((counts[tab] / total) * 100);
        const col = COLORS[tab];
        return (
          <div key={tab} className="mb-[18px]">
            <div className="flex justify-between mb-1.5">
              <span className={`font-bold ${col.text} text-sm`}>{tab}</span>
              <span className="font-bold text-[#aaa] text-sm">
                {pct}%{" "}
                <span className="font-normal text-xs">
                  ({counts[tab]} session{counts[tab] !== 1 ? "s" : ""})
                </span>
              </span>
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

      {(mostFrequent || mostWeight || mostSets) && (
        <div className="mt-8 pt-6 border-t border-[#e0dbd6]">
          <h3 className="text-center text-[#888] text-base font-bold mb-5">
            Exercise Highlights
          </h3>
          <div className="flex flex-col gap-4">
            {mostFrequent && (
              <div
                className={`${darkMode ? `${DARK.bgCard} ${DARK.borderCard}` : "bg-[#f5f5f5] border-[#e0dbd6]"} rounded-xl p-4 border`}
              >
                <div
                  className={`text-[12px] font-bold ${darkMode ? DARK.textMuted : "text-[#999]"} uppercase tracking-[0.5px] mb-2`}
                >
                  🔥 Fav Exercise
                </div>
                <div
                  className={`text-lg font-bold ${darkMode ? DARK.text : "text-[#555]"}`}
                >
                  {mostFrequent[0]}
                </div>
                <div className="text-sm text-[#999] mt-1">
                  {mostFrequent[1].count} Sessions
                </div>
              </div>
            )}
            {mostWeight && (
              <div
                className={`${darkMode ? `${DARK.bgCard} ${DARK.borderCard}` : "bg-[#f5f5f5] border-[#e0dbd6]"} rounded-xl p-4 border`}
              >
                <div
                  className={`text-[12px] font-bold ${darkMode ? DARK.textMuted : "text-[#999]"} uppercase tracking-[0.5px] mb-2`}
                >
                  💪 Most Total Weight Moved
                </div>
                <div
                  className={`text-lg font-bold ${darkMode ? DARK.text : "text-[#555]"}`}
                >
                  {mostWeight[0]}
                </div>
                <div className="text-sm text-[#999] mt-1">
                  {mostWeight[1].totalWeight.toFixed(0)} kg
                </div>
              </div>
            )}
            {mostSets && (
              <div
                className={`${darkMode ? `${DARK.bgCard} ${DARK.borderCard}` : "bg-[#f5f5f5] border-[#e0dbd6]"} rounded-xl p-4 border`}
              >
                <div
                  className={`text-[12px] font-bold ${darkMode ? DARK.textMuted : "text-[#999]"} uppercase tracking-[0.5px] mb-2`}
                >
                  🎯 Most Sets
                </div>
                <div
                  className={`text-lg font-bold ${darkMode ? DARK.text : "text-[#555]"}`}
                >
                  {mostSets[0]}
                </div>
                <div className="text-sm text-[#999] mt-1">
                  {mostSets[1].totalSets} Sets
                </div>
              </div>
            )}
            <h2
              className={`text-large text-center m-4 ${darkMode ? "text-green-400" : "text-green-700"}`}
            >
              Made by Bman
            </h2>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("Push");
  const [view, setView] = useState("log");
  const [entries, setEntries] = useState({
    Push: [emptyEntry()],
    Pull: [emptyEntry()],
    Legs: [emptyEntry()],
    Cardio: [emptyEntry()],
  });
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [showFullscreenStopwatch, setShowFullscreenStopwatch] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [customExercises, setCustomExercises] = useState({
    Push: [],
    Pull: [],
    Legs: [],
    Cardio: [],
  });
  const [deletedExercises, setDeletedExercises] = useState({
    Push: [],
    Pull: [],
    Legs: [],
    Cardio: [],
  });
  const [showExerciseSelectModal, setShowExerciseSelectModal] = useState(false);
  const [selectingExerciseIdx, setSelectingExerciseIdx] = useState(null);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseTab, setNewExerciseTab] = useState("Push");
  const [showDeleteExerciseModal, setShowDeleteExerciseModal] = useState(false);
  const [pendingDeleteExercise, setPendingDeleteExercise] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState({});
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showRefreshWarningModal, setShowRefreshWarningModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [deletingSets, setDeletingSets] = useState({});
  const [finishingStopwatchSet, setFinishingStopwatchSet] = useState(null);
  const [stopwatchFlash, setStopwatchFlash] = useState(false);

  const toggleSession = (id) =>
    setExpandedSessions((prev) => ({ ...prev, [id]: !prev[id] }));

  const switchTab = (tab) => {
    const scrollY = window.scrollY;
    if (showExerciseSelectModal) {
      const tabEntries = entries[tab] || [emptyEntry()];
      const emptyIdx = tabEntries.findIndex((entry) => !entry.exercise);
      setSelectingExerciseIdx(emptyIdx === -1 ? tabEntries.length : emptyIdx);
      setExerciseSearchQuery("");
      if (emptyIdx === -1) {
        setEntries((prev) => ({
          ...prev,
          [tab]: [...(prev[tab] || []), emptyEntry()],
        }));
      }
    }
    setActiveTab(tab);
    requestAnimationFrame(() =>
      window.scrollTo({ top: scrollY, behavior: "instant" }),
    );
  };

  const [deleteExerciseTab, setDeleteExerciseTab] = useState("Push");
  const [totalSessionTime, setTotalSessionTime] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const fileInputRef = useRef(null);
  const stopwatchRef = useRef(null);
  const allowRefreshRef = useRef(false);
  const hasOpenExercise = Object.values(entries).some((tab) =>
    tab.some((entry) => entry.exercise),
  );
  const shouldWarnBeforeRefresh = hasOpenExercise && !saved;

  const resetStopwatch = () => {
    setStartTime(Date.now());
    setElapsed(0);
  };

  useEffect(() => {
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - startTime) / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, [startTime]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isRefreshShortcut =
        event.key === "F5" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r");

      if (
        !isRefreshShortcut ||
        !shouldWarnBeforeRefresh ||
        allowRefreshRef.current
      ) {
        return;
      }

      event.preventDefault();
      setShowRefreshWarningModal(true);
    };

    const handleBeforeUnload = (event) => {
      if (!shouldWarnBeforeRefresh || allowRefreshRef.current) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldWarnBeforeRefresh]);

  useEffect(() => {
    let inactivityTimer;
    const events = [
      "pointerdown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
    ];

    const resetInactivityTimer = (event) => {
      const pressedFullscreenControl = event?.target?.closest?.(
        "[data-fullscreen-stopwatch-timer], [data-fullscreen-stopwatch-controls]",
      );
      if (!pressedFullscreenControl && showFullscreenStopwatch) {
        setShowFullscreenStopwatch(false);
        setIsBlocked(true);
        // screen inactivity after stopwatch
        setTimeout(() => setIsBlocked(false), 600);
      } else if (!pressedFullscreenControl) {
        // normal activity, just reset timer
      }
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        if (document.visibilityState === "visible") {
          setShowFullscreenStopwatch(true);
        }
        // this is the time that the fullscreen stopwatch will take over
      }, 10000);
      // }, 999999);
      
    };

    resetInactivityTimer();
    events.forEach((eventName) =>
      window.addEventListener(eventName, resetInactivityTimer, {
        passive: true,
      }),
    );

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((eventName) =>
        window.removeEventListener(eventName, resetInactivityTimer),
      );
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0 },
    );
    if (stopwatchRef.current) observer.observe(stopwatchRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    try {
      const h = localStorage.getItem("workout_history");
      if (h) setHistory(JSON.parse(h));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const ce = localStorage.getItem("custom_exercises");
      if (ce) setCustomExercises(JSON.parse(ce));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const de = localStorage.getItem("deleted_exercises");
      if (de) setDeletedExercises(JSON.parse(de));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("total_session_time");
      const lastSeen = localStorage.getItem("last_seen_timestamp");
      const FOUR_HOURS = 4 * 60 * 60 * 1000;
      if (lastSeen && Date.now() - parseInt(lastSeen) > FOUR_HOURS) {
        localStorage.setItem("total_session_time", "0");
      } else if (saved) {
        setTotalSessionTime(parseInt(saved, 10));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const lastSeen = localStorage.getItem("last_seen_timestamp");
        const FOUR_HOURS = 4 * 60 * 60 * 1000;
        if (lastSeen && Date.now() - parseInt(lastSeen) > FOUR_HOURS) {
          setTotalSessionTime(0);
          localStorage.setItem("total_session_time", "0");
        }
      } else {
        localStorage.setItem("last_seen_timestamp", String(Date.now()));
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setTotalSessionTime((prev) => {
        const newTotal = prev + 1;
        try {
          localStorage.setItem("total_session_time", String(newTotal));
        } catch {}
        return newTotal;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [sessionStartTime]);

  const c = COLORS[activeTab];

  const scrollExerciseToTop = (idx) => {
    window.setTimeout(() => {
      const card = document.querySelector(`[data-exercise-index="${idx}"]`);
      if (!card) return;
      const top = card.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top, behavior: "smooth" });
    }, 80);
  };

  const updateEntry = (idx, field, val) => {
    setEntries((prev) => {
      const tab = [...prev[activeTab]];
      let rows = tab[idx].rows;
      if (field === "exercise" && val) {
        const lastStats = getLastStats(history, val);
        rows = lastStats ? lastStats.rows : [emptySet()];
      } else if (field === "exercise") {
        rows = [emptySet()];
      }
      tab[idx] = { ...tab[idx], [field]: val, rows };
      return { ...prev, [activeTab]: tab };
    });
  };

  const updateRow = (eIdx, rIdx, field, val) => {
    setEntries((prev) => {
      const tab = [...prev[activeTab]];
      const rows = [...tab[eIdx].rows];
      if (rows[rIdx]?.complete) return prev;
      rows[rIdx] = { ...rows[rIdx], [field]: val };
      tab[eIdx] = { ...tab[eIdx], rows };
      return { ...prev, [activeTab]: tab };
    });
  };

  const addSet = (eIdx) => {
    setEntries((prev) => {
      const tab = [...prev[activeTab]];
      const rows = tab[eIdx].rows;
      const prev2 = rows[rows.length - 1];
      const newSet = {
        weight: prev2.weight,
        reps: prev2.reps ? String(parseInt(prev2.reps) + 1) : "",
        complete: false,
      };
      tab[eIdx] = { ...tab[eIdx], rows: [...rows, newSet] };
      return { ...prev, [activeTab]: tab };
    });
  };

  const toggleSetComplete = (eIdx, rIdx) => {
    setEntries((prev) => {
      const tab = [...prev[activeTab]];
      const rows = [...tab[eIdx].rows];
      rows[rIdx] = { ...rows[rIdx], complete: !rows[rIdx].complete };
      tab[eIdx] = { ...tab[eIdx], rows };
      return { ...prev, [activeTab]: tab };
    });
  };

  const removeSet = (eIdx, rIdx) => {
    setEntries((prev) => {
      const tab = [...prev[activeTab]];
      if (tab[eIdx].rows[rIdx]?.complete) return prev;
      const rows = tab[eIdx].rows.filter((_, i) => i !== rIdx);
      if (rows.length === 0) {
        const updatedTab = tab.filter((_, i) => i !== eIdx);
        return {
          ...prev,
          [activeTab]: updatedTab.length ? updatedTab : [emptyEntry()],
        };
      }
      tab[eIdx] = { ...tab[eIdx], rows };
      return { ...prev, [activeTab]: tab };
    });
  };

  const addExercise = () =>
    setEntries((prev) => ({
      ...prev,
      [activeTab]: [...prev[activeTab], emptyEntry()],
    }));

  const removeExercise = (idx) => {
    setEntries((prev) => {
      if (prev[activeTab][idx]?.rows?.some((row) => row.complete)) return prev;
      const tab = prev[activeTab].filter((_, i) => i !== idx);
      return { ...prev, [activeTab]: tab.length ? tab : [emptyEntry()] };
    });
  };

  const requestRemoveSet = (eIdx, rIdx) => {
    const key = `${activeTab}-${eIdx}-${rIdx}`;
    if (deletingSets[key]) return;

    setDeletingSets((prev) => ({ ...prev, [key]: true }));
    window.setTimeout(() => {
      removeSet(eIdx, rIdx);
      setDeletingSets((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 340);
  };

  const addCustomExercise = () => {
    const exerciseName = newExerciseName.trim();
    if (!exerciseName) return;
    const updated = {
      ...customExercises,
      [newExerciseTab]: [
        ...(customExercises[newExerciseTab] || []),
        exerciseName,
      ],
    };
    setCustomExercises(updated);
    try {
      localStorage.setItem("custom_exercises", JSON.stringify(updated));
    } catch {}
    setShowAddExerciseModal(false);
    setNewExerciseName("");
    setExerciseSearchQuery("");
    setShowExerciseSelectModal(true);
  };

  const confirmDeleteExercise = () => {
    if (!pendingDeleteExercise) return;
    const updated = {
      ...deletedExercises,
      [deleteExerciseTab]: [
        ...(deletedExercises[deleteExerciseTab] || []),
        pendingDeleteExercise,
      ],
    };
    setDeletedExercises(updated);
    try {
      localStorage.setItem("deleted_exercises", JSON.stringify(updated));
    } catch {}
    setPendingDeleteExercise(null);
  };

  const saveSession = () => {
    const data = Object.fromEntries(
      Object.entries(entries).map(([k, v]) => [
        k,
        v
          .filter((e) => e.exercise)
          .map((e) => ({ ...e, rows: e.rows.filter(isFilledSet) }))
          .filter((e) => e.rows.length > 0),
      ]),
    );
    if (!Object.values(data).some((tab) => tab.length > 0)) return;

    const session = {
      id: Date.now(),
      date: new Date().toISOString(),
      data,
    };
    const updated = [session, ...history];
    setHistory(updated);
    try {
      localStorage.setItem("workout_history", JSON.stringify(updated));
    } catch {}
    setTotalSessionTime(0);
    setSessionStartTime(Date.now());
    localStorage.setItem("total_session_time", "0");
    localStorage.setItem("last_seen_timestamp", String(Date.now()));
    setSaved(true);
    setTimeout(() => {
      setEntries({
        Push: [emptyEntry()],
        Pull: [emptyEntry()],
        Legs: [emptyEntry()],
        Cardio: [emptyEntry()],
      });
      setSaved(false);
    }, 1500);
  };

  const deleteSession = (id) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    try {
      localStorage.setItem("workout_history", JSON.stringify(updated));
    } catch {}
  };

  const downloadWorkoutData = () => {
    const dataStr = JSON.stringify(
      { history, customExercises, deletedExercises },
      null,
      2,
    );
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `workout-history-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const uploadWorkoutData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        let historyData, customEx, deletedEx;
        if (Array.isArray(importedData)) {
          historyData = importedData;
          customEx = { Push: [], Pull: [], Legs: [], Cardio: [] };
          deletedEx = { Push: [], Pull: [], Legs: [], Cardio: [] };
        } else {
          historyData = importedData.history || [];
          customEx = importedData.customExercises || {
            Push: [],
            Pull: [],
            Legs: [],
            Cardio: [],
          };
          deletedEx = importedData.deletedExercises || {
            Push: [],
            Pull: [],
            Legs: [],
            Cardio: [],
          };
        }
        const merged = [...historyData, ...history];
        const uniqueMerged = [];
        const seenIds = new Set();
        for (const session of merged) {
          if (!seenIds.has(session.id)) {
            seenIds.add(session.id);
            uniqueMerged.push(session);
          }
        }
        const mergedCustomEx = { ...customEx };
        const mergedDeletedEx = { ...deletedEx };
        for (const tab of TABS) {
          mergedCustomEx[tab] = [
            ...new Set([
              ...(customEx[tab] || []),
              ...(customExercises[tab] || []),
            ]),
          ];
          mergedDeletedEx[tab] = [
            ...new Set([
              ...(deletedEx[tab] || []),
              ...(deletedExercises[tab] || []),
            ]),
          ];
        }
        setHistory(uniqueMerged);
        setCustomExercises(mergedCustomEx);
        setDeletedExercises(mergedDeletedEx);
        try {
          localStorage.setItem("workout_history", JSON.stringify(uniqueMerged));
          localStorage.setItem(
            "custom_exercises",
            JSON.stringify(mergedCustomEx),
          );
          localStorage.setItem(
            "deleted_exercises",
            JSON.stringify(mergedDeletedEx),
          );
        } catch {}
        alert(
          `✅ Successfully imported ${historyData.length} workout session(s)!`,
        );
      } catch (error) {
        alert("Error reading file. Please make sure it's a valid JSON file.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  const version = new Date();
  const day = version.getDate();
  const month = version.getMonth() + 1;
  const activeEntries = entries[activeTab] || [];
  const visibleDefaultExercises = (EXERCISES[deleteExerciseTab] || []).filter(
    (ex) => !deletedExercises[deleteExerciseTab]?.includes(ex),
  );
  const visibleCustomExercises = (
    customExercises[deleteExerciseTab] || []
  ).filter((ex) => !deletedExercises[deleteExerciseTab]?.includes(ex));
  const selectedExerciseCount = Object.values(entries).reduce(
    (count, tab) => count + tab.filter((entry) => entry.exercise).length,
    0,
  );
  const petImage =
    selectedExerciseCount > 5
      ? "assets/tired.png"
      : selectedExerciseCount >= 2
        ? "assets/strong_animate.gif"
        : "assets/workout.gif";
  const emptyExerciseIdx = activeEntries.findIndex((entry) => !entry.exercise);
  const showBottomExerciseSelector = emptyExerciseIdx !== -1;
  const bottomExerciseIdx = showBottomExerciseSelector ? emptyExerciseIdx : 0;
  const bottomExercise = activeEntries[bottomExerciseIdx] || emptyEntry();
  const canAddExercise =
    activeEntries.length > 0 && activeEntries.every((entry) => entry.exercise);
  const hasWorkoutData = Object.values(entries).some((tab) =>
    tab.some((entry) => entry.exercise && entry.rows?.some(isFilledSet)),
  );
  const currentUnlockedSet = (() => {
    for (let eIdx = 0; eIdx < activeEntries.length; eIdx++) {
      const entry = activeEntries[eIdx];
      if (!entry.exercise) continue;
      const rIdx = entry.rows?.findIndex((row) => !row.complete) ?? -1;
      if (rIdx !== -1) {
        const row = entry.rows[rIdx];
        return {
          eIdx,
          rIdx,
          key: `${activeTab}-${eIdx}-${rIdx}`,
          exercise: entry.exercise,
          setLabel: `Set ${rIdx + 1}`,
          primary:
            activeTab === "Cardio"
              ? formatDistanceKm(row.weight)
              : row.weight
                ? `${row.weight} kg`
                : "-- kg",
          secondary:
            activeTab === "Cardio"
              ? formatCardioTime(row.reps)
              : row.reps
                ? `${row.reps} reps`
                : "-- reps",
          repsValue: Number.parseFloat(row.reps) || 0,
        };
      }
    }
    return null;
  })();
  const finishStopwatchSet = () => {
    if (!currentUnlockedSet || finishingStopwatchSet) return;

    const setToFinish = currentUnlockedSet;
    setFinishingStopwatchSet(setToFinish.key);
    setStopwatchFlash(true);
    resetStopwatch();
    window.setTimeout(() => setStopwatchFlash(false), 260);
    window.setTimeout(() => {
      toggleSetComplete(setToFinish.eIdx, setToFinish.rIdx);
      setFinishingStopwatchSet(null);
    }, 520);
  };
  const isFinishingCurrentStopwatchSet =
    currentUnlockedSet?.key === finishingStopwatchSet;
  const adjustStopwatchReps = (delta) => {
    if (
      !currentUnlockedSet ||
      activeTab === "Cardio" ||
      isFinishingCurrentStopwatchSet
    ) {
      return;
    }

    const nextReps = Math.min(
      20,
      Math.max(0, currentUnlockedSet.repsValue + delta),
    );
    updateRow(
      currentUnlockedSet.eIdx,
      currentUnlockedSet.rIdx,
      "reps",
      String(nextReps),
    );
  };

  return (
    <div
      data-name="App-Container"
      className={`font-sans min-h-screen py-5 px-3 pb-[75dvh] transition-colors duration-300 ${darkMode ? DARK.bg : "bg-[#f9f7f4]"}`}
    >
      {showRefreshWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120] px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="refresh-warning-title"
            className={`${darkMode ? `${DARK.bgCard} ${DARK.borderCard}` : "bg-white border-[#e0dbd6]"} rounded-2xl p-6 max-w-sm w-full border shadow-xl`}
          >
            <h2
              id="refresh-warning-title"
              className={`text-lg font-bold mb-2 ${darkMode ? DARK.text : "text-[#333]"}`}
            >
              Refresh page?
            </h2>
            <p
              className={`text-sm leading-relaxed mb-5 ${darkMode ? DARK.textSecondary : "text-[#666]"}`}
            >
              Refreshing will lose your unsaved workout. Do you want to refresh
              anyway?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRefreshWarningModal(false)}
                className={`flex-1 py-3 rounded-xl font-semibold ${darkMode ? `${DARK.bgTabInactive} ${DARK.textSecondary}` : "bg-[#e8e4e0] text-[#666]"}`}
              >
                Go back
              </button>
              <button
                onClick={() => {
                  allowRefreshRef.current = true;
                  window.location.reload();
                }}
                className="flex-1 py-3 rounded-xl font-semibold bg-[#FA502F] text-white"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {showFullscreenStopwatch && (
        <div
          data-name="Fullscreen-Stopwatch"
          onClick={() => setShowFullscreenStopwatch(false)}
          className={`fixed inset-0 z-[100] flex items-center justify-center animate-fade-in px-4 pb-8 transition-colors duration-200 ${
            stopwatchFlash
              ? darkMode
                ? "bg-[#0d2413]"
                : "bg-[#e6f8e9]"
              : darkMode
                ? DARK.bg
                : "bg-[#f9f7f4]"
          }`}
        >
          <div
            data-fullscreen-stopwatch-timer
            onPointerDown={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              resetStopwatch();
            }}
            className={`text-[96px] sm:text-[140px] font-bold ${c.text} tracking-[2px] tabular-nums cursor-pointer`}
          >
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
          </div>
          {currentUnlockedSet && (
            <div
              key={currentUnlockedSet.key}
              data-name="Fullscreen-Current-Set"
              data-fullscreen-stopwatch-controls
              onPointerDown={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              className={`absolute inset-x-4 bottom-6 mx-auto flex max-w-[680px] flex-col gap-3 rounded-2xl border p-4 shadow-[0_12px_30px_rgba(0,0,0,0.08)] ${darkMode ? "border-[#242424] bg-[#111]" : "border-[#eadcdc] bg-[#fffdfc]"}`}
            >
              <div className="min-w-0">
                <div
                  className={`text-[24px] font-black uppercase tracking-[0.3px] ${c.text}`}
                >
                  {currentUnlockedSet.setLabel}
                </div>
                <div
                  className={`mt-0.5 truncate text-[14px] font-bold ${darkMode ? DARK.textSecondary : "text-[#666]"}`}
                >
                  {currentUnlockedSet.exercise}
                </div>
                <div className="mt-2 flex items-center gap-2.5 text-[18px] font-black">
                  <span className={c.text}>{currentUnlockedSet.primary}</span>
                  <span className={darkMode ? "text-[#777]" : "text-[#b8adad]"}>
                    /
                  </span>
                  {activeTab === "Cardio" ? (
                    <span className={c.text}>
                      {currentUnlockedSet.secondary}
                    </span>
                  ) : (
                    <div
                      className={`flex items-center overflow-hidden rounded-xl border ${darkMode ? "border-[#2a2a2a] bg-[#171717]" : "border-[#eadcdc] bg-[#fff7f7]"}`}
                    >
                      <button
                        type="button"
                        onClick={() => adjustStopwatchReps(-1)}
                        disabled={
                          isFinishingCurrentStopwatchSet ||
                          currentUnlockedSet.repsValue <= 0
                        }
                        className={`h-9 w-9 bg-transparent text-[20px] font-black disabled:opacity-35 ${c.text}`}
                        aria-label="Decrease stopwatch reps"
                      >
                        -
                      </button>
                      <span className={`px-2 tabular-nums ${c.text}`}>
                        {currentUnlockedSet.repsValue} reps
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustStopwatchReps(1)}
                        disabled={
                          isFinishingCurrentStopwatchSet ||
                          currentUnlockedSet.repsValue >= 20
                        }
                        className={`h-9 w-9 bg-transparent text-[20px] font-black disabled:opacity-35 ${c.text}`}
                        aria-label="Increase stopwatch reps"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={finishStopwatchSet}
                disabled={isFinishingCurrentStopwatchSet}
                className={`${darkMode ? "border-[#243d2a] bg-[#142018] text-[#5ccf73]" : "border-[#cfead5] bg-[#e8f7eb] text-[#39a852]"} min-h-[56px] w-full rounded-xl border px-5 py-4 text-[14px] font-black transition-all duration-200 disabled:scale-95`}
              >
                {isFinishingCurrentStopwatchSet ? "✓" : "Finish set"}
              </button>
            </div>
          )}
        </div>
      )}
      <div data-name="Main-Content-Wrapper" className="max-w-[680px] mx-auto">
        <p data-name="app-version" className="text-[12px] text-gray-500 mb-2">
          V{day}.{month}
        </p>

        {/* SECTION: Header & Stopwatch */}
        <div
          ref={stopwatchRef}
          data-name="Stopwatch-Sentinel"
          className="h-0 overflow-visible"
        ></div>

        <div
          data-name="Sticky-Stopwatch-Wrapper"
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isSticky ? "bg-opacity-95 shadow-md" : "pointer-events-none"} ${darkMode ? DARK.bg : "bg-[#f9f7f4]"}`}
        >
          {isSticky && (
            <div className="max-w-[680px] mx-auto px-3">
              <div
                onClick={resetStopwatch}
                className={`text-[28px] font-bold ${c.text} tracking-[2px] tabular-nums cursor-pointer hover:opacity-70 transition-opacity text-center py-2`}
              >
                {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
                {String(elapsed % 60).padStart(2, "0")}
              </div>
              <div
                className={`h-[1px] ${darkMode ? DARK.divider : "bg-[#e8e4e0]"}`}
              />
            </div>
          )}
        </div>

        <div data-name="Header-Section" className="text-center mb-4 relative">
          <div className="absolute top-0 right-0">
            <input
              type="checkbox"
              id="dark-mode-toggle"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
              className="theme-toggle-input"
            />
            <label
              htmlFor="dark-mode-toggle"
              className="theme-toggle"
              aria-label="Toggle dark mode"
            />
          </div>
          <img
            src={petImage}
            className="block mx-auto w-20 cursor-pointer hover:opacity-80 transition-opacity"
            alt="Logo"
            onClick={() => setShowLogoModal(true)}
          />
          <div
            data-name="Stopwatch-Display"
            onClick={resetStopwatch}
            className={`text-[72px] font-bold ${c.text} tracking-[2px] tabular-nums duration-[1000ms] ease-in-out cursor-pointer hover:opacity-70 transition-opacity`}
          >
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
          </div>
        </div>

        {/* SECTION: View Switcher */}
        <div
          data-name="View-Toggle-Navigation"
          className={`flex mb-5 p-[5px] rounded-[14px] gap-[2px] ${darkMode ? DARK.bgTab : "bg-[#e0dbd6]"}`}
        >
          {["log", "history", "stats"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-[9px] rounded-[10px] border-none cursor-pointer text-[13px] font-semibold transition-all duration-200 ${
                view === v
                  ? darkMode
                    ? "bg-[#ffffff] text-[#000000]"
                    : "bg-[#f0f0f0] text-[#333]"
                  : darkMode
                    ? `bg-transparent ${DARK.textSecondary}`
                    : "bg-transparent text-[#888]"
              }`}
            >
              {v === "log" ? "Log" : v === "history" ? "History" : "Stats"}
            </button>
          ))}
        </div>

        {/* SECTION: Logging View */}
        {view === "log" && (
          <div
            data-name="Workout-Log-View"
            className={`animate-fade-in ${isBlocked ? "pointer-events-none" : ""}`}
          >
            {" "}
            {/* save session button */}
            <button
              onClick={hasWorkoutData ? saveSession : undefined}
              className={`w-full py-3 rounded-xl border-none text-white text-[14px] font-bold cursor-pointer transition-all duration-300 mb-2 ${
                hasWorkoutData ? "" : "invisible pointer-events-none"
              } ${saved ? "bg-[#a8d8a8]" : "bg-[#b0c4de]"}`}
            >
              {saved ? "✅ Session Saved!" : "Workout Finished"}
            </button>
            {/* Subsection: List of Exercises */}
            <div data-name="Exercise-List" className="flex flex-col gap-3.5">
              {entries[activeTab].map((entry, eIdx) => {
                const lastStats = entry.exercise
                  ? getLastStats(history, entry.exercise)
                  : null;
                if (!entry.exercise) return null;
                return (
                  <div
                    data-name="Exercise-Card"
                    data-exercise-index={eIdx}
                    key={eIdx}
                    className={`${darkMode ? `${DARK.bgCard} ${DARK.borderCard}` : "bg-[#fffdfc] border-[#eadcdc]"} border rounded-2xl p-4 shadow-[0_10px_24px_rgba(201,140,140,0.08)] transition-all duration-500 ease-in-out animate-fade-in`}
                  >
                    {/* Exercise Header */}
                    <div
                      data-name="Exercise-Title-Row"
                      className="flex items-center gap-3 mb-4"
                    >
                      <span
                        className={`${c.bg} ${c.text} rounded-full py-1 px-2.5 font-black text-[11px]`}
                      >
                        #{eIdx + 1}
                      </span>
                      <div
                        className={`flex-1 min-w-0 ${darkMode ? DARK.text : "text-[#222]"}`}
                      >
                        <span className="block truncate text-[18px] font-black tracking-normal">
                          {entry.exercise}
                        </span>
                        <span className="hidden">›</span>
                      </div>
                      {entries[activeTab].filter((e) => e.exercise).length >
                        1 &&
                        !entry.rows?.some((row) => row.complete) && (
                        <button
                          onClick={() => removeExercise(eIdx)}
                          className={`h-8 w-8 rounded-full border-none cursor-pointer text-[15px] ${darkMode ? `${DARK.bgTabInactive} ${DARK.textMuted}` : "bg-[#f6eeee] text-[#b77b7b]"}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Previous Session Stats */}
                    {lastStats && (
                      <div
                        data-name="Previous-Stats-Box"
                        className={`rounded-xl ${darkMode ? DARK.bgCardAlt : "bg-[#faf5f5]"} py-2 px-3 mb-3`}
                      >
                        <div
                          className={`text-[12px] font-bold ${darkMode ? DARK.textSecondary : "text-[#666]"} mb-1`}
                        >
                          Last trained {formatDaysSince(lastStats.date)}
                        </div>
                        <div className="hidden">
                          📊 Last session · {formatDate(lastStats.date)}
                        </div>
                        <div
                          data-name="Previous-Sets-Cloud"
                          className="flex flex-wrap gap-x-3 gap-y-1 mb-1.5"
                        >
                          {lastStats.rows.map((r, i) => (
                            <span
                              key={i}
                              className={`text-xs ${darkMode ? DARK.textSecondary : "text-[#777]"}`}
                            >
                              Set {i + 1}:{" "}
                              {activeTab === "Cardio"
                                ? formatCardioSet(r)
                                : `${r.weight ? `${r.weight}kg` : "—"} × ${r.reps ? `${r.reps} reps` : "—"}`}
                            </span>
                          ))}
                        </div>
                        <div
                          data-name="Personal-Best-Badge"
                          className="flex items-center gap-2"
                        >
                          <span
                            className={`text-[11px] font-bold ${c.text} uppercase tracking-[0.5px]`}
                          >
                            Best
                          </span>
                          <span className="hidden">🏆 Best Set</span>
                          <span
                            className={`text-xs font-bold ${darkMode ? DARK.text : "text-[#333]"}`}
                          >
                            {activeTab === "Cardio"
                              ? formatCardioSet(lastStats.best)
                              : `${lastStats.best.weight ? `${lastStats.best.weight}kg` : "—"} × ${lastStats.best.reps ? `${lastStats.best.reps} reps` : "—"}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Sets Input */}
                    {entry.exercise && (
                      <div
                        data-name="Sets-Input-Container"
                        className="flex flex-col gap-2"
                      >
                        {entry.rows.map((row, rIdx) => {
                          const setComplete = Boolean(row.complete);
                          const deletingSet = Boolean(
                            deletingSets[`${activeTab}-${eIdx}-${rIdx}`],
                          );
                          return (
                          <div
                            data-name="Single-Set-Row"
                            key={rIdx}
                            className={`${darkMode ? DARK.bgInput : setComplete ? "bg-[#f9f4f4]" : "bg-[#fffdfc]"} border ${setComplete ? "border-[#e7dada]" : "border-[#efe6e6]"} rounded-2xl px-3 py-3 max-h-[260px] animate-fade-in transition-all duration-300 ${deletingSet ? "animate-set-delete pointer-events-none" : ""}`}
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <span
                                className={`text-[12px] font-black uppercase tracking-[0.6px] ${setComplete ? "text-[#39a852]" : c.text}`}
                              >
                                Set {rIdx + 1}
                              </span>
                            </div>

                            <div className="flex items-stretch gap-2.5">
                              <div className="min-w-0 flex-1">
                            {activeTab === "Cardio" ? (
                              (() => {
                                const distance = Number.parseFloat(row.weight);
                                const safeDistance = Number.isFinite(distance)
                                  ? Math.max(0, distance)
                                  : 0;
                                let wholeKm = Math.floor(safeDistance);
                                let tenthsKm = Math.round(
                                  (safeDistance - wholeKm) * 10,
                                );
                                if (tenthsKm === 10) {
                                  wholeKm += 1;
                                  tenthsKm = 0;
                                }
                                const { minutes, seconds } = getCardioTimeParts(
                                  row.reps,
                                );
                                const saveDistance = (km, tenth) =>
                                  updateRow(
                                    eIdx,
                                    rIdx,
                                    "weight",
                                    (km + tenth / 10)
                                      .toFixed(1)
                                      .replace(/\.0$/, ""),
                                  );
                                const saveTime = (nextMinutes, nextSeconds) =>
                                  updateRow(
                                    eIdx,
                                    rIdx,
                                    "reps",
                                    ((nextMinutes * 60 + nextSeconds) / 60)
                                      .toFixed(4)
                                      .replace(/\.?0+$/, ""),
                                  );

                                return (
                                  <div className="flex gap-2">
                                    <NumberWheel
                                      label="Km"
                                      value={wholeKm}
                                      unit="km"
                                      min={0}
                                      max={100}
                                      onChange={(nextValue) =>
                                        saveDistance(
                                          Number.parseInt(nextValue, 10),
                                          tenthsKm,
                                        )
                                      }
                                      darkMode={darkMode}
                                      color={c}
                                      disabled={setComplete}
                                    />
                                    <NumberWheel
                                      label=".km"
                                      value={tenthsKm}
                                      unit=""
                                      min={0}
                                      max={9}
                                      formatOption={(option) => `.${option}`}
                                      onChange={(nextValue) =>
                                        saveDistance(
                                          wholeKm,
                                          Number.parseInt(nextValue, 10),
                                        )
                                      }
                                      darkMode={darkMode}
                                      color={c}
                                      disabled={setComplete}
                                    />
                                    <NumberWheel
                                      label="Min"
                                      value={minutes}
                                      unit="m"
                                      min={0}
                                      max={240}
                                      onChange={(nextValue) =>
                                        saveTime(
                                          Number.parseInt(nextValue, 10),
                                          seconds,
                                        )
                                      }
                                      darkMode={darkMode}
                                      color={c}
                                      disabled={setComplete}
                                    />
                                    <NumberWheel
                                      label="Sec"
                                      value={seconds}
                                      unit="s"
                                      min={0}
                                      max={59}
                                      formatOption={(option) =>
                                        `${String(option).padStart(2, "0")}s`
                                      }
                                      onChange={(nextValue) =>
                                        saveTime(
                                          minutes,
                                          Number.parseInt(nextValue, 10),
                                        )
                                      }
                                      darkMode={darkMode}
                                      color={c}
                                      disabled={setComplete}
                                    />
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="flex gap-2">
                                <StepperControl
                                  label="Kg"
                                  value={row.weight}
                                  unit="kg"
                                  min={0}
                                  max={250}
                                  step={1}
                                  formatOption={(option) => `${option}kg`}
                                  onChange={(nextValue) =>
                                    updateRow(eIdx, rIdx, "weight", nextValue)
                                  }
                                  darkMode={darkMode}
                                  color={c}
                                  disabled={setComplete}
                                />
                                <StepperControl
                                  label="Reps"
                                  value={row.reps}
                                  unit="reps"
                                  min={0}
                                  max={20}
                                  onChange={(nextValue) =>
                                    updateRow(eIdx, rIdx, "reps", nextValue)
                                  }
                                  darkMode={darkMode}
                                  color={c}
                                  disabled={setComplete}
                                />
                              </div>
                            )}
                              </div>
                              <div className="flex w-[82px] shrink-0 flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => requestRemoveSet(eIdx, rIdx)}
                                  disabled={setComplete || deletingSet}
                                  className={`${
                                    setComplete
                                      ? darkMode
                                        ? "border-[#252525] bg-[#171717] text-[#555] cursor-not-allowed"
                                        : "border-[#e2dddd] bg-[#f0eeee] text-[#b8b2b2] cursor-not-allowed"
                                      : darkMode
                                        ? "border-[#2a2a2a] bg-[#171717] text-[#8f6f6f] cursor-pointer"
                                        : "border-[#f0dddd] bg-[#fff7f7] text-[#b77b7b] cursor-pointer"
                                  } h-9 rounded-xl border text-[13px] font-black leading-none`}
                                  aria-label={`Delete set ${rIdx + 1}`}
                                >
                                  x
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleSetComplete(eIdx, rIdx)
                                  }
                                  className={`${
                                    setComplete
                                      ? darkMode
                                        ? "bg-[#142018] text-[#5ccf73] border-[#243d2a]"
                                        : "bg-[#e8f7eb] text-[#39a852] border-[#cfead5]"
                                      : darkMode
                                        ? "bg-[#171717] text-[#6fbd7b] border-[#2a2a2a]"
                                        : "bg-[#f7fbf8] text-[#39a852] border-[#d8ecdd]"
                                  } flex-1 rounded-xl border text-[11px] font-black leading-tight cursor-pointer`}
                                >
                                  {setComplete ? "Locked" : "Finish set"}
                                </button>
                              </div>
                            </div>
                            {false && (
                              <>
                                {/* Weight row */}
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span
                                    className={`text-[13px] font-semibold ${c.text} w-[52px]`}
                                  >
                                    {activeTab === "Cardio" ? "Dist" : "Weight"}
                                  </span>
                                  <span
                                    className={`${darkMode ? DARK.bgCard : "bg-white"} border-2 ${c.border} ${c.text} rounded-lg py-[5px] px-2.5 text-[18px] font-black min-w-[50px] text-center`}
                                  >
                                    {row.weight || "—"}
                                    {activeTab === "Cardio" ? "km" : ""}
                                  </span>
                                  <div className="flex gap-1 flex-1">
                                    <button
                                      onClick={() =>
                                        updateRow(
                                          eIdx,
                                          rIdx,
                                          "weight",
                                          Math.max(
                                            0,
                                            (parseFloat(row.weight) || 0) - 1,
                                          ).toString(),
                                        )
                                      }
                                      className={`flex-1 ${c.bg} border ${c.border} ${c.text} rounded-lg py-[5px] text-[13px] font-bold cursor-pointer`}
                                    >
                                      −1
                                    </button>
                                    <button
                                      onClick={() =>
                                        updateRow(
                                          eIdx,
                                          rIdx,
                                          "weight",
                                          (
                                            (parseFloat(row.weight) || 0) + 1
                                          ).toString(),
                                        )
                                      }
                                      className={`flex-1 ${c.bg} border ${c.border} ${c.text} rounded-lg py-[5px] text-[13px] font-bold cursor-pointer`}
                                    >
                                      +1
                                    </button>
                                    <button
                                      onClick={() =>
                                        updateRow(
                                          eIdx,
                                          rIdx,
                                          "weight",
                                          (
                                            (parseFloat(row.weight) || 0) + 5
                                          ).toString(),
                                        )
                                      }
                                      className={`flex-1 ${c.bg} border ${c.border} ${c.text} rounded-lg py-[5px] text-[13px] font-bold cursor-pointer`}
                                    >
                                      +5
                                    </button>
                                  </div>
                                </div>

                                {/* Reps row */}
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-[13px] font-semibold ${c.text} w-[52px]`}
                                  >
                                    {activeTab === "Cardio" ? "Time" : "Reps"}
                                  </span>
                                  <span
                                    className={`${darkMode ? DARK.bgCard : "bg-white"} border-2 ${c.border} ${c.text} rounded-lg py-[5px] px-2.5 text-[18px] font-black min-w-[50px] text-center`}
                                  >
                                    {row.reps || "—"}
                                    {activeTab === "Cardio" ? "m" : ""}
                                  </span>
                                  <div className="flex gap-1 flex-1">
                                    <button
                                      onClick={() =>
                                        updateRow(
                                          eIdx,
                                          rIdx,
                                          "reps",
                                          Math.max(
                                            0,
                                            (parseFloat(row.reps) || 0) - 1,
                                          ).toString(),
                                        )
                                      }
                                      className={`flex-1 ${c.bg} border ${c.border} ${c.text} rounded-lg py-[5px] text-[13px] font-bold cursor-pointer`}
                                    >
                                      −1
                                    </button>
                                    <button
                                      onClick={() =>
                                        updateRow(
                                          eIdx,
                                          rIdx,
                                          "reps",
                                          (
                                            (parseFloat(row.reps) || 0) + 1
                                          ).toString(),
                                        )
                                      }
                                      className={`flex-1 ${c.bg} border ${c.border} ${c.text} rounded-lg py-[5px] text-[13px] font-bold cursor-pointer`}
                                    >
                                      +1
                                    </button>
                                    <button
                                      onClick={() =>
                                        updateRow(
                                          eIdx,
                                          rIdx,
                                          "reps",
                                          (
                                            (parseFloat(row.reps) || 0) + 5
                                          ).toString(),
                                        )
                                      }
                                      className={`flex-1 ${c.bg} border ${c.border} ${c.text} rounded-lg py-[5px] text-[13px] font-bold cursor-pointer`}
                                    >
                                      +5
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                          );
                        })}

                        <button
                          data-name="Add-Set-Button"
                          onClick={() => addSet(eIdx)}
                          className={`w-full py-3 rounded-xl border border-[#eadcdc] ${darkMode ? `${DARK.bgCardAlt} ${DARK.textSecondary}` : "bg-[#faf3f3] text-[#a97070]"} text-[13px] font-black cursor-pointer flex items-center justify-center gap-1.5`}
                        >
                          <span className="text-[16px] font-normal leading-none">
                            +
                          </span>{" "}
                          Add set
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION: History View */}
        {view === "history" && (
          <div data-name="Workout-History-View" className="animate-fade-in">
            {history.length > 0 && (
              <button
                onClick={downloadWorkoutData}
                className="w-full p-[13px] rounded-xl border-none text-white text-[15px] font-bold cursor-pointer transition-colors duration-300 bg-[#98c9a3] mb-2 hover:bg-[#7bb88b]"
              >
                📩 Download Data
              </button>
            )}
            <button
              onClick={triggerFileUpload}
              className="w-full p-[13px] rounded-xl border-none text-white text-[15px] font-bold cursor-pointer transition-colors duration-300 bg-[#8ab4d9] mb-4 hover:bg-[#6a94b9]"
            >
              ⬆️ Upload Data
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={uploadWorkoutData}
              className="hidden"
            />
            <div
              className={`text-center text-sm mb-1 ${darkMode ? DARK.textMuted : "text-[#aaa]"}`}
            >
              📅 {formatDate(new Date())}
            </div>
            <div
              className={`text-center text-sm mb-4 tabular-nums ${darkMode ? DARK.textMuted : "text-[#aaa]"}`}
            >
              ⏱ Current session:{" "}
              {String(Math.floor(totalSessionTime / 3600)).padStart(2, "0")}:
              {String(Math.floor((totalSessionTime % 3600) / 60)).padStart(
                2,
                "0",
              )}
              :{String(totalSessionTime % 60).padStart(2, "0")}
            </div>
            {history.length === 0 ? (
              <div
                className={`text-center mt-[60px] text-[15px] ${darkMode ? DARK.textMuted : "text-[#bbb]"}`}
              >
                <p>No sessions saved yet.</p>
                <p className="text-[13px]">
                  Complete a workout and hit Workout Finished, or upload a
                  backup file!
                </p>
              </div>
            ) : (
              <>
                {history.map((session) => (
                  <div
                    data-name="History-Session-Card"
                    key={session.id}
                    className={`border-[1.5px] rounded-2xl mb-3.5 animate-fade-in transition-colors duration-300 overflow-hidden ${darkMode ? `${DARK.bgCardAlt} ${DARK.borderCard}` : "bg-white border-[#ede9e5]"}`}
                  >
                    <div
                      data-name="History-Header"
                      onClick={() => toggleSession(session.id)}
                      className={`flex justify-between items-center p-4 cursor-pointer select-none transition-colors duration-200 ${darkMode ? "hover:bg-[#1a1a1a]" : "hover:bg-[#faf9f7]"}`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span
                          className={`text-base inline-block transition-transform duration-200 ${expandedSessions[session.id] ? "rotate-90" : "rotate-0"}`}
                        >
                          ›
                        </span>
                        <span
                          className={`font-bold text-sm ${darkMode ? DARK.textSecondary : "text-[#666]"}`}
                        >
                          📅 {formatDate(session.date)}
                        </span>
                        {!expandedSessions[session.id] && (
                          <div className="flex gap-1 flex-wrap">
                            {TABS.map((tab) => {
                              const exs =
                                session.data[tab]?.filter((e) => e.exercise) ||
                                [];
                              if (!exs.length) return null;
                              const col = COLORS[tab];
                              return (
                                <span
                                  key={tab}
                                  className={`${col.bg} ${col.text} rounded-full py-0.5 px-2 text-[10px] font-bold`}
                                >
                                  {tab} · {exs.length}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className={`bg-transparent border-none cursor-pointer text-sm flex-none ml-2 ${darkMode ? DARK.textFaint : "text-[#ddd]"}`}
                      >
                        🗑
                      </button>
                    </div>

                    {expandedSessions[session.id] && (
                      <div
                        className={`px-4 pb-4 border-t ${darkMode ? DARK.borderCard : "border-[#ede9e5]"}`}
                      >
                        {TABS.map((tab) => {
                          const exs =
                            session.data[tab]?.filter((e) => e.exercise) || [];
                          if (!exs.length) return null;
                          const col = COLORS[tab];
                          return (
                            <div
                              data-name="History-Category-Block"
                              key={tab}
                              className="mt-3"
                            >
                              <div
                                className={`inline-block ${col.bg} ${col.text} rounded-[20px] py-0.5 px-3 text-xs font-bold mb-1.5`}
                              >
                                {tab}
                              </div>
                              {exs.map((e, i) => (
                                <div
                                  data-name="History-Exercise-Item"
                                  key={i}
                                  className="ml-2 mb-1.5"
                                >
                                  <div
                                    className={`font-semibold text-base ${darkMode ? DARK.textSecondary : "text-[#666]"}`}
                                  >
                                    {e.exercise}
                                  </div>
                                  <div
                                    data-name="History-Sets-Row"
                                    className="flex flex-wrap gap-1.5 mt-[3px]"
                                  >
                                    {e.rows.map((r, ri) =>
                                      r.weight || r.reps ? (
                                        <span
                                          key={ri}
                                          className={`${col.bg} ${col.text} rounded-lg py-[3px] px-2.5 text-sm`}
                                        >
                                          Set {ri + 1}:{" "}
                                          {tab === "Cardio"
                                            ? formatCardioSet(r)
                                            : `${r.weight ? `${r.weight}kg` : "—"} × ${r.reps ? `${r.reps} reps` : "—"}`}
                                        </span>
                                      ) : null,
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* SECTION: Stats View */}
        {view === "stats" && (
          <div data-name="Workout-Stats-View" className="animate-fade-in">
            <StatsView history={history} darkMode={darkMode} />
          </div>
        )}

        {/* Add Exercise Modal */}
        {showAddExerciseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              className={`${darkMode ? DARK.bgCard : "bg-white"} rounded-2xl p-6 max-w-sm w-full mx-4`}
            >
              <h2
                className={`text-lg font-bold mb-4 ${darkMode ? DARK.text : "text-[#333]"}`}
              >
                Add New Exercise
              </h2>
              <input
                type="text"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addCustomExercise()}
                placeholder="Exercise name"
                autoFocus
                className={`w-full py-2 px-3 rounded-lg border-[1.5px] ${darkMode ? `${DARK.bgCardAlt} ${DARK.borderCard} ${DARK.text}` : "bg-white border-[#ddd] text-[#333]"} mb-4 outline-none`}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddExerciseModal(false);
                    setNewExerciseName("");
                  }}
                  className={`flex-1 py-2 rounded-lg font-semibold ${darkMode ? `${DARK.bgTabInactive} ${DARK.textSecondary}` : "bg-[#e8e4e0] text-[#666]"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={addCustomExercise}
                  className="flex-1 py-2 rounded-lg font-semibold bg-[#4CAF50] text-white"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete/Restore Exercise Modal */}
        {showDeleteExerciseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              className={`${darkMode ? DARK.bgCard : "bg-white"} rounded-2xl p-6 max-w-sm w-full mx-4`}
            >
              <h2
                className={`text-lg font-bold mb-4 ${darkMode ? DARK.text : "text-[#333]"}`}
              >
                Delete Exercise
              </h2>

              {pendingDeleteExercise && (
                <div
                  className={`mb-4 rounded-xl border p-4 ${darkMode ? `${DARK.bgCardAlt} ${DARK.borderCard}` : "bg-[#fff5f5] border-[#f0cccc]"}`}
                >
                  <div
                    className={`text-sm font-semibold mb-2 ${darkMode ? DARK.text : "text-[#333]"}`}
                  >
                    Delete this exercise?
                  </div>
                  <div
                    className={`rounded-lg px-3 py-2 font-bold mb-3 ${darkMode ? `${DARK.bgTabInactive} ${DARK.textSecondary}` : "bg-white text-[#c63e3e]"}`}
                  >
                    {pendingDeleteExercise}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPendingDeleteExercise(null)}
                      className={`flex-1 py-2 rounded-lg font-semibold ${darkMode ? `${DARK.bgTabInactive} ${DARK.textSecondary}` : "bg-[#e8e4e0] text-[#666]"}`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteExercise}
                      className="flex-1 py-2 rounded-lg font-semibold bg-[#FA502F] text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {(visibleDefaultExercises.length > 0 ||
                visibleCustomExercises.length > 0) && (
                <>
                  <div
                    className={`text-sm font-semibold mb-2 ${darkMode ? DARK.textSecondary : "text-[#888]"}`}
                  >
                    Active Exercises
                  </div>
                  <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
                    {visibleDefaultExercises
                      ?.filter(
                        (ex) =>
                          !deletedExercises[deleteExerciseTab]?.includes(ex),
                      )
                      .map((ex) => (
                        <button
                          key={ex}
                          onClick={() => setPendingDeleteExercise(ex)}
                          className={`w-full p-3 rounded-lg text-left font-semibold transition-colors ${darkMode ? `${DARK.bgCardAlt} ${DARK.text}` : "bg-[#f5f5f5] text-[#333]"} hover:bg-[#FA502F] hover:text-white`}
                        >
                          ❌ {ex}
                        </button>
                      ))}
                    {visibleCustomExercises
                      ?.filter(
                        (ex) =>
                          !deletedExercises[deleteExerciseTab]?.includes(ex),
                      )
                      .map((ex) => (
                        <button
                          key={`custom-${ex}`}
                          onClick={() => setPendingDeleteExercise(ex)}
                          className={`w-full p-3 rounded-lg text-left font-semibold transition-colors ${darkMode ? `${DARK.bgCardAlt} ${DARK.text}` : "bg-[#f5f5f5] text-[#333]"} hover:bg-[#FA502F] hover:text-white`}
                        >
                          ❌ {ex}
                        </button>
                      ))}
                  </div>
                </>
              )}

              {false && deletedExercises[deleteExerciseTab]?.length > 0 && (
                <details className="mb-4">
                  <summary
                    className={`cursor-pointer select-none rounded-lg px-3 py-2 text-sm font-semibold ${darkMode ? `${DARK.bgTabInactive} ${DARK.textSecondary}` : "bg-[#e8e4e0] text-[#666]"}`}
                  >
                    Deleted Exercises (
                    {deletedExercises[deleteExerciseTab].length})
                  </summary>
                  <div className="space-y-2 mt-2 max-h-[200px] overflow-y-auto">
                    {deletedExercises[deleteExerciseTab]?.map((ex) => (
                      <button
                        key={`deleted-${ex}`}
                        onClick={() => restoreExercise(ex)}
                        className={`w-full p-3 rounded-lg text-left font-semibold transition-colors ${darkMode ? `${DARK.bgTabInactive} ${DARK.textSecondary}` : "bg-[#e8e4e0] text-[#666]"} hover:bg-[#4CAF50] hover:text-white`}
                      >
                        ↩️ {ex}
                      </button>
                    ))}
                  </div>
                </details>
              )}

              {visibleDefaultExercises.length === 0 &&
                visibleCustomExercises.length === 0 && (
                  <p
                    className={`mb-4 ${darkMode ? DARK.textSecondary : "text-[#666]"}`}
                  >
                    No active exercises to delete.
                  </p>
                )}

              <button
                onClick={() => {
                  setPendingDeleteExercise(null);
                  setShowDeleteExerciseModal(false);
                }}
                className={`w-full py-2 rounded-lg font-semibold ${darkMode ? `${DARK.bgTabInactive} ${DARK.textSecondary}` : "bg-[#e8e4e0] text-[#666]"}`}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Exercise Select Modal */}
        {showExerciseSelectModal &&
          selectingExerciseIdx !== null &&
          (() => {
            const allExercises = [
              ...EXERCISES[activeTab].filter(
                (ex) => !deletedExercises[activeTab]?.includes(ex),
              ),
              ...(customExercises[activeTab]?.filter(
                (ex) => !deletedExercises[activeTab]?.includes(ex),
              ) || []),
            ].sort((a, b) => a.localeCompare(b));
            const filtered = allExercises.filter((ex) =>
              ex.toLowerCase().includes(exerciseSearchQuery.toLowerCase()),
            );
            const col = COLORS[activeTab];
            const isExerciseAlreadySelected = (exerciseName) =>
              entries[activeTab]?.some(
                (entry, idx) =>
                  idx !== selectingExerciseIdx &&
                  entry.exercise === exerciseName,
              );
            return (
              <div className="fixed inset-x-0 top-0 bottom-[76px] bg-black bg-opacity-50 flex items-end justify-center z-40 sm:items-center pointer-events-none">
                <div
                  className={`${darkMode ? DARK.bgCard : "bg-white"} rounded-t-3xl sm:rounded-2xl p-5 w-full sm:max-w-sm flex flex-col overflow-hidden pointer-events-auto`}
                  style={{ maxHeight: "calc(100dvh - 96px)" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2
                      className={`text-lg font-bold ${darkMode ? DARK.text : "text-[#333]"}`}
                    >
                      Select Exercise
                      <span className={`ml-2 text-sm font-normal ${col.text}`}>
                        {activeTab}
                      </span>
                    </h2>
                    <button
                      onClick={() => setShowExerciseSelectModal(false)}
                      className={`text-xl bg-transparent border-none cursor-pointer ${darkMode ? DARK.textMuted : "text-[#bbb]"}`}
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    value={exerciseSearchQuery}
                    onChange={(e) => setExerciseSearchQuery(e.target.value)}
                    placeholder="Search exercises..."
                    className={`w-full py-2 px-3 rounded-lg border-[1.5px] ${col.border} ${darkMode ? `${DARK.bgCardAlt} ${DARK.text}` : "bg-[#f9f7f4] text-[#333]"} mb-3 outline-none text-sm`}
                  />
                  <div
                    className="min-h-0 max-h-[55dvh] overflow-y-auto touch-pan-y overscroll-contain flex-1 flex flex-col gap-2 mb-2 pr-1"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    {filtered.length === 0 && (
                      <p
                        className={`text-center text-sm mt-4 ${darkMode ? DARK.textMuted : "text-[#bbb]"}`}
                      >
                        No exercises found.
                      </p>
                    )}
                    {filtered.map((ex) => {
                      const alreadySelected = isExerciseAlreadySelected(ex);
                      const isCurrentSelection =
                        entries[activeTab][selectingExerciseIdx]?.exercise ===
                        ex;

                      return (
                        <button
                          key={ex}
                          disabled={alreadySelected}
                          onClick={() => {
                            if (alreadySelected) return;
                            updateEntry(selectingExerciseIdx, "exercise", ex);
                            setShowExerciseSelectModal(false);
                            scrollExerciseToTop(selectingExerciseIdx);
                          }}
                          className={`w-full p-3 rounded-xl text-left font-semibold text-sm transition-colors ${
                            alreadySelected
                              ? darkMode
                                ? `${DARK.bgTabInactive} text-[#555] cursor-not-allowed opacity-60`
                                : "bg-[#e5e5e5] text-[#aaa] cursor-not-allowed opacity-70"
                              : isCurrentSelection
                                ? `${col.bg} ${col.text} border-2 ${col.borderAccent}`
                                : darkMode
                                  ? `${DARK.bgCardAlt} ${DARK.text} hover:${DARK.bgTabInactive}`
                                  : "bg-[#f5f5f5] text-[#444] hover:bg-[#ede9e5]"
                          }`}
                        >
                          {ex}
                          {entries[activeTab][selectingExerciseIdx]
                            ?.exercise === ex && (
                            <span className="float-right">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div
                    className={`flex gap-2 pt-3 border-t border-[#ffffff] mt-auto sticky bottom-0 ${darkMode ? DARK.bgCard : "bg-white"}`}
                  >
                    <button
                      onClick={() => {
                        setShowExerciseSelectModal(false);
                        setNewExerciseTab(activeTab);
                        setShowAddExerciseModal(true);
                      }}
                      className={`flex-1 py-2.5 rounded-xl font-semibold text-sm ${darkMode ? `${DARK.bgTabInactive} ${DARK.textSecondary}` : "bg-[#e1f6e5] text-[#666]"}`}
                    >
                      Add New
                    </button>
                    <button
                      onClick={() => {
                        setShowExerciseSelectModal(false);
                        setDeleteExerciseTab(activeTab);
                        setShowDeleteExerciseModal(true);
                      }}
                      className={`flex-1 py-2.5 rounded-xl font-semibold text-sm ${darkMode ? `${DARK.bgTabInactive} ${DARK.textSecondary}` : "bg-[#f3dbdb] text-[#666]"}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Character Lore Modal */}
        {showLogoModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-40"
            onClick={() => setShowLogoModal(false)}
          >
            <div
              className={`${darkMode ? DARK.bgCard : "bg-white"} rounded-t-3xl w-full max-h-[85vh] flex flex-col overflow-hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-[#e0dbd6] rounded-full mx-auto mt-3 mb-0" />
              <div className="overflow-y-auto flex-1 p-4">
                <div
                  className={`${darkMode ? DARK.bgCardAlt : "bg-[#fff5f5]"} rounded-2xl p-5`}
                >
                  <div className="flex flex-col items-center mb-4">
                    <img
                      src="/Bruscles/assets/tajikarao.png"
                      className="w-24 mb-3"
                      alt="Ame-no-Tajikarao"
                    />
                    <div className="text-[18px] font-bold text-[#e87878] mb-1">
                      Ame-no-Tajikarao
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-[1px] text-[#f5b8b8]">
                      God of Strength & Athletics
                    </div>
                  </div>
                  <div
                    className={`h-[0.5px] ${darkMode ? DARK.divider : "bg-[#d3cfcf]"} mb-4`}
                  />
                  <p
                    className={`text-[16px] text-center leading-relaxed ${darkMode ? DARK.textSecondary : "text-[#c47878]"}`}
                  >
                    こんにちは!
                    <br /> I am Ame-no-Tajikarao, the Shinto god of strength and
                    power. I will help you track your workouts and become
                    stronger! One day, you too will be ready to move your own
                    boulder like I did.
                  </p>
                  <p
                    className={`text-[16px] mt-6 text-center leading-relaxed ${darkMode ? DARK.textSecondary : "text-[#c47878]"}`}
                  >
                    This is my Story
                  </p>
                  <p
                    className={`text-[16px] mt-6 text-center leading-relaxed ${darkMode ? DARK.textSecondary : "text-[#c47878]"}`}
                  >
                    One day Susanoo, the Shinto god of storms and the sea, went
                    on a destructive rampage.
                    <img
                      src="/Bruscles/assets/story1.png"
                      className="w-60 m-3 mx-auto rounded-3xl"
                      alt="story1"
                    />
                  </p>
                  <p
                    className={`text-[16px] mt-6 text-center leading-relaxed ${darkMode ? DARK.textSecondary : "text-[#c47878]"}`}
                  >
                    Heartbroken by her brother's actions, Amaterasu, the Shinto
                    goddess of the sun, hid herself in a cave, plunging the
                    world into darkness.
                    <img
                      src="/Bruscles/assets/story2.png"
                      className="w-64 m-3 mx-auto rounded-3xl"
                      alt="story2"
                    />
                  </p>
                  <p
                    className={`text-[16px] mt-6 text-center leading-relaxed ${darkMode ? DARK.textSecondary : "text-[#c47878]"}`}
                  >
                    Millions of gods gathered outside to come up with a plan.
                    Realising they couldn't force her out..
                    <img
                      src="/Bruscles/assets/story3.png"
                      className="w-64 m-3 mx-auto rounded-3xl"
                      alt="story3"
                    />
                  </p>
                  <p
                    className={`text-[16px] mt-6 text-center leading-relaxed ${darkMode ? DARK.textSecondary : "text-[#c47878]"}`}
                  >
                    They threw a wild party with music, dancing, and a mirror to
                    bait her curiosity, hoping to lure her out of the cave.
                    <img
                      src="/Bruscles/assets/story4.png"
                      className="w-64 m-3 mx-auto rounded-3xl"
                      alt="story4"
                    />
                  </p>
                  <p
                    className={`text-[16px] mt-6 text-center leading-relaxed ${darkMode ? DARK.textSecondary : "text-[#c47878]"}`}
                  >
                    When all else failed, Ame-no-Tajikarao, the god of physical
                    strength, unleashed his unmatched power. With a mighty
                    heave, he wrenched the boulder away from the cave's entrance
                    and freed Amaterasu, instantly restoring radiant light to
                    the world once again.
                    <img
                      src="/Bruscles/assets/story5.png"
                      className="w-64 m-3 mx-auto rounded-3xl"
                      alt="story5"
                    />
                  </p>
                </div>
              </div>
              <div className="p-4 pt-2">
                <div
                  className={`text-[11px] text-center uppercase tracking-[0.5px] mb-3 ${darkMode ? DARK.textFaint : "text-[#ccc]"}`}
                >
                  Taji Trainer 力 Made by Bman
                </div>
                <button
                  onClick={() => setShowLogoModal(false)}
                  className="w-full bg-[#e87878] border-none rounded-2xl py-4 text-white text-[16px] font-bold cursor-pointer"
                >
                  Back to training
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Bottom Bar */}
        {view === "log" && !showLogoModal && (
          <div
            className={`fixed bottom-0 left-0 right-0 z-[45] ${isBlocked ? "pointer-events-none" : ""} ${darkMode ? `${DARK.bgCard} ${DARK.borderCard}` : "bg-white border-[#E4E7EF]"} border-t`}
          >
            <div className="max-w-[680px] mx-auto px-3 pt-2 pb-6">
              <div
                data-name="Bottom-Exercise-Selector"
                className={
                  showExerciseSelectModal
                    ? "hidden"
                    : "mb-2 flex flex-col gap-2"
                }
              >
                <button
                  onClick={() => {
                    if (canAddExercise) {
                      // All exercises filled — add new slot and open modal for it
                      const newIdx = activeEntries.length;
                      addExercise();
                      setTimeout(() => {
                        setSelectingExerciseIdx(newIdx);
                        setExerciseSearchQuery("");
                        setShowExerciseSelectModal(true);
                      }, 0);
                    } else {
                      // There's an empty slot — open modal for it
                      setSelectingExerciseIdx(bottomExerciseIdx);
                      setExerciseSearchQuery("");
                      setShowExerciseSelectModal(true);
                    }
                  }}
                  className={`w-full py-3 rounded-xl border-none ${c.bg} ${c.text} text-[16px] font-bold cursor-pointer transition-all duration-200 flex items-center justify-center gap-2`}
                >
                  + Add Workout
                </button>
              </div>

              <div className="flex gap-1.5">
                {TABS.map((tab) => {
                  const tabC = COLORS[tab];
                  const hasSelectedExercise = entries[tab]?.some(
                    (entry) => entry.exercise,
                  );
                  return (
                    <button
                      key={tab}
                      onClick={() => switchTab(tab)}
                      className={`flex-1 py-2.5 px-1 rounded-xl border-2 cursor-pointer font-bold text-[13px] transition-all duration-200 ${
                        activeTab === tab
                          ? `${tabC.borderAccent} ${tabC.bg} ${tabC.text}`
                          : hasSelectedExercise
                            ? `${tabC.border} ${tabC.bg} ${tabC.text}`
                            : darkMode
                              ? `border-transparent ${DARK.bgTabInactive} ${DARK.textMuted}`
                              : "border-transparent bg-[#ECEEF4] text-[#999]"
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
