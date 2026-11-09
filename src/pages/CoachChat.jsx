import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import MessageBubble from "@/components/coach/MessageBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useCoachMessageLimit } from "@/hooks/useCoachMessageLimit";
import useKeyboardInset from "@/hooks/useKeyboardInset";

const AGENT_NAME = "early_version_ai_coach";

export default function CoachChat() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [sendError, setSendError] = useState(false);
  const [sending, setSending] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sendingRef = useRef(false);
  const { usedThisWeek, limitReached, isPro } = useCoachMessageLimit(messages);
  const keyboardInset = useKeyboardInset();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    (async () => {
      try {
        // Only bind to conversations explicitly named "Coach Chat". Never fall back to
        // existing[0], that would grab orphaned E2E/test threads (e.g. the old
        // "E2E coach audit (auto)" conversation) and show 49 test messages to a real user.
        const existing = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        let convo = (existing || []).find((c) => c?.metadata?.name === "Coach Chat");
        if (!convo) {
          convo = await base44.agents.createConversation({
            agent_name: AGENT_NAME,
            metadata: { name: "Coach Chat", description: "Chat with the Trainpacelab AI coach" },
          });
        } else {
          convo = await base44.agents.getConversation(convo.id);
        }
        if (!convo?.id) throw new Error('Conversation unavailable');
        if (!cancelled) {
          setConversation(convo);
          setMessages(convo.messages || []);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadAttempt]);

  useEffect(() => {
    if (sendError) inputRef.current?.focus();
  }, [sendError, sending]);

  useEffect(() => {
    if (!conversation) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages);
      const last = (data.messages || [])[data.messages.length - 1];
      if (last && (last.role === "assistant" || last.role === "agent")) setAwaitingReply(false);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conversation || limitReached || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setSendError(false);
    const text = input;
    try {
      await base44.agents.addMessage(conversation, { role: "user", content: text });
      setInput("");
      setAwaitingReply(true);
    } catch {
      setSendError(true);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  if (loading) {
    return <div role="status" className="text-center py-20 text-muted-foreground">Starting your conversation with the coach...</div>;
  }

  if (loadError) return (
    <section aria-labelledby="coach-load-error" className="mx-auto max-w-xl space-y-4 rounded-xl border border-border bg-card p-6">
      <h1 id="coach-load-error" className="text-xl font-heading">Your coach conversation couldn’t load</h1>
      <p role="alert" className="text-sm text-muted-foreground">Try again when connected. Your saved conversation and training plan have not been changed.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" className="min-h-[44px]" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Retry coach conversation</Button>
        <Link to="/app" className="inline-flex min-h-[44px] items-center rounded-md px-3 text-sm text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Back to dashboard</Link>
      </div>
    </section>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-2xl mx-auto">
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Ask your TrainPaceLab coach about your training, fitness, or recovery.
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {awaitingReply && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 max-w-[75%] rounded-lg px-4 py-2 text-sm bg-muted text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Coach is thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {sendError && <p id="coach-send-error" role="alert" className="mb-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">We couldn’t confirm your message was sent. Your draft is still here. Check the conversation before retrying.</p>}
      <form
        onSubmit={handleSend}
        className="relative z-20 flex items-center gap-2 border-t border-border bg-background pt-3"
        style={keyboardInset ? { transform: `translateY(-${keyboardInset}px)` } : undefined}
      >
        <Input
          ref={inputRef}
          aria-label="Message your coach"
          aria-describedby={sendError ? 'coach-send-error' : undefined}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message your coach..."
          disabled={sending}
        />
        <Button type="submit" size="icon" className="min-h-[44px] min-w-[44px]" aria-label={sending ? 'Sending message' : 'Send message'} disabled={sending || !input.trim() || limitReached}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
        </Button>
      </form>
      {!isPro && (
        <div className="text-xs text-center text-muted-foreground pt-2">
          {limitReached ? (
            <span className="text-destructive">
              {usedThisWeek}/5 coach messages used this week.{' '}
              <Link to="/subscribe" className="text-primary font-medium inline-flex items-center gap-1">
                <Lock className="w-3 h-3" />Upgrade to Pro
              </Link>{' '}
              for unlimited.
            </span>
          ) : (
            <span>{usedThisWeek}/5 free coach messages used this week.</span>
          )}
        </div>
      )}
    </div>
  );
}
