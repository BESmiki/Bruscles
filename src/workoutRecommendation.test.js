import test from "node:test";
import assert from "node:assert/strict";
import { getWorkoutRecommendation, getRecommendedRows, getWorkoutAverageRecords } from "./workoutRecommendation.js";

const session = (date, rows, exercise = "Leg Press", category = "Legs") => ({
  date,
  data: { [category]: [{ exercise, rows: rows.map(([weight, reps]) => ({ weight: String(weight), reps: String(reps), complete: true })) }] },
});
const recommend = (history) => getWorkoutRecommendation(history, "Leg Press", "Legs");

test("rounds the average up and prefills every set with that whole number without changing saved history", () => {
  const history = [session("2026-10-01", [[40, 8], [40, 7], [40, 10]])];
  const original = JSON.stringify(history);
  const recommendation = recommend(history);
  assert.equal(recommendation.reps, 9);
  assert.equal(recommendation.sets, 3);
  const rows = getRecommendedRows(recommendation);
  assert.deepEqual(rows, Array.from({ length: 3 }, () => ({ weight: "40", reps: "9", complete: false })));
  rows[0].reps = "99";
  assert.equal(rows[1].reps, "9");
  assert.equal(JSON.stringify(history), original);
});

test("a lower recent average never replaces a historical recommendation", () => {
  const history = [session("2026-10-10", [[40, 8], [40, 9]]), session("2026-10-01", [[40, 10], [40, 11], [40, 12]])];
  assert.deepEqual(getRecommendedRows(recommend(history)), Array.from({ length: 3 }, () => ({ weight: "40", reps: "11", complete: false })));
});

test("heavier weight always wins, even with fewer sets and reps", () => {
  const history = [session("2026-10-10", [[30, 30], [30, 30], [30, 30]]), session("2026-10-01", [[40, 1]])];
  assert.equal(recommend(history).weight, 40);
  assert.equal(recommend(history).reps, 1);
  assert.equal(recommend(history).sets, 1);
});

test("at the same weight, compares full averages even when both round up to the same displayed reps", () => {
  const history = [session("2026-10-10", [[40, 11], [40, 12]]), session("2026-10-01", [[40, 11], [40, 11], [40, 12]])];
  assert.equal(recommend(history).date, "2026-10-10");
  assert.equal(recommend(history).reps, 12);
  assert.equal(recommend(history).sets, 2);
});

test("equal weight and average retain the earlier workout's set count regardless of history order", () => {
  const history = [session("2026-10-10", [[40, 11]]), session("2026-10-01", [[40, 10], [40, 11], [40, 12]])];
  assert.equal(recommend(history).sets, 3);
  assert.deepEqual(recommend(history), recommend([...history].reverse()));
});

test("mixed weights use only the heaviest sets and combine duplicate exercise entries in a workout", () => {
  const workout = session("2026-10-01", [[20, 20], [40, 10]]);
  workout.data.Legs.push({ exercise: "Leg Press", rows: [{ weight: "40", reps: "12" }] });
  const recommendation = recommend([workout]);
  assert.equal(recommendation.weight, 40);
  assert.equal(recommendation.reps, 11);
  assert.equal(recommendation.sets, 2);
});

test("missing reps and invalid sets are excluded; no history and cardio have no strength recommendation", () => {
  assert.equal(recommend([]), null);
  assert.equal(recommend([session("2026-10-01", [[40, ""], [40, 0], [40, "bad"], [-1, 10]])]), null);
  assert.equal(getWorkoutRecommendation([session("2026-10-01", [[5, 20]], "Running", "Cardio")], "Running", "Cardio"), null);
  assert.equal(recommend([session("2026-10-01", [[40, 10]], "Back Squats")]), null);
  assert.deepEqual(getRecommendedRows(null), []);
});

test("bodyweight sets can be recommended at zero kg", () => {
  assert.equal(recommend([session("2026-10-01", [["", 8], [0, 10]])]).reps, 9);
});

test("one extra rep in a non-best set wins and raises the next target even when the best single set stays unchanged", () => {
  const history = [session("2026-10-01", [[40, 10], [40, 11], [40, 12]])];
  const next = session("2026-10-10", [[40, 11], [40, 11], [40, 12]]);
  const records = getWorkoutAverageRecords(next.data, history);
  assert.equal(records.length, 1);
  assert.equal(records[0].previousRecommendation.average, 11);
  assert.equal(records[0].recommendation.average, 34 / 3);
  assert.equal(records[0].recommendation.reps, 12);
  assert.deepEqual(getRecommendedRows(recommend([next, ...history])).map((row) => row.reps), ["12", "12", "12"]);
});

test("a one-rep progression from 10, 10, 10 to 10, 10, 11 recommends and fills three sets of 11", () => {
  const previous = session("2026-10-01", [[40, 10], [40, 10], [40, 10]]);
  const next = session("2026-10-12", [[40, 10], [40, 10], [40, 11]]);
  assert.equal(recommend([previous]).reps, 10);
  const recommendation = recommend([next, previous]);
  assert.equal(recommendation.average, 31 / 3);
  assert.equal(recommendation.reps, 11);
  assert.deepEqual(getRecommendedRows(recommendation), Array.from({ length: 3 }, () => ({ weight: "40", reps: "11", complete: false })));
  assert.equal(getWorkoutAverageRecords(next.data, [previous]).length, 1);
});

test("Leg Press sets of 17, 20, 17 reps prefill as three sets of 40kg and 18 reps", () => {
  const history = [session("2026-10-12", [[40, 17], [40, 20], [40, 17]])];
  const recommendation = recommend(history);
  assert.equal(recommendation.reps, 18);
  assert.deepEqual(getRecommendedRows(recommendation), Array.from({ length: 3 }, () => ({ weight: "40", reps: "18", complete: false })));
  assert.equal(getWorkoutAverageRecords(session("2026-10-12", [[40, 19], [40, 18], [40, 18]]).data, history).length, 1);
});

test("equal and lower averages do not count as average records", () => {
  const history = [session("2026-10-01", [[40, 10], [40, 11], [40, 12]])];
  assert.deepEqual(getWorkoutAverageRecords(session("2026-10-10", [[40, 11], [40, 11], [40, 11]]).data, history), []);
  assert.deepEqual(getWorkoutAverageRecords(session("2026-10-10", [[40, 10], [40, 10], [40, 12]]).data, history), []);
});

test("average records always prioritise weight, including the first recorded workout", () => {
  const history = [session("2026-10-01", [[40, 10], [40, 11], [40, 12]])];
  assert.deepEqual(getWorkoutAverageRecords(session("2026-10-10", [[30, 20]]).data, history), []);
  assert.equal(getWorkoutAverageRecords(session("2026-10-10", [[41, 1]]).data, history).length, 1);
  assert.equal(getWorkoutAverageRecords(history[0].data, []).length, 1);
  assert.deepEqual(getWorkoutAverageRecords(session("2026-10-10", [[5, 20]], "Running", "Cardio").data, []), []);
});

test("saving all recommended sets advances the displayed recommendation and autofill by one rep", () => {
  const previous = session("2026-10-01", [[40, 10], [40, 10], [40, 11]]);
  const completed = session("2026-10-02", [[40, 11], [40, 11], [40, 11]]);
  const history = [completed, previous];
  const original = JSON.stringify(history);
  assert.equal(recommend([previous]).reps, 11);
  assert.equal(recommend(history).average, 11);
  assert.equal(recommend(history).reps, 12);
  assert.deepEqual(getRecommendedRows(recommend(history)), Array.from({ length: 3 }, () => ({ weight: "40", reps: "12", complete: false })));
  assert.deepEqual(recommend(history), recommend(history));
  assert.equal(JSON.stringify(history), original);
});

test("saving the same older target again does not advance a target that is already higher", () => {
  const previous = session("2026-10-01", [[40, 10], [40, 10], [40, 11]]);
  const completed = session("2026-10-02", [[40, 11], [40, 11], [40, 11]]);
  const repeated = session("2026-10-03", [[40, 11], [40, 11], [40, 11]]);
  assert.equal(recommend([repeated, completed, previous]).reps, 12);
  const nextCompletion = session("2026-10-04", [[40, 12], [40, 12], [40, 12]]);
  assert.equal(recommend([nextCompletion, repeated, completed, previous]).reps, 13);
});

test("completion requires matching weight, set count and reps in every set", () => {
  const previous = session("2026-10-01", [[40, 10], [40, 10], [40, 11]]);
  for (const rows of [
    [[40, 11], [40, 11], [40, 10]],
    [[40, 11], [40, 11]],
    [[30, 11], [30, 11], [30, 11]],
    [[40, 12], [40, 11], [40, 10]],
  ]) {
    assert.equal(recommend([session("2026-10-02", rows), previous]).reps, 11);
  }
});

test("partial progression rounds up without receiving an additional completion increment", () => {
  const previous = session("2026-10-01", [[40, 10], [40, 10], [40, 10]]);
  const progressed = session("2026-10-02", [[40, 10], [40, 10], [40, 11]]);
  assert.equal(recommend([progressed, previous]).reps, 11);
});

test("target completion works after importing history, with same-time saves and above twenty reps", () => {
  const previous = session("2026-10-01", [[40, 20], [40, 20], [40, 20]]);
  const completed = session("2026-10-01", [[40, 20], [40, 20], [40, 20]]);
  const restored = JSON.parse(JSON.stringify([completed, previous]));
  assert.equal(recommend(restored).reps, 21);
  assert.equal(recommend(restored).average, 20);
  assert.equal(getRecommendedRows(recommend(restored))[0].reps, "21");
  assert.deepEqual(getWorkoutAverageRecords(completed.data, [previous]), []);
});

test("a new heavier weight keeps priority over an advanced target at a lighter weight", () => {
  const previous = session("2026-10-01", [[40, 10], [40, 10], [40, 11]]);
  const completed = session("2026-10-02", [[40, 11], [40, 11], [40, 11]]);
  const heavier = session("2026-10-03", [[41, 1]]);
  const recommendation = recommend([heavier, completed, previous]);
  assert.equal(recommendation.weight, 41);
  assert.equal(recommendation.reps, 1);
  assert.equal(recommendation.sets, 1);
});
