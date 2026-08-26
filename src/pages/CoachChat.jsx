import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import MessageBubble from "@/components/coach/MessageBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Send, Loader2 } from "lucide-react";

const AGENT_NAME = "early_version_ai_coach";

export default function CoachChat() {
  const { toast } = useToast();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    (async () => {
      const existing = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      let convo = existing?.[0];
      if (!convo) {
        convo = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: "Coach Chat", description: "Chat with the Trainpacelab AI coach" },
        });
      } else {
        convo = await base44.agents.getConversation(convo.id);
      }
      setConversation(convo);
      setMessages(convo.messages || []);
      setLoading(false);
    })();
  }, []);

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
    if (!input.trim() || !conversation) return;
    setSending(true);
    const text = input;
    setInput("");
    try {
      await base44.agents.addMessage(conversation, { role: "user", content: text });
      setAwaitingReply(true);
    } catch (err) {
      console.error("CoachChat send failed", err);
      toast({
        title: "Message not sent",
        description: "Network hiccup or rate limit — please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Starting your conversation with the coach...</div>;
  }

  return (
    <div className="flex flex-col h-[70vh] max-w-2xl mx-auto">
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Ask EarlyversionAIcoach anything about your training, fitness, or recovery.
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
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border pt-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message your coach..."
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}