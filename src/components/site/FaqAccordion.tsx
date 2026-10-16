"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

export function FaqAccordion({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
      {items.map((item, i) => {
        const isOpen = open === i;
        const btnId = `${base}-q${i}`;
        const panelId = `${base}-a${i}`;
        return (
          <div key={item.question}>
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-[1.05rem] font-semibold text-white transition-colors hover:bg-card-2 sm:px-6"
              >
                {item.question}
                <ChevronDown className={`h-5 w-5 shrink-0 text-cyan transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={btnId} hidden={!isOpen} className="px-5 pb-5 text-soft/90 sm:px-6">
              <p className="whitespace-pre-line">{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
