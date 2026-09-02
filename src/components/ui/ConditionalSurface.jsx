import React from "react";

/**
 * ConditionalSurface — renders children only when a context condition is met,
 * so data-driven sections (injury card, race card, push-setup panel, etc.)
 * stay hidden until the underlying data exists. Keeps the default view clean
 * without cluttering empty space.
 *
 * Props:
 *  - when:      truthy => show children
 *  - fallback:  optional element shown when `when` is false (default: nothing)
 *  - children:  the surface content
 */
export default function ConditionalSurface({ when, fallback = null, children }) {
  if (!when) return <>{fallback}</>;
  return <>{children}</>;
}