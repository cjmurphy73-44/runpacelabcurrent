import React, { useState } from "react";
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

// <-- Set this to your real beta feedback inbox before opening the test to users. -->
const BETA_FEEDBACK_EMAIL = "beta-feedback@runpacelab.app";

// Lightweight feedback reporter for the external beta. Uses a mailto link (reliable,
// no external email dependency) plus a clipboard fallback so testers always have a path.
export default function BetaFeedbackModal({ open, onClose }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [type, setType] = useState("bug");
  const [message, setMessage] = useState("");

  const composed = `${message}\n\nFrom: ${email || "(anonymous)"}`;
  const subject = encodeURIComponent(`[Beta Feedback] ${type.toUpperCase()} — Runpacelab`);
  const body = encodeURIComponent(composed);
  const mailto = `mailto:${BETA_FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(composed);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleMail = () => {
    window.open(mailto, "_blank", "noopener,noreferrer");
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send beta feedback</DialogTitle>
          <DialogDescription>
            Spotted a bug or have an idea? Let the team know — it helps shape the beta.
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
          <Button type="button" variant="ghost" onClick={handleCopy} disabled={!message}>
            Copy text
          </Button>
          <Button type="button" onClick={handleMail} disabled={!message}>
            Open in email app
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}