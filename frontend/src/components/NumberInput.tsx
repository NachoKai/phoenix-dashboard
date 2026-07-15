import { useEffect, useState } from "react";

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={e => {
        const raw = e.target.value;
        setText(raw);
        if (raw !== "" && raw !== "-") {
          const n = Number(raw);
          if (!isNaN(n)) onChange(n);
        }
      }}
      onBlur={() => {
        if (text === "" || text === "-") {
          const fallback = min ?? 0;
          onChange(fallback);
          setText(String(fallback));
        }
      }}
    />
  );
}
