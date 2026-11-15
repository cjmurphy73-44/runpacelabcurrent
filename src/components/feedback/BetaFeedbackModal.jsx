import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
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
import { feedbackReceipt } from "./feedbackReceipt";

// Persistent beta feedback reporter. Stores each submission in the BetaFeedback
// entity so the team can triage from the Admin page instead of relying on an
// email inbox. Failed requests preserve the draft for an explicit retry.
export default function BetaFeedbackModal({ open, onClose }) {
  const { toast } = useToast();
  const { user } = useAuth();
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
      const ok = feedbackReceipt(res);
      if (ok) {
        toast({ title: "Feedback sent", description: "Thanks, the team will review it." });
        setMessage("");
        setEmail("");
        onClose?.();
      } else {
        toast({ title: "Feedback not confirmed", description: "Your message is still here. Please retry.", variant: "destructive" });
      }
    } catch {
      // Do not silently copy private feedback or email addresses to the clipboard.
      toast({ title: "Could not send feedback", description: "Your message is still here. Please retry.", variant: "destructive" });
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
            Spotted a bug or have an idea? Let the team know, it helps shape the beta. Do not include passwords, access tokens or payment-card details.
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
              defaultValue={user?.email || ""}
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