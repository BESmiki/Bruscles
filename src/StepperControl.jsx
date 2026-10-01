import { useEffect, useRef } from "react";

export default function StepperControl({
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
  compact = false,
  showLabel = true,
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

  const arrowClass = disabled
    ? darkMode
      ? "border-[#555]"
      : "border-[#aaa]"
    : color.borderAccent;

  return (
    <div className="min-w-0 flex-1">
      {showLabel && <div
        className={`mb-2 text-center text-[12px] font-bold ${disabled ? (darkMode ? "text-[#555]" : "text-[#aaa]") : color.text}`}
      >
        {label}
      </div>}
      <div
        className={`flex ${compact ? "h-[88px]" : "h-[108px]"} items-center rounded-2xl border px-3 ${
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

