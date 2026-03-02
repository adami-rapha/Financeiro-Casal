import React, { useState, useRef, useEffect } from "react";

interface Option {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    options: Option[];
    onChange: (val: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export default function CustomSelect({ value, options, onChange, placeholder, disabled }: SelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selectedOpt = options.find(o => o.value === value);
    const displayLabel = selectedOpt ? selectedOpt.label : (placeholder || "Selecione...");

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="custom-select-wrapper" ref={ref}>
            <div
                className={`custom-select-trigger ${disabled ? "disabled" : ""} ${open ? "open" : ""}`}
                onClick={() => !disabled && setOpen(!open)}
            >
                <span>{displayLabel}</span>
                <i className="fa-solid fa-chevron-down custom-select-icon" />
            </div>

            {open && (
                <div className="custom-select-dropdown">
                    {options.map(opt => (
                        <div
                            key={opt.value}
                            className={`custom-select-option ${opt.value === value ? "selected" : ""}`}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                        >
                            {opt.label}
                            {opt.value === value && <i className="fa-solid fa-check" style={{ marginLeft: "auto", fontSize: 12, color: "var(--primary)" }} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
