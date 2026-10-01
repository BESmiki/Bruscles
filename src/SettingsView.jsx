import { useEffect, useState } from "react";
import StepperControl from "./StepperControl";
import { DEFAULT_STOPWATCH_DELAY, MIN_STOPWATCH_DELAY, MAX_STOPWATCH_DELAY } from "./stopwatchSettings";
import {
  DEFAULT_CATEGORY_LABELS,
  MAX_CATEGORY_LABEL_LENGTH,
  validateCategoryLabels,
} from "./categoryLabels";

const CATEGORY_INPUT_LABELS = {
  Push: "Red",
  Pull: "Blue",
  Legs: "Green",
  Cardio: "Yellow",
};

export default function SettingsView({
  categoryLabels,
  categoryColors,
  onSaveCategoryLabels,
  stopwatchDelay,
  onSaveStopwatchDelay,
  darkMode,
  onToggleDarkMode,
  onDownloadData,
  onUploadData,
  onInstallApp,
  isAppInstalled,
  installMessage,
  version,
  siteUrl,
  siteQrUrl,
}) {
  const [draftLabels, setDraftLabels] = useState(categoryLabels);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [draftDelay, setDraftDelay] = useState(stopwatchDelay);
  const [delayMessage, setDelayMessage] = useState("");
  const [delayHasError, setDelayHasError] = useState(false);

  useEffect(() => setDraftLabels(categoryLabels), [categoryLabels]);
  useEffect(() => setDraftDelay(stopwatchDelay), [stopwatchDelay]);

  useEffect(() => {
    if (!shareMessage) return;
    const timeout = window.setTimeout(() => setShareMessage(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [shareMessage]);

  const shareAppLink = async () => {
    setShareMessage("");
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Taji Tracker",
          text: "Track your workouts with Taji Tracker.",
          url: siteUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(siteUrl);
      setShareMessage("Link copied");
    } catch (error) {
      if (error?.name !== "AbortError") setShareMessage("Could not share");
    }
  };

  const saveNames = (labels) => {
    const error = validateCategoryLabels(labels) || onSaveCategoryLabels(labels);
    setHasError(Boolean(error));
    setMessage(error || "Category names saved.");
  };
  const text = darkMode ? "text-[#f0f0f0]" : "text-[#333]";
  const muted = darkMode ? "text-[#aaaaaa]" : "text-[#777]";
  const divider = darkMode ? "border-[#2a2a2a]" : "border-[#e0dbd6]";
  const secondaryButton = `min-h-[44px] rounded-xl px-4 py-3 text-sm font-bold transition-colors ${darkMode ? "bg-[#1e1e1e] text-[#f0f0f0] hover:bg-[#292929]" : "bg-[#eceef4] text-[#666] hover:bg-[#e1e4ed]"}`;

  return (
    <div data-name="Settings-View" className={`animate-fade-in ${text}`}>
      <h1 className="mb-1 text-[24px] font-black">Settings</h1>
      <p className={`mb-6 text-sm ${muted}`}>Make your tracker feel like yours.</p>

      <section aria-labelledby="category-settings-title" className={`border-b pb-6 ${divider}`}>
        <h2 id="category-settings-title" className="text-[17px] font-bold">Workout categories</h2>
        <p id="category-name-help" className={`mt-1 mb-4 text-sm ${muted}`}>
          Choose your own tab names. {MAX_CATEGORY_LABEL_LENGTH} character limit.
        </p>
        <form onSubmit={(event) => { event.preventDefault(); saveNames(draftLabels); }}>
          <div className="grid grid-cols-2 gap-3">
            {Object.keys(DEFAULT_CATEGORY_LABELS).map((category) => (
              <label key={category} className="min-w-0 text-sm font-semibold">
                {/* {CATEGORY_INPUT_LABELS[category]} */}
                <input
                  type="text"
                  aria-label={`${CATEGORY_INPUT_LABELS[category]} tab name`}
                  aria-describedby="category-name-help"
                  required
                  maxLength={MAX_CATEGORY_LABEL_LENGTH}
                  value={draftLabels[category]}
                  onChange={(event) => {
                    setDraftLabels((previous) => ({ ...previous, [category]: event.target.value }));
                    setMessage("");
                  }}
                  className={`mt-1.5 min-h-[44px] w-full rounded-xl border px-3 py-2 text-[15px] font-normal text-[#333] outline-none focus:border-[#c98c8c] focus:ring-2 focus:ring-[#c98c8c]/25 ${categoryColors[category].bg} ${categoryColors[category].border}`}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" className="min-h-[44px] flex-1 rounded-xl bg-[#c98c8c] px-4 py-3 text-sm font-bold text-white hover:bg-[#b77b7b]">Save names</button>
            <button type="button" onClick={() => { setDraftLabels(DEFAULT_CATEGORY_LABELS); saveNames(DEFAULT_CATEGORY_LABELS); }} className={secondaryButton}>Reset names</button>
          </div>
          <p role={hasError ? "alert" : "status"} className={`mt-3 text-sm ${hasError ? darkMode ? "text-[#ffabab]" : "text-[#a52b2b]" : muted}`}>
            {message}
          </p>
        </form>
      </section>

      <section aria-labelledby="appearance-settings-title" className={`border-b py-5 ${divider}`}>
        <h2 id="appearance-settings-title" className="mb-3 text-[17px] font-bold">Appearance</h2>
        <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 text-sm">
          Dark mode
          <span className="relative block h-[30px] w-[54px] shrink-0">
            <input
              type="checkbox"
              role="switch"
              checked={darkMode}
              onChange={onToggleDarkMode}
              className="theme-toggle-input theme-toggle-input-accessible"
            />
            <span className="theme-toggle" aria-hidden="true" />
          </span>
        </label>
      </section>

      <section aria-labelledby="stopwatch-settings-title" className={`border-b py-5 ${divider}`}>
        <h2 id="stopwatch-settings-title" className="text-[17px] font-bold">Fullscreen stopwatch</h2>
        <p className={`mt-1 mb-4 text-sm ${muted}`}>Choose how long to wait after your last interaction.</p>
        <form onSubmit={(event) => {
          event.preventDefault();
          const error = onSaveStopwatchDelay(draftDelay);
          setDelayHasError(Boolean(error));
          setDelayMessage(error || "Stopwatch delay saved.");
        }}>
          <p className="mb-2 text-sm font-semibold">Show after</p>
          <div className="flex items-center justify-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="w-[112px] shrink-0" role="group" aria-label="Fullscreen stopwatch delay">
                <StepperControl
                  label="stopwatch delay"
                  value={draftDelay}
                  min={MIN_STOPWATCH_DELAY}
                  max={MAX_STOPWATCH_DELAY}
                  darkMode={darkMode}
                  color={{ text: "text-[#c98c8c]", borderAccent: "border-[#c98c8c]" }}
                  compact
                  showLabel={false}
                  onChange={(value) => { setDraftDelay(Number(value)); setDelayMessage(""); }}
                />
              </div>
              <span className="text-sm">seconds</span>
            </div>
            <button type="submit" className="min-h-[44px] shrink-0 rounded-xl bg-[#c98c8c] px-3 py-3 text-sm font-bold text-white hover:bg-[#b77b7b]">Save delay</button>
          </div>
          <p className={`mt-2 text-sm ${muted}`}>Default: {DEFAULT_STOPWATCH_DELAY} seconds</p>
          {delayMessage && <p role={delayHasError ? "alert" : "status"} className={`mt-3 text-sm ${delayHasError ? darkMode ? "text-[#ffabab]" : "text-[#a52b2b]" : muted}`}>{delayMessage}</p>}
        </form>
      </section>

      <section aria-labelledby="data-settings-title" className={`border-b py-5 ${divider}`}>
        <h2 id="data-settings-title" className="text-[17px] font-bold">Your data</h2>
        <p className={`mt-1 mb-3 text-sm ${muted}`}>Back up your workouts, exercises, and category names.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onDownloadData} className={`flex-1 ${secondaryButton}`}>Download backup</button>
          <button type="button" onClick={onUploadData} className={`flex-1 ${secondaryButton}`}>Import backup</button>
        </div>
      </section>

      <section aria-labelledby="app-settings-title" className="py-5">
        <h2 id="app-settings-title" className="mb-3 text-[17px] font-bold">Install to your device</h2>
        <button type="button" onClick={onInstallApp} disabled={isAppInstalled} className={`${secondaryButton} disabled:opacity-60`}>
          {isAppInstalled ? "App installed" : "Install app to home screen"}
        </button>
        {installMessage && <p role="status" className={`mt-3 text-sm ${muted}`}>{installMessage}</p>}
        <p className={`mt-4 text-xs ${muted}`}>Version {version}</p>
      </section>

      <section aria-label="Share Taji Tracker" className={`border-t pt-5 ${divider}`}>
        <div className={`mx-auto flex w-fit flex-col items-center rounded-2xl border p-4 ${darkMode ? "border-[#2a2a2a] bg-[#111]" : "border-[#e0dbd6] bg-white"}`}>
          <a href={siteUrl} target="_blank" rel="noreferrer">
            <img src={siteQrUrl} alt="Taji Tracker QR code" className="h-[180px] w-[180px] rounded-xl" />
          </a>
          <p className={`mt-3 text-center text-[12px] font-bold ${muted}`}>Scan to share Taji Tracker</p>
          <button type="button" onClick={shareAppLink} className={`mt-3 min-h-[44px] rounded-xl px-5 py-2.5 text-[13px] font-black transition-colors ${darkMode ? "bg-white text-black" : "bg-[#e87878] text-white"}`}>
            Share app
          </button>
          {shareMessage && <p role="status" className={`mt-2 text-center text-[12px] font-bold ${muted}`}>{shareMessage}</p>}
        </div>
      </section>
    </div>
  );
}
