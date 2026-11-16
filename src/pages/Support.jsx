import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, Loader2, CheckCircle2, MessageSquare, CreditCard, UserCog, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PublicFooter from "@/components/layout/PublicFooter";
import { isConfirmedFeedbackReceipt } from "@/lib/feedbackReceipt";

const CATEGORIES = [
  { key: "bug", label: "Bug report" },
  { key: "billing", label: "Billing" },
  { key: "account", label: "Account / data" },
  { key: "idea", label: "Feature idea" },
  { key: "other", label: "Other" },
];

const QUICK_LINKS = [
  { to: "/subscribe", icon: CreditCard, label: "Manage billing", desc: "Update payment, view invoices, or cancel" },
  { to: "/settings", icon: UserCog, label: "Account settings", desc: "Edit profile, disconnect wearables, delete account" },
  { to: "/privacy", icon: FileText, label: "Privacy policy", desc: "How your training data is stored and used" },
];

export default function Support() {
  const { toast } = useToast();
  const [type, setType] = useState("bug");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    // Mirror backend storage limits: never silently truncate a user's report.
    if (!message.trim() || message.length > 4000 || email.length > 200) return;
    setBusy(true);
    try {
      const response = await base44.functions.invoke("logBetaFeedback", {
        feedback_type: type,
        message,
        contact_email: email || undefined,
        route: "/support",
      });
      // A resolved SDK call is not evidence that the feedback row was saved.
      // The function returns { success: true, id } only after create succeeds.
      if (!isConfirmedFeedbackReceipt(response)) {
        throw new Error("Your message could not be confirmed. Please check and try again.");
      }
      setSent(true);
      toast({ title: "Message received", description: "Your report was saved. A response time is not guaranteed." });
    } catch (err) {
      toast({ title: "Could not confirm message", description: "Your message may not have been saved. Please check before retrying.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur pt-safe">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg">
            <Activity className="w-5 h-5 text-primary" />
            <span>TrainPaceLab</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to="/"><ArrowLeft className="w-4 h-4" />Back</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold">Contact support</h1>
          <p className="mt-2 text-muted-foreground">
            Found a bug, have a billing question, or need help with your account? Send a report for review. Response availability and timing are not yet guaranteed.
          </p>
        </div>

        {/* Quick self-serve links */}
        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          {QUICK_LINKS.map((q) => (
            <Link key={q.to} to={q.to} className="block">
              <Card className="h-full hover:border-primary transition-colors">
                <CardContent className="p-4">
                  <q.icon className="w-5 h-5 text-primary mb-2" />
                  <p className="text-sm font-medium">{q.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{q.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {sent ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
              <h2 className="font-heading text-xl font-semibold">Thanks, message received</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your report has been saved. A reply is not guaranteed. For billing issues, you can also manage your subscription directly from the billing portal.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
                <Button asChild variant="outline">
                  <Link to="/subscribe">Billing portal</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/">Back to home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Send a message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((opt) => (
                    <Button
                      key={opt.key}
                      type="button"
                      variant={type === opt.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setType(opt.key)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email <span className="text-muted-foreground">(optional, for a reply)</span></Label>
                  <Input
                    id="email"
                    type="email"
                    maxLength={200}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message">Message <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="message"
                    maxLength={4000}
                    placeholder="Tell us what happened or what you need help with..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={busy || !message.trim() || message.length > 4000 || email.length > 200}>
                  {busy ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : "Send message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}