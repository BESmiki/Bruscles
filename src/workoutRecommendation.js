export function compareWorkoutRecommendations(next, previous) {
  if (!next) return 0;
  if (!previous) return 1;
  return next.weight - previous.weight || next.average - previous.average;
}

export function getWorkoutRecommendation(history, exercise, category) {
  if (category === "Cardio" || !exercise) return null;

  let recommendation = null;
  // Replay saves in order so a completed target advances once, rather than on every render.
  const sessions = [...history].reverse().sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  for (const session of sessions) {
    const rows = (session.data?.[category] || [])
      .filter((entry) => entry.exercise === exercise)
      .flatMap((entry) => entry.rows || [])
      .map((row) => ({
        weight: row.weight === "" || row.weight == null ? 0 : Number(row.weight),
        reps: Number(row.reps),
      }))
      .filter((row) => Number.isFinite(row.weight) && row.weight >= 0 && Number.isFinite(row.reps) && row.reps >= 1);
    if (!rows.length) continue;

    const weight = Math.max(...rows.map((row) => row.weight));
    const heaviestRows = rows.filter((row) => row.weight === weight);
    const average = heaviestRows.reduce((total, row) => total + row.reps, 0) / heaviestRows.length;
    const candidate = { weight, sets: heaviestRows.length, reps: Math.ceil(average), average, rows: heaviestRows, date: session.date };
    // Equal-rep sets establish a completed baseline at a new weight immediately.
    const completedNewWeight = (!recommendation || weight > recommendation.weight) &&
      heaviestRows.every((row) => row.reps === candidate.reps);
    const completedTarget = recommendation &&
      weight === recommendation.weight &&
      heaviestRows.length === recommendation.sets &&
      heaviestRows.every((row) => row.reps === recommendation.reps);
    const nextTargetReps = completedNewWeight ? candidate.reps + 1 :
      completedTarget ? recommendation.reps + 1 : null;

    if (
      compareWorkoutRecommendations(candidate, recommendation) > 0 ||
      (recommendation && compareWorkoutRecommendations(candidate, recommendation) === 0 && new Date(session.date) < new Date(recommendation.date))
    ) {
      recommendation = candidate;
    }
    if (nextTargetReps !== null) {
      recommendation = { ...recommendation, reps: Math.max(recommendation.reps, nextTargetReps) };
    }
  }

  return recommendation;
}

export function getRecommendedRows(recommendation) {
  if (!recommendation) return [];
  return Array.from({ length: recommendation.sets }, () => ({
    weight: String(recommendation.weight),
    reps: String(recommendation.reps),
    complete: false,
  }));
}

export function getWorkoutAverageRecords(sessionData, previousHistory) {
  const records = [];
  for (const [category, entries] of Object.entries(sessionData)) {
    if (category === "Cardio") continue;
    for (const exercise of new Set(entries.map((entry) => entry.exercise).filter(Boolean))) {
      const recommendation = getWorkoutRecommendation([{ data: sessionData }], exercise, category);
      const previousRecommendation = getWorkoutRecommendation(previousHistory, exercise, category);
      if (compareWorkoutRecommendations(recommendation, previousRecommendation) > 0) {
        records.push({ exercise, category, recommendation, previousRecommendation });
      }
    }
  }
  return records;
}
