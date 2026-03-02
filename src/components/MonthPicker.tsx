import React from "react";
import { monthLabel } from "../lib/utils";

type Props = {
  monthKey: string;
  months: string[];
  onChange: (m: string) => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function MonthPicker({ monthKey, months, onChange, onPrev, onNext }: Props) {
  return (
    <div className="month-picker">
      <button onClick={onPrev} title="Mês anterior">
        <i className="fa-solid fa-chevron-left" />
      </button>
      <select value={monthKey} onChange={(e) => onChange(e.target.value)}>
        {months.map(m => (
          <option key={m} value={m}>{monthLabel(m)}</option>
        ))}
      </select>
      <button onClick={onNext} title="Próximo mês">
        <i className="fa-solid fa-chevron-right" />
      </button>
    </div>
  );
}
