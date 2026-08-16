import { NextResponse } from 'next/server';
import { reconcileWorkout, ScheduledWorkout, ExecutedActivity } from '@/lib/reconciliationEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scheduled, executed }: { scheduled: ScheduledWorkout | null; executed: ExecutedActivity } = body;

    const reconciliation = reconcileWorkout(scheduled, executed);

    // Generate contextual AI coaching response based on adherence status
    let aiResponse = "";
    if (reconciliation.status === 'ON_BOOK') {
      aiResponse = `Fantastic session execution! You hit your targets cleanly. Keep this cadence for your upcoming key efforts.`;
    } else if (reconciliation.status === 'OVER_ACHIEVED') {
      aiResponse = `Heads up! You ran ${Math.abs(reconciliation.distanceDeltaPct).toFixed(1)}% farther than prescribed. To prevent accumulated fatigue before your long run, I suggest dialing back tomorrow's pace into recovery zone.`;
    } else if (reconciliation.status === 'SHORT_MODIFIED') {
      aiResponse = `Life happens! You cut today's session short. No problem at all—let's prioritize rest and rebuild strength for your next scheduled interval workout.`;
    } else {
      aiResponse = `Unscheduled activity logged. Make sure this effort is accounted for in your weekly load so you don't overtrain.`;
    }

    return NextResponse.json({
      success: true,
      reconciliation,
      aiAdvice: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process AI reconciliation.' },
      { status: 500 }
    );
  }
}
