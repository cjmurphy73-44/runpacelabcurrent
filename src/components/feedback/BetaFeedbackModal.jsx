import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { feedbackWasAccepted } from "@/lib/feedbackReceipt";

// Persistent beta feedback reporter. Stores each submission in the BetaFeedback
// entity so the team can triage from the Admin page instead of relying on an
// email inbox. Failed writes preserve the draft for a deliberate retry.
export default function BetaFeedbackModal({ open, onClose }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [type, setType] = useState("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const route = typeof window !== "undefined" ? window.location.pathname : "";
      const res = await base44.functions.invoke("logBetaFeedback", {
        feedback_type: type,
        message: message.trim(),
        contact_email: email.trim() || undefined,
        route,
      });
      const ok = feedbackWasAccepted(res);
      if (ok) {
        toast({ title: "Feedback sent", description: "Thanks, the team will review it." });
        setMessage("");
        setEmail("");
        onClose?.();
      } else {
        toast({ title: "Could not send feedback", description: "Please try again. Your message is still here.", variant: "destructive" });
      }
    } catch {
      // Never silently copy private feedback or expose backend error details.
      toast({ title: "Could not send feedback", description: "Please try again. Your message is still here.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send beta feedback</DialogTitle>
          <DialogDescription>
            Spotted a bug or have an idea? Let the team know, it helps shape the beta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={type === "bug" ? "default" : "outline"}
              size="sm"
              onClick={() => setType("bug")}
            >
              Bug report
            </Button>
            <Button
              type="button"
              variant={type === "idea" ? "default" : "outline"}
              size="sm"
              onClick={() => setType("idea")}
            >
              Idea / feedback
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bf-email">Your email (optional)</Label>
            <Input
              id="bf-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bf-msg">Message</Label>
            <Textarea
              id="bf-msg"
              rows={5}
              placeholder="What happened, what you expected, and what you saw…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={!message.trim() || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            {submitting ? "Sending…" : "Send feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}