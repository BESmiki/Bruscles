import { DEFAULT_CATEGORY_LABELS, getCategoryLabels } from "./categoryLabels.js";

const CATEGORIES = Object.keys(DEFAULT_CATEGORY_LABELS);

function readExerciseNames(names) {
  if (names === undefined) return [];
  if (!Array.isArray(names) || names.some((name) => typeof name !== "string" || !name.trim())) {
    throw new Error("Exercise lists must contain exercise names.");
  }
  return [...new Set(names.map((name) => name.trim()))];
}

function readExerciseLists(lists) {
  if (lists !== undefined && (!lists || typeof lists !== "object" || Array.isArray(lists))) {
    throw new Error("Exercise lists must be grouped by category.");
  }
  return Object.fromEntries(CATEGORIES.map((category) => [category, readExerciseNames(lists?.[category])]));
}

function readHistory(history) {
  if (!Array.isArray(history)) throw new Error("Workout history must be a list.");
  for (const session of history) {
    if (!session || !["string", "number"].includes(typeof session.id) ||
        typeof session.date !== "string" || !Number.isFinite(Date.parse(session.date)) ||
        !session.data || typeof session.data !== "object" || Array.isArray(session.data)) {
      throw new Error("A workout session is missing its ID, date, or exercise data.");
    }
    for (const category of CATEGORIES) {
      const exercises = session.data[category] ?? [];
      if (!Array.isArray(exercises) || exercises.some((exercise) =>
        !exercise || typeof exercise.exercise !== "string" || !exercise.exercise.trim() ||
        !Array.isArray(exercise.rows) || exercise.rows.some((row) =>
          !row || typeof row !== "object" || Array.isArray(row) ||
          ["weight", "reps"].some((field) => row[field] != null && !["string", "number"].includes(typeof row[field])),
        ),
      )) {
        throw new Error("A workout contains invalid exercise data.");
      }
    }
  }
  return history;
}

export function persistWorkoutBackup(state, storage) {
  const values = {
    workout_history: JSON.stringify(state.history),
    custom_exercises: JSON.stringify(state.customExercises),
    deleted_exercises: JSON.stringify(state.deletedExercises),
    category_labels: JSON.stringify(state.categoryLabels),
  };
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, storage.getItem(key)]));
  const written = [];
  try {
    for (const [key, value] of Object.entries(values)) {
      storage.setItem(key, value);
      written.push(key);
    }
  } catch {
    let rollbackFailed = false;
    for (const key of written.reverse()) {
      try {
        if (previous[key] === null) storage.removeItem(key);
        else storage.setItem(key, previous[key]);
      } catch {
        rollbackFailed = true;
      }
    }
    throw new Error(rollbackFailed
      ? "The device could not save the backup or restore all previous data. Keep your backup file and try again."
      : "The device could not save the backup. Your existing data has been kept.");
  }
}

export function createWorkoutBackup(state, defaultExercises) {
  const customExercises = readExerciseLists(state.customExercises);
  const deletedExercises = readExerciseLists(state.deletedExercises);
  const exercises = Object.fromEntries(CATEGORIES.map((category) => [
    category,
    [...new Set([
      ...(defaultExercises[category] || []),
      ...customExercises[category],
      ...state.history.flatMap((session) => (session.data[category] || []).map((entry) => entry.exercise)),
    ])],
  ]));
  return {
    history: state.history,
    categoryLabels: getCategoryLabels(state.categoryLabels),
    exercises,
    customExercises,
    deletedExercises,
  };
}

export function mergeWorkoutBackup(value, current, defaultExercises) {
  const backup = Array.isArray(value) ? { history: value } : value;
  if (!backup || typeof backup !== "object") throw new Error("Choose a workout backup file.");
  const importedHistory = readHistory(backup.history ?? []);
  const importedCustom = readExerciseLists(backup.customExercises);
  const importedDeleted = readExerciseLists(backup.deletedExercises);
  const importedExercises = readExerciseLists(backup.exercises);
  const sessionsById = new Map();
  for (const session of [...importedHistory, ...current.history]) {
    if (!sessionsById.has(session.id)) sessionsById.set(session.id, session);
  }
  const history = [...sessionsById.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const customExercises = {};
  const deletedExercises = {};
  for (const category of CATEGORIES) {
    const knownDefaults = new Set(defaultExercises[category] || []);
    const historicalNames = history.flatMap((session) => (session.data[category] || []).map((entry) => entry.exercise));
    customExercises[category] = [...new Set([
      ...importedCustom[category],
      ...(current.customExercises[category] || []),
      ...[...importedExercises[category], ...historicalNames].filter((name) => !knownDefaults.has(name)),
    ])];
    deletedExercises[category] = [...new Set([
      ...importedDeleted[category],
      ...(current.deletedExercises[category] || []),
    ])];
  }
  return {
    history,
    categoryLabels: getCategoryLabels(backup.categoryLabels, current.categoryLabels),
    customExercises,
    deletedExercises,
    importedSessionCount: importedHistory.length,
  };
}
