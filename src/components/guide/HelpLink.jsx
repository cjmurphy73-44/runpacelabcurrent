import React from "react";
import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";

// Inline "Need help?" link dropped into feature pages. Jumps to the matching
// anchor on the User Guide. `section` must match a GuideSection id.
export default function HelpLink({ section = "getting-started", label = "Need help?" }) {
  return (
    <Link
      to={`/guide#${section}`}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
    >
      <HelpCircle className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}