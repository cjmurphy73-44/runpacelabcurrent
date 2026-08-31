import React from "react";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { glossary } from "@/lib/glossary";

// Renders an inline label whose acronym expands into an InfoTooltip on hover.
// Usage: <Term k="ctl">CTL</Term>
export function Term({ k, children }) {
  const text = glossary(k);
  if (!text) return <>{children}</>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {children}
      <InfoTooltip content={text} />
    </span>
  );
}

export default Term;