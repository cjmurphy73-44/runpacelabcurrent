import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { AlertTriangle } from "lucide-react";

export default function TrainingPlanExtras({ plan }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Accordion type="single" collapsible>
          <AccordionItem value="prehab">
            <AccordionTrigger className="text-sm font-heading">Daily Pre-hab Routine</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {plan.prehab_routine?.map((p, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium">{idx + 1}. {p.name}</span>
                  <p className="text-muted-foreground">{p.description}</p>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="nutrition">
            <AccordionTrigger className="text-sm font-heading">Nutrition System</AccordionTrigger>
            <AccordionContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Session Type</th>
                    <th className="py-2 pr-3">Before</th>
                    <th className="py-2 pr-3">During</th>
                    <th className="py-2 pr-3">After</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.nutrition_system?.map((n, idx) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 font-medium">{n.session_type}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{n.before}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{n.during}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{n.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="hrv">
            <AccordionTrigger className="text-sm font-heading">HRV Decision Framework</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {plan.hrv_framework?.map((h, idx) => (
                <div key={idx} className="text-sm flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                  <span className="font-medium sm:w-56 shrink-0">{h.condition}</span>
                  <span className="text-muted-foreground">{h.action}</span>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="injury">
            <AccordionTrigger className="text-sm font-heading">Injury Prevention — Weekly Audit</AccordionTrigger>
            <AccordionContent className="space-y-3">
              {plan.injury_audit_questions?.length > 0 && (
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  {plan.injury_audit_questions.map((q, idx) => <li key={idx}>{q}</li>)}
                </ul>
              )}
              {plan.injury_red_flags?.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 space-y-1">
                  <p className="text-sm font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Red flags — stop immediately</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {plan.injury_red_flags.map((r, idx) => <li key={idx}>{r}</li>)}
                  </ul>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {plan.phase2_note && (
            <AccordionItem value="next">
              <AccordionTrigger className="text-sm font-heading">What's Next</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.phase2_note}</p>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}