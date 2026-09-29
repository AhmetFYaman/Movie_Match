"use client";
import { useId, useState, type ReactNode } from "react";

// Keep content mounted so opening AND closing can animate its natural height.
export function Disclosure({
  title,
  hint,
  className = "",
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className={className}>
      <button
        type="button"
        className="disclosure-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          {title}
          {hint && <small>{hint}</small>}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        id={id}
        className="context-reveal"
        data-expanded={open}
        aria-hidden={!open}
        inert={!open}
      >
        <div>{children}</div>
      </div>
    </section>
  );
}
