import React, { useId, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, MessageSquare,
  ChevronDown, Loader2, CalendarClock, RotateCcw, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function whenLabel(date) {
  if (!date) return "date unavailable";
  const m = moment(date);
  if (!m.isValid()) return "date unavailable";
  return `${m.format("MMM D, YYYY")} at ${m.format("HH:mm")}`;
}

// The coach-directed running hold, made understandable and actionable.
// One component for every surface (Today's Session, Plan, Calendar) so the state, the
// reason, the coach's own words and the way out are identical everywhere. The hold is
// only ever derived from the coach conversation, so clearing it stamps the athlete
// profile and retires the older messages instead of muting the signal outright.
export default function CoachHoldCard({
  injury,
  swappedLabel = null,
  compact = false,
  hideWhenNone = false,
}) {
  const { toast } = useToast();
  const [showWhy, setShowWhy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const whyId = useId();

  if (!injury) return null;

  if (injury.loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        <span role="status">Checking your coaching status…</span>
      </div>
    );
  }

  if (injury.unavailable) {
    return (
      <div className="rounded-md border border-border bg-card p-3 space-y-2" role="alert">
        <p className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" aria-hidden="true" />
          Coaching status unavailable
        </p>
        <p className="text-xs text-muted-foreground">
          We could not load your coach conversation, so we cannot confirm whether a hold is
          active. This is not a clearance — do not treat it as one.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => injury.reload?.()}
          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Try again
        </Button>
      </div>
    );
  }

  if (injury.level === "none") {
    if (hideWhenNone) return null;
    return (
      <div className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2">
        <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">No active coach hold.</span>{" "}
          Nothing in your recent coach conversation is pausing training.
        </p>
      </div>
    );
  }

  const isHold = injury.level === "hold";
  const evidence = (injury.evidence || []).slice(0, compact ? 1 : 3);
  const tone = isHold
    ? { border: "border-danger/40", bg: "bg-danger/[0.06]", text: "text-danger", iconBg: "bg-danger/15", Icon: ShieldAlert }
    : { border: "border-warning/40", bg: "bg-warning/[0.06]", text: "text-warning", iconBg: "bg-warning/15", Icon: AlertTriangle };
  const { Icon } = tone;

  const handleClear = async (event) => {
    event.preventDefault();
    if (injury.clearing) return;
    setDialogError(null);
    try {
      await injury.clearHold();
      setAnnouncement("Coach hold cleared. Your plan and calendar are no longer paused.");
      setDialogOpen(false);
      toast({
        title: "Coach hold cleared",
        description: "The recorded hold was cleared. Review your plan and current symptoms before training.",
      });
    } catch (e) {
      const message = "Could not save the clearance. The hold is still active. Please try again.";
      setDialogError(message);
      setAnnouncement(message);
      toast({ title: "Could not clear coach hold", description: message, variant: "destructive" });
    }
  };

  return (
    <section
      aria-label="Current coaching status"
      className={`rounded-md border ${tone.border} ${tone.bg} p-3 sm:p-4 space-y-3`}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-md ${tone.iconBg} p-1.5 shrink-0`} aria-hidden="true">
          <Icon className={`w-4 h-4 ${tone.text}`} />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-xs font-semibold uppercase tracking-wide ${tone.text}`}>
              Current coaching status
            </p>
            <span
              className={`text-[10px] uppercase tracking-wide rounded ${tone.iconBg} ${tone.text} px-1.5 py-0.5 leading-none`}
            >
              {isHold ? "Running paused" : "Caution"}
            </span>
          </div>
          <p className="text-sm leading-relaxed break-words">{injury.summary}</p>
          {injury.evidence?.[0]?.date && (
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                {injury.evidence[0].source || "Coach message"}, {whenLabel(injury.evidence[0].date)}
              </span>
            </p>
          )}
          {swappedLabel && (
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
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
            aria-expanded={showWhy}
            aria-controls={whyId}
            className={`flex items-center gap-1 min-h-[44px] sm:min-h-0 text-xs font-medium ${tone.text} rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showWhy ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            {showWhy ? "Hide the evidence" : "Why am I seeing this?"}
          </button>
          <div id={whyId} hidden={!showWhy} className="space-y-2">
            {evidence.map((e, i) => (
              <blockquote
                key={`${e.date}-${i}`}
                className="border-l-2 border-muted-foreground/30 pl-3 text-xs text-muted-foreground italic break-words"
              >
                “{e.snippet}”
                <span className="not-italic block mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  {e.source || "Coach message"} · {whenLabel(e.date)}
                </span>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button asChild size="sm" className="w-full sm:w-auto min-h-[44px] sm:min-h-0 gap-1.5">
          <Link to="/coach">
            <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
            Talk to coach
          </Link>
        </Button>

        {isHold && (
          <AlertDialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setDialogError(null);
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 gap-1.5"
                disabled={injury.clearing}
              >
                {injury.clearing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                I've been cleared — review hold
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-h-[85dvh] overflow-y-auto">
              <AlertDialogHeader>
                <AlertDialogTitle>Review this coach hold</AlertDialogTitle>
                <AlertDialogDescription>
                  Confirm only if you have actually been cleared to run again. This clears the
                  hold recorded in TrainPaceLab, nothing else.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
                <li>The current hold will be marked as resolved.</li>
                <li>Previous injury-related messages stay in your conversation history.</li>
                <li>New injury concerns can create another hold.</li>
                <li>Clearing the app's hold is not a medical assessment.</li>
              </ul>

              {dialogError && (
                <p role="alert" className="text-xs text-destructive">
                  {dialogError}
                </p>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-[44px] sm:min-h-0">Keep hold</AlertDialogCancel>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={injury.clearing}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 min-h-[44px] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {injury.clearing && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  Confirm clearance
                </button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {isHold && (
        <p className="text-[11px] text-muted-foreground">
          Clearing retires the hold for older messages. If your coach raises the injury again, the
          hold returns.
        </p>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}