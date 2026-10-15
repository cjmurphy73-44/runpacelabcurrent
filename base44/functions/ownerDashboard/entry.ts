import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Monthly price per plan tier (USD), aligned with Stripe products.
const PLAN_PRICE: Record<string, number> = {
  free: 0,
  pro: 9,
  unlimited: 19,
  coach_pro: 29,
  team: 29,
};

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin")
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const sr = base44.asServiceRole.entities;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .slice(0, 10);

    // ---- Counts (not subject to the aggregate rate limit) ----
    const counts = await Promise.all([
      sr.AthleteProfile.count(),
      sr.WorkoutSession.count(),
      sr.WorkoutSession.count({ date: { $gte: sevenDaysAgo } }),
      sr.TrainingPlan.count({ status: "active" }),
      sr.Subscription.count(),
      sr.DailyMetrics.count(),
      sr.DailyMetrics.count({ sleep_score: { $gt: 0 } }),
      sr.DailyMetrics.count({ hrv: { $gt: 0 } }),
      sr.DailyMetrics.count({ resting_hr: { $gt: 0 } }),
      sr.BetaFeedback.count({ status: { $in: ["new", "triaged"] } }),
      sr.AccessCode.count(),
      sr.AccessCode.count({ used_count: { $gt: 0 } }),
    ]);
    const [
      totalAthletes,
      totalWorkouts,
      recentWorkouts,
      activePlans,
      totalSubs,
      totalDailyMetrics,
      sleepCovered,
      hrvCovered,
      rhrCovered,
      unresolvedFeedback,
      totalAccessCodes,
      usedAccessCodes,
    ] = counts;

    // ---- Aggregates (rate-limited ~15/min; 7 calls here) ----
    const aggs = await Promise.all([
      sr.Subscription.aggregate({
        query: { status: { $in: ["active", "trialing"] } },
        groupBy: "plan",
      }),
      sr.Subscription.aggregate({ groupBy: "status" }),
      sr.TrainingPlanSession.aggregate({ groupBy: "status" }),
      sr.GarminConnection.aggregate({ groupBy: "status" }),
      sr.StravaConnection.aggregate({ groupBy: "status" }),
      sr.CorosConnection.aggregate({ groupBy: "status" }),
      sr.WearableConnection.aggregate({ groupBy: "provider" }),
    ]);
    const [planAgg, statusAgg, sessionAgg, garminAgg, stravaAgg, corosAgg, wearableAgg] =
      aggs;

    // MRR = sum of (active+trialing count × plan price)
    const mrr = (planAgg.rows || []).reduce(
      (sum, r) => sum + (PLAN_PRICE[r.plan] || 0) * (r.count || 0),
      0,
    );

    const toDist = (rows: any[], key: string) => {
      const dist: Record<string, number> = {};
      (rows || []).forEach((r) => {
        if (r[key] != null) dist[r[key]] = r.count || 0;
      });
      return dist;
    };

    const planDistribution = toDist(planAgg.rows, "plan");
    const subStatusDistribution = toDist(statusAgg.rows, "status");
    const sessionStatusDistribution = toDist(sessionAgg.rows, "status");

    const connByStatus = (rows: any[]) => {
      const dist = toDist(rows, "status");
      const total = Object.values(dist).reduce((a, b) => a + b, 0);
      const issues = (dist.error || 0) + (dist.expired || 0) + (dist.disconnected || 0);
      return { total, connected: dist.connected || 0, issues, breakdown: dist };
    };

    const wearableByProvider = toDist(wearableAgg.rows, "provider");
    const wearableTotal = Object.values(wearableByProvider).reduce(
      (a, b) => a + b,
      0,
    );

    const connections = {
      garmin: connByStatus(garminAgg.rows),
      strava: connByStatus(stravaAgg.rows),
      coros: connByStatus(corosAgg.rows),
      wearable: {
        total: wearableTotal,
        byProvider: wearableByProvider,
      },
    };

    return Response.json({
      operations: {
        totalAthletes,
        totalWorkouts,
        recentWorkouts,
        activePlans,
        sessionStatusDistribution,
        connections,
        recoveryCoverage: {
          total: totalDailyMetrics,
          sleep: sleepCovered,
          hrv: hrvCovered,
          restingHr: rhrCovered,
        },
        unresolvedFeedback,
      },
      business: {
        mrr,
        totalSubs,
        planDistribution,
        subStatusDistribution,
        accessCodes: { total: totalAccessCodes, used: usedAccessCodes },
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}