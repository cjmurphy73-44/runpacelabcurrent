import React, { useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import { ShieldAlert, CheckCircle2, MessageSquare, ChevronDown, Loader2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// The coach-directed running hold, made actionable.
// One component for every surface (Today's Session, Plan, Calendar) so the reason,
// the coach's own words and the way out are the same everywhere. The hold is only
// ever derived from the coach conversation, so clearing it stamps the athlete profile
// and retires the older messages instead of muting the signal outright.
export default function CoachHoldCard({ injury, swappedLabel = null, compact = false }) {
  const { toast } = useToast();
  const [showWhy, setShowWhy] = useState(false);

  if (injury?.level !== "hold") return null;

  const evidence = (injury.evidence || []).slice(0, compact ? 1 : 2);

  const handleClear = async () => {
    try {
      await injury.clearHold();
      toast({
        title: "Coach hold cleared",
        description: "The recorded hold was cleared. Review your plan and current symptoms before training.",
      });
    } catch {
      toast({
        title: "Could not clear coach hold",
        description: "The hold remains in place. Please try again or contact your coach.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-md border border-danger/40 bg-danger/[0.06] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-danger/15 p-1.5 shrink-0">
          <ShieldAlert className="w-4 h-4 text-danger" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-wide text-danger">Coach hold</p>
            <span className="text-[10px] uppercase tracking-wide rounded bg-danger/15 text-danger px-1.5 py-0.5 leading-none">
              Running paused
            </span>
          </div>
          <p className="text-sm leading-relaxed">{injury.summary}</p>
          {swappedLabel && (
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {swappedLabel}
            </p>
          )}
        </div>
      </div>

      {evidence.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-danger/90 hover:text-danger"
            aria-expanded={showWhy}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showWhy ? "rotate-180" : ""}`} />
            {showWhy ? "Hide what your coach said" : "Why this is on"}
          </button>
          {showWhy && (
            <div className="space-y-2">
              {evidence.map((e, i) => (
                <blockquote
                  key={`${e.date}-${i}`}
                  className="border-l-2 border-danger/40 pl-3 text-xs text-muted-foreground italic"
                >
                  “{e.snippet}”
                  <span className="not-italic block mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                    {moment(e.date).format("MMM D, HH:mm")}
                  </span>
                </blockquote>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto gap-1.5" disabled={injury.clearing}>
              {injury.clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              I'm cleared, resume running
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Resume running?</AlertDialogTitle>
              <AlertDialogDescription>
                The hold from your coach conversation will be cleared and your plan goes back to
                the prescribed sessions. Only do this once the issue has actually settled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep the hold</AlertDialogCancel>
              <AlertDialogAction onClick={handleClear}>Yes, resume running</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button asChild size="sm" variant="outline" className="w-full sm:w-auto gap-1.5">
          <Link to="/coach">
            <MessageSquare className="w-3.5 h-3.5" />
            Talk to coach
          </Link>
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Clearing retires the old conversation. If your coach raises the injury again, the hold returns.
      </p>
    </div>
  );
}