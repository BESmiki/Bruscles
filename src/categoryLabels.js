export const DEFAULT_CATEGORY_LABELS = {
  Push: "Push",
  Pull: "Pull",
  Legs: "Legs",
  Cardio: "Cardio",
};

export const MAX_CATEGORY_LABEL_LENGTH = 12;

// Labels are preferences; the original keys still identify workout data.
export function getCategoryLabels(value, fallback = DEFAULT_CATEGORY_LABELS) {
  const labels = Object.fromEntries(
    Object.keys(DEFAULT_CATEGORY_LABELS).map((category) => {
      const label = typeof value?.[category] === "string"
        ? value[category].trim()
        : "";
      return [
        category,
        label && label.length <= MAX_CATEGORY_LABEL_LENGTH
          ? label
          : fallback[category],
      ];
    }),
  );
  return validateCategoryLabels(labels) ? { ...fallback } : labels;
}

export function validateCategoryLabels(value) {
  const labels = Object.keys(DEFAULT_CATEGORY_LABELS).map(
    (category) => typeof value?.[category] === "string" ? value[category].trim() : "",
  );
  if (labels.some((label) => !label)) return "Give every category a name.";
  if (labels.some((label) => label.length > MAX_CATEGORY_LABEL_LENGTH)) {
    return `Keep each name to ${MAX_CATEGORY_LABEL_LENGTH} characters or fewer.`;
  }
  if (new Set(labels.map((label) => label.toLowerCase())).size !== labels.length) {
    return "Use a different name for each category.";
  }
  return "";
}
