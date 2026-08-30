import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Copy, RefreshCw, KeyRound, Webhook as WebhookIcon, Check } from "lucide-react";
import WebhookSetupGuides from "@/components/imports/WebhookSetupGuides";
import { useSubscription } from "@/hooks/useSubscription";
import FeatureGate from "@/components/billing/FeatureGate";

export default function WebhookSyncPanel({ athleteId }) {
  const [apiKey, setApiKey] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const { plan } = useSubscription();

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("workoutWebhook", { action: "get_key" });
      const d = res.data || res;
      setApiKey(d.api_key || null);
      setWebhookUrl(d.webhook_url || null);
    } catch (e) {
      setError(e?.response?.data?.error || "Could not load webhook credentials.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenerating(true); setError(null);
    try {
      const res = await base44.functions.invoke("workoutWebhook", { action: "generate_key" });
      const d = res.data || res;
      setApiKey(d.api_key);
      setWebhookUrl(d.webhook_url);
    } catch (e) {
      setError(e?.response?.data?.error || "Could not generate webhook key.");
    }
    setGenerating(false);
  };

  const regenerate = async () => {
    if (!window.confirm("Regenerating your API key will invalidate the old URL — any service still using the old key will stop syncing. Continue?")) return;
    await generate();
  };

  const copy = (text, tag) => {
    navigator.clipboard.writeText(text);
    setCopied(tag);
    setTimeout(() => setCopied(null), 1500);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading webhook…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <WebhookIcon className="w-4 h-4 text-primary" /> Your webhook endpoint
          </CardTitle>
          <CardDescription>
            POST workout summaries to this URL to auto-import. Each URL carries a personal API key — keep it private.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!apiKey ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                No webhook credentials yet. Generate your personalized endpoint to get started.
              </p>
              <FeatureGate feature="unlimited_sync" plan={plan} compact>
                <Button onClick={generate} disabled={generating}>
                  {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                  Generate webhook URL & API key
                </Button>
              </FeatureGate>
            </div>
          ) : (
            <>
              <div>
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value={webhookUrl || ""} className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => copy(webhookUrl, "url")}>
                    {copied === "url" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label>API key</Label>
                <div className="flex gap-2">
                  <Input readOnly value={apiKey} className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => copy(apiKey, "key")}>
                    {copied === "key" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <FeatureGate feature="unlimited_sync" plan={plan} compact>
                <Button variant="outline" size="sm" onClick={regenerate} disabled={generating}>
                  {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Regenerate key
                </Button>
              </FeatureGate>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Connection guides</CardTitle>
          <CardDescription>Step-by-step setup for common sources.</CardDescription>
        </CardHeader>
        <CardContent>
          <WebhookSetupGuides webhookUrl={webhookUrl} apiKey={apiKey} />
        </CardContent>
      </Card>
    </div>
  );
}