import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PageShell from "@/components/layout/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import GuideSection from "@/components/guide/GuideSection";
import ProviderExportCard from "@/components/guide/ProviderExportCard";
import {
  PROVIDERS, FILE_FORMATS, DASHBOARD_METRICS, ONBOARDING_STEPS, FAQS,
} from "@/components/guide/guideContent";
import {
  Sparkles, Watch, LayoutDashboard, HeartPulse, CalendarRange,
  MessageCircle, HelpCircle, Lightbulb, FileText, Rocket, BookOpen,
} from "lucide-react";

const SECTIONS = [
  { id: "getting-started", label: "Getting started", icon: Rocket },
  { id: "connect-data", label: "Connect your watch / app", icon: Watch },
  { id: "file-formats", label: "File formats", icon: FileText },
  { id: "read-dashboard", label: "Reading your dashboard", icon: LayoutDashboard },
  { id: "recovery", label: "Recovery & health", icon: HeartPulse },
  { id: "plans", label: "Training plans", icon: CalendarRange },
  { id: "coaching", label: "Coaching & AI", icon: MessageCircle },
  { id: "faq", label: "FAQ", icon: HelpCircle },
  { id: "whats-coming", label: "What's coming", icon: Lightbulb },
];

export default function UserGuide() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash]);

  return (
    <PageShell maxWidth="max-w-5xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold">User Guide</h1>
          <p className="text-sm text-muted-foreground">Everything you need to set up, connect your devices, read your data, and get the most out of TrainPaceLab.</p>
        </div>
      </div>

      {/* Quick-start banner */}
      <Card className="mt-6 border-primary/30 bg-primary/5">
        <CardContent className="pt-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-heading font-semibold">New here? Start here.</p>
              <p className="text-sm text-muted-foreground">Create a profile, import one workout, and you're running in under five minutes.</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button asChild size="sm"><Link to="/">Go to dashboard</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/import">Import a workout</Link></Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid lg:grid-cols-[220px_1fr] gap-8">
        {/* Table of contents */}
        <nav className="hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contents</p>
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-1">
                <s.icon className="w-3.5 h-3.5" /> {s.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Sections */}
        <div className="space-y-12 min-w-0">
          <GuideSection id="getting-started" icon={Rocket} title="Getting started" description="The five steps from empty account to a live dashboard.">
            <ol className="space-y-3">
              {ONBOARDING_STEPS.map((s) => (
                <li key={s.n} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">{s.n}</span>
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Card className="bg-muted/40">
              <CardContent className="pt-4 text-xs text-muted-foreground">
                Tip: you don't need perfect data to start. A single 30-minute session with heart rate is enough to see your fitness and form move. You can refine thresholds in Settings later.
              </CardContent>
            </Card>
          </GuideSection>

          <GuideSection id="connect-data" icon={Watch} title="Connect your watch or app" description="Step-by-step for every source TrainPaceLab can use — live now or on the roadmap.">
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">Live now</Badge>
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Coming soon</Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {PROVIDERS.map((p) => <ProviderExportCard key={p.id} provider={p} />)}
            </div>
            <p className="text-xs text-muted-foreground">
              Don't see your device? You can still upload any .FIT/.TCX/.CSV file manually on the Imports page — and we keep adding providers. <Link to="/import" className="text-primary hover:underline">Go to Imports →</Link>
            </p>
          </GuideSection>

          <GuideSection id="file-formats" icon={FileText} title="File formats" description="Which files we accept and which to choose when you have a choice.">
            <div className="grid sm:grid-cols-2 gap-3">
              {FILE_FORMATS.map((f) => (
                <Card key={f.format} className={f.best ? "border-primary/40 bg-primary/5" : ""}>
                  <CardContent className="pt-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{f.format}</span>
                      {f.best && <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">Recommended</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{f.note}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </GuideSection>

          <GuideSection id="read-dashboard" icon={LayoutDashboard} title="Reading your dashboard" description="What each metric means in plain English, and what to actually look at.">
            <div className="space-y-3">
              {DASHBOARD_METRICS.map((m) => (
                <Card key={m.term}>
                  <CardContent className="pt-4 space-y-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-heading font-semibold">{m.term}</span>
                      <span className="text-xs text-muted-foreground italic">— {m.plain}</span>
                    </div>
                    <p className="text-sm">{m.what}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">What to look for: </span>{m.look}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Prefer less jargon? Toggle <span className="font-medium">Simplified</span> mode in the header — it swaps technical terms for plain English across the app.</p>
          </GuideSection>

          <GuideSection id="recovery" icon={HeartPulse} title="Recovery & health" description="How recovery data flows in and what your readiness score means.">
            <p>Recovery metrics (HRV, sleep, resting heart rate) come from a connected wearable automatically, or you can log them manually in the Recovery Center. When a wearable provides data for a day, it overrides any manual entry — the device is authoritative.</p>
            <p>Your <span className="font-medium">Readiness</span> score blends HRV, sleep, resting HR, stress/Body Battery and your current Form into one 0–100 number that's comparable across devices. Your watch's own readiness score is shown next to it so you can compare.</p>
            <p className="text-xs text-muted-foreground"><Link to="/recovery" className="text-primary hover:underline">Open the Recovery Center →</Link></p>
          </GuideSection>

          <GuideSection id="plans" icon={CalendarRange} title="Training plans" description="How an adaptive plan is generated and how to read it.">
            <p>On the Plan page, generate a plan anchored to your goal race. We use your VDOT, heart-rate zones, current Form, injury history and chosen training philosophy to build day-by-day sessions for your tier.</p>
            <p>A new plan starts as a <span className="font-medium">draft</span> — review the macrocycle and weekly breakdown, then Confirm to commit it to your calendar. As you complete sessions, we reconcile actuals against the prescription and the adaptive engine can re-plan if you drift.</p>
            <p className="text-xs text-muted-foreground"><Link to="/plan" className="text-primary hover:underline">Go to your plan →</Link></p>
          </GuideSection>

          <GuideSection id="coaching" icon={MessageCircle} title="Coaching & AI coach" description="Your in-app coach and, on the Team plan, a multi-athlete roster.">
            <p>The <Link to="/coach" className="text-primary hover:underline">Coach</Link> page is your conversation with the AI coach — ask for plan tweaks, race strategy, micro-adjustments, or post-workout feedback. It can read your data and call planning tools on your behalf.</p>
            <p>Coaches on the Team plan can manage a roster of athletes, compare them side by side, and assign plans. Enable Coach mode in Settings to reveal the Roster.</p>
          </GuideSection>

          <GuideSection id="faq" icon={HelpCircle} title="FAQ" description="Quick answers to common questions.">
            <div className="space-y-3">
              {FAQS.map((f) => (
                <div key={f.q}>
                  <p className="font-medium">{f.q}</p>
                  <p className="text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </GuideSection>

          <GuideSection id="whats-coming" icon={Lightbulb} title="What's coming" description="We're actively adding more sources and features — here's what to expect.">
            <p>The following providers are wired in but awaiting developer-app approval or an on-device bridge:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Oura, Whoop, Withings, Polar — free OAuth recovery sync (pending each provider's developer portal).</li>
              <li>Suunto — pending developer access.</li>
              <li>Apple Health, Fitbit, Samsung Health — via an on-device Health Connect/HealthKit bridge.</li>
            </ul>
            <Card className="bg-muted/40">
              <CardContent className="pt-4 text-xs text-muted-foreground">
                We can always add more — if there's a device or app you'd like supported, send feedback from the menu and we'll prioritise it.
              </CardContent>
            </Card>
          </GuideSection>
        </div>
      </div>
    </PageShell>
  );
}