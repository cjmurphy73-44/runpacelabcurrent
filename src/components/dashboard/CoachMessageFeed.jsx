import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export default function CoachMessageFeed({ messages }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-heading flex items-center gap-2"><Sparkles className="w-4 h-4" /> Coach updates</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No coach updates yet — they'll appear after your first workout.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="border-b border-border pb-3 last:border-0">
              <Badge variant="outline" className="capitalize mb-1">{m.message_type.replace(/_/g, " ")}</Badge>
              <p className="text-sm whitespace-pre-wrap">{m.content_text}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}