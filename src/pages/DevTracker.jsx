import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, ExternalLink, CheckCircle2, Circle } from "lucide-react";

export default function DevTracker() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("githubDevTracker", { action: "list" });
      setIssues(res.data.issues || []);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load issues from GitHub.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await base44.functions.invoke("githubDevTracker", { action: "create", title, body });
      setTitle("");
      setBody("");
      await loadIssues();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not create the issue.");
    }
    setCreating(false);
  };

  const toggleState = async (issue) => {
    setUpdatingId(issue.number);
    try {
      const newState = issue.state === "open" ? "closed" : "open";
      await base44.functions.invoke("githubDevTracker", {
        action: "update_state",
        issue_number: issue.number,
        state: newState,
      });
      await loadIssues();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not update the issue.");
    }
    setUpdatingId(null);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-heading font-bold">Dev Tracker</h1>
        <p className="text-muted-foreground text-sm">Track backend development progress via GitHub issues.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              placeholder="Issue title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              placeholder="Details (optional)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
            />
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Issue
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issues</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : issues.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No issues yet. Create one above.</p>
          ) : (
            <ul className="divide-y divide-border">
              {issues.map((issue) => (
                <li key={issue.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <button
                      onClick={() => toggleState(issue)}
                      disabled={updatingId === issue.number}
                      className="mt-0.5 shrink-0"
                      title={issue.state === "open" ? "Mark as closed" : "Reopen"}
                    >
                      {updatingId === issue.number ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : issue.state === "open" ? (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${issue.state === "closed" ? "line-through text-muted-foreground" : ""}`}>
                        #{issue.number} {issue.title}
                      </p>
                      {issue.body && (
                        <p className="text-xs text-muted-foreground truncate">{issue.body}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={issue.state === "open" ? "secondary" : "outline"}>{issue.state}</Badge>
                    <a href={issue.html_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
