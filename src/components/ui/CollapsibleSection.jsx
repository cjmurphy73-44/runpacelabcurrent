import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CollapsibleSection — a progressive-disclosure wrapper for optional/secondary
 * ("under the surface") detail. Renders a compact trigger row that expands to
 * reveal its children. Defaults to collapsed so the primary view stays calm;
 * advanced metrics / seldom-used controls live behind a single click.
 *
 * Props:
 *  - title:        label on the trigger
 *  - subtitle:     optional muted hint
 *  - defaultOpen:  start expanded (default false)
 *  - icon:          optional lucide icon
 *  - badge:         optional right-aligned content (count, status)
 *  - className:     applied to the outer container
 */
export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  icon: Icon,
  badge,
  className,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        {Icon && <Icon className="w-4 h-4 text-primary shrink-0" />}
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-foreground">{title}</span>
          {subtitle && <span className="ml-2 text-xs text-muted-foreground">{subtitle}</span>}
        </div>
        {badge && <div className="shrink-0 text-xs text-muted-foreground">{badge}</div>}
        <ChevronDown
          className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")}
        />
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-border/60 space-y-4">{children}</div>}
    </div>
  );
}