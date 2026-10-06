import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, Loader2, CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PublicFooter from "@/components/layout/PublicFooter";

export default function Support() {
  const { toast } = useToast();
  const [type, setType] = useState("bug");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    try {
      await base44.functions.invoke("logBetaFeedback", {
        feedback_type: type,
        message,
        contact_email: email || undefined,
        route: "/support",
      });
      setSent(true);
      toast({ title: "Message sent", description: "We'll get back to you soon." });
    } catch (err) {
      toast({ title: "Could not send", description: err?.message || "Please try again.", variant: "destructive" });
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
            Found a bug, have a question, or want to share an idea? Send it through and our team will take a look.
          </p>
        </div>

        {sent ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="font-heading text-xl font-semibold">Thanks — message received</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We'll review your message and get back to you{email ? ` at ${email}` : ""} if needed.
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/">Back to home</Link>
              </Button>
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
                <div className="flex gap-2">
                  {[
                    { key: "bug", label: "Bug report" },
                    { key: "idea", label: "Feature idea" },
                    { key: "other", label: "Other" },
                  ].map((opt) => (
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
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message">Message <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us what happened or what you'd like to see..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={busy || !message.trim()}>
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