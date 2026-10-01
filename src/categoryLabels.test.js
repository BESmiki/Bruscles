import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CATEGORY_LABELS, getCategoryLabels, validateCategoryLabels } from "./categoryLabels.js";

test("older backups preserve the device's existing names", () => {
  const existing = { Push: "Upper A", Pull: "Upper B", Legs: "Lower", Cardio: "Endurance" };
  assert.deepEqual(getCategoryLabels(undefined, existing), existing);
});

test("renaming keeps all four original data keys and trims labels", () => {
  const names = getCategoryLabels({ Push: " Upper A ", Pull: "Upper B", Legs: "Lower", Cardio: "Endurance", Extra: "Other" });
  assert.deepEqual(names, { Push: "Upper A", Pull: "Upper B", Legs: "Lower", Cardio: "Endurance" });
});

test("invalid persisted preferences safely fall back to category defaults", () => {
  for (const value of [null, "bad data", { Push: 12 }, { Push: " " }, { Push: "a name that is too long" }, { Push: "pull" }]) {
    assert.deepEqual(getCategoryLabels(value), DEFAULT_CATEGORY_LABELS);
  }
});

test("partial imports merge with existing labels", () => {
  const existing = { ...DEFAULT_CATEGORY_LABELS, Pull: "Back" };
  assert.deepEqual(getCategoryLabels({ Cardio: "Endurance" }, existing), { ...existing, Cardio: "Endurance" });
});

test("blank, duplicate, and overlong names are rejected before saving", () => {
  assert.match(validateCategoryLabels({ ...DEFAULT_CATEGORY_LABELS, Push: " " }), /every category/);
  assert.match(validateCategoryLabels({ ...DEFAULT_CATEGORY_LABELS, Push: " PULL " }), /different name/);
  assert.match(validateCategoryLabels({ ...DEFAULT_CATEGORY_LABELS, Cardio: "1234567890123" }), /12 characters/);
  assert.equal(validateCategoryLabels({ ...DEFAULT_CATEGORY_LABELS, Cardio: "123456789012" }), "");
});
