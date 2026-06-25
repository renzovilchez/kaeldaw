import { useEffect, useRef, createElement } from "react";

export function Fader({ value, min, max, width, height, label, onChange }: {
  value: number; min: number; max: number; width?: number; height?: number;
  label?: string; onChange?: (v: number) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !onChange) return;
    const handler = (e: Event) => onChange((e as CustomEvent).detail.value);
    el.addEventListener("input", handler);
    return () => el.removeEventListener("input", handler);
  }, [onChange]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("value", String(value));
    el.setAttribute("min", String(min));
    el.setAttribute("max", String(max));
    if (width) el.setAttribute("width", String(width));
    if (height) el.setAttribute("height", String(height));
    if (label) el.setAttribute("label", label);
  });
  // eslint-disable-next-line react-hooks/refs
  return createElement("daw-fader", { ref, style: { display: "inline-block" as const } });
}
