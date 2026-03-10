import React, { useRef, useEffect, useMemo } from "react";

type Props = {
  monthKey: string;
  months: string[];
  onChange: (m: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
};

const ABBR_MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

export default function MonthPicker({ monthKey, months, onChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayMonths = useMemo(() => {
    // We want the picker to feel "infinite". So we will generate a larger range of months
    // relative to the active monthKey instead of just what is in `months`.
    const allKeys = [...months, monthKey];
    const years = allKeys.map(k => parseInt(k.substring(0, 4), 10));
    // Provide a long tail so it feels infinite
    const minYear = Math.min(...years) - 5;
    const maxYear = Math.max(...years) + 5;

    const list: string[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      for (let m = 1; m <= 12; m++) {
        list.push(`${y}-${String(m).padStart(2, '0')}`);
      }
    }
    return list;
  }, [months, monthKey]);

  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('.month-pill.active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [monthKey]);

  const handlePrev = () => {
    const currentIndex = displayMonths.indexOf(monthKey);
    if (currentIndex > 0) {
      onChange(displayMonths[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    const currentIndex = displayMonths.indexOf(monthKey);
    if (currentIndex >= 0 && currentIndex < displayMonths.length - 1) {
      onChange(displayMonths[currentIndex + 1]);
    }
  };

  return (
    <div className="month-picker-container-outer">
      <button
        className="month-scroll-btn visible"
        onClick={handlePrev}
        title="Mês anterior"
      >
        <i className="fa-solid fa-chevron-left" />
      </button>

      <div className="month-picker-container" ref={scrollRef}>
        {displayMonths.map(m => {
          const [year, monthStr] = m.split("-");
          const monthIndex = parseInt(monthStr, 10) - 1;
          const abbr = ABBR_MONTHS[monthIndex];
          const isActive = m === monthKey;

          return (
            <button
              key={m}
              className={`month-pill ${isActive ? 'active' : ''}`}
              onClick={() => onChange(m)}
            >
              <span className="month-pill-year">{year}</span>
              <span className="month-pill-abbr">{abbr}</span>
            </button>
          );
        })}
      </div>

      <button
        className="month-scroll-btn visible"
        onClick={handleNext}
        title="Próximo mês"
      >
        <i className="fa-solid fa-chevron-right" />
      </button>
    </div>
  );
}
