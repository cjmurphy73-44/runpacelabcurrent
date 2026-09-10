import React from "react";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { glossary } from "@/lib/glossary";
import { useUIPreferences } from "@/context/UIPreferencesContext";
import { TERMINOLOGY } from "@/lib/terminology";

// Renders an inline metric label whose acronym expands into an InfoTooltip on
// hover. In Simplified mode the label is swapped for the plain-language name
// from the terminology map (CTL → "Fitness", ACWR → "Load Balance", …) so the
// two lenses read noticeably differently; Scientific keeps the caller's
// technical label unchanged.
export function Term({ k, children }) {
  const { lens } = useUIPreferences();
  const text = glossary(k);
  const simplifiedLabel = TERMINOLOGY[k]?.simplified.label;
  const display = lens === "simplified" && simplifiedLabel ? simplifiedLabel : children;
  if (!text) return <>{display}</>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {display}
      <InfoTooltip content={text} />
    </span>
  );
}

export default Term;