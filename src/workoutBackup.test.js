import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CATEGORY_LABELS } from "./categoryLabels.js";
import { createWorkoutBackup, mergeWorkoutBackup, persistWorkoutBackup } from "./workoutBackup.js";

const defaults = { Push: ["Shoulder Press"], Pull: ["Pull Ups"], Legs: ["Back Squats"], Cardio: ["Running"] };
const emptyLists = () => ({ Push: [], Pull: [], Legs: [], Cardio: [] });
const emptyState = () => ({ history: [], customExercises: emptyLists(), deletedExercises: emptyLists(), categoryLabels: { ...DEFAULT_CATEGORY_LABELS } });
const session = (id, date, exercise = "Shoulder Press") => ({
  id,
  date,
  data: { Push: [{ exercise, rows: [{ weight: "20", reps: "8" }] }], Pull: [], Legs: [], Cardio: [] },
});

test("a downloaded JSON backup restores category names and even unlogged exercises on a fresh device", () => {
  const source = emptyState();
  source.categoryLabels = { Push: "Upper A", Pull: "Upper B", Legs: "Lower", Cardio: "Endurance" };
  source.customExercises.Push = ["Custom Bench"];
  source.customExercises.Cardio = ["Rowing"];
  source.deletedExercises.Legs = ["Back Squats"];
  source.history = [session(1, "2026-09-30T10:00:00.000Z")];
  const downloaded = JSON.parse(JSON.stringify(createWorkoutBackup(source, defaults)));

  assert.deepEqual(downloaded.exercises.Push, ["Shoulder Press", "Custom Bench"]);
  assert.deepEqual(downloaded.exercises.Cardio, ["Running", "Rowing"]);
  assert.deepEqual(downloaded.categoryLabels, source.categoryLabels);
  const restored = mergeWorkoutBackup(downloaded, emptyState(), defaults);
  assert.deepEqual(restored.categoryLabels, source.categoryLabels);
  assert.deepEqual(restored.customExercises, source.customExercises);
  assert.deepEqual(restored.deletedExercises, source.deletedExercises);
  assert.deepEqual(restored.history, source.history);
});

test("a backup retains built-in names when the receiving app's defaults have changed", () => {
  const downloaded = createWorkoutBackup(emptyState(), defaults);
  const newDefaults = { ...defaults, Push: ["Bench Press"], Cardio: ["Cycling"] };
  const restored = mergeWorkoutBackup(downloaded, emptyState(), newDefaults);
  assert.deepEqual(restored.customExercises.Push, ["Shoulder Press"]);
  assert.deepEqual(restored.customExercises.Cardio, ["Running"]);
});

test("older object backups keep current category names and merge custom exercises without duplicates", () => {
  const current = emptyState();
  current.categoryLabels.Push = "Upper";
  current.customExercises.Push = ["Custom Bench", "Dips"];
  const restored = mergeWorkoutBackup({ history: [], customExercises: { Push: ["Custom Bench", "Incline"] } }, current, defaults);
  assert.equal(restored.categoryLabels.Push, "Upper");
  assert.deepEqual(restored.customExercises.Push, ["Custom Bench", "Incline", "Dips"]);
  assert.deepEqual(current.customExercises.Push, ["Custom Bench", "Dips"]);
});

test("history-only backups recover exercise names into the exercise picker", () => {
  const olderBackup = [session(2, "2026-09-30T10:00:00.000Z", "Old Custom Press")];
  const restored = mergeWorkoutBackup(olderBackup, emptyState(), defaults);
  assert.deepEqual(restored.customExercises.Push, ["Old Custom Press"]);
  assert.deepEqual(restored.categoryLabels, DEFAULT_CATEGORY_LABELS);
});

test("imports keep existing sessions, deduplicate IDs, and put the latest workout first", () => {
  const current = emptyState();
  const latest = session(2, "2026-10-01T10:00:00.000Z");
  current.history = [latest];
  const older = session(1, "2026-09-30T10:00:00.000Z");
  const restored = mergeWorkoutBackup({ history: [older, latest] }, current, defaults);
  assert.deepEqual(restored.history.map((workout) => workout.id), [2, 1]);
  assert.equal(current.history.length, 1);
});

test("exports include historical exercise names even when absent from custom metadata", () => {
  const current = emptyState();
  current.history = [session(1, "2026-09-30T10:00:00.000Z", "Old Custom Press")];
  assert.ok(createWorkoutBackup(current, defaults).exercises.Push.includes("Old Custom Press"));
});

test("invalid backup structures are rejected before changing the current data", () => {
  const current = emptyState();
  const original = JSON.stringify(current);
  const invalidRows = session(1, "2026-09-30T10:00:00.000Z");
  invalidRows.data.Push[0].rows[0].weight = {};
  for (const invalid of [null, { history: "wrong" }, { exercises: { Push: [123] } }, { history: [{ id: 1, date: "invalid", data: {} }] }, { history: [invalidRows] }]) {
    assert.throws(() => mergeWorkoutBackup(invalid, current, defaults));
    assert.equal(JSON.stringify(current), original);
  }
});

test("restored names and workouts are saved together for the next app launch", () => {
  const current = emptyState();
  current.categoryLabels.Push = "Upper";
  current.customExercises.Push = ["Dips"];
  const stored = new Map();
  persistWorkoutBackup(current, {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
    removeItem: (key) => stored.delete(key),
  });
  assert.deepEqual(JSON.parse(stored.get("category_labels")), current.categoryLabels);
  assert.deepEqual(JSON.parse(stored.get("custom_exercises")), current.customExercises);
  assert.deepEqual(JSON.parse(stored.get("workout_history")), current.history);
  assert.deepEqual(JSON.parse(stored.get("deleted_exercises")), current.deletedExercises);
});

test("a failed storage write rolls back the import to the previous data", () => {
  const stored = new Map([["workout_history", "old history"], ["custom_exercises", "old exercises"]]);
  const original = new Map(stored);
  assert.throws(() => persistWorkoutBackup(emptyState(), {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => {
      if (key === "category_labels") throw new Error("Storage full");
      stored.set(key, value);
    },
    removeItem: (key) => stored.delete(key),
  }), /existing data has been kept/);
  assert.deepEqual(stored, original);
});
