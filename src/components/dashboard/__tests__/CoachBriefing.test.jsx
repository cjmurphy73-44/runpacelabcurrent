import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CoachBriefing from "../CoachBriefing";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), isPro: false }));

vi.mock("@/lib/AuthContext", () => ({ useAuth: () => ({ user: { id: "athlete-user" } }) }));
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ isPro: mocks.isPro, loading: false }),
}));
vi.mock("@/services/providers/ServiceContext", () => ({
  useServices: () => ({ functionGateway: { invoke: mocks.invoke } }),
}));
vi.mock("@/context/FitnessContext", () => ({
  useFitness: () => ({
    dailyMetrics: [],
    workoutSessions: [{ date: new Date().toISOString().slice(0, 10), sport: "running", duration_minutes: 22 }],
    loading: false,
  }),
}));

function briefing(client) {
  return (
    <QueryClientProvider client={client}>
      <CoachBriefing athlete={{ id: "athlete-profile" }} />
    </QueryClientProvider>
  );
}

describe("dashboard coaching requests", () => {
  beforeEach(() => {
    mocks.isPro = false;
    mocks.invoke.mockReset();
  });
  afterEach(cleanup);

  it("shows the entitlement without issuing an AI call on Home", () => {
    render(briefing(new QueryClient()));
    expect(screen.getByText("AI briefings are included with Pro.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Generate briefing" })).toBeNull();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("waits for a deliberate retry and reuses a completed briefing on return", async () => {
    mocks.isPro = true;
    mocks.invoke
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockResolvedValueOnce({ data: { result: { assessment: "Keep your easy runs easy.", highlights: [] } } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: 3 } } });

    const view = render(briefing(client));
    expect(mocks.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Generate briefing" }));
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Keep your easy runs easy.")).toBeTruthy();
    expect(mocks.invoke).toHaveBeenCalledTimes(2);

    view.unmount();
    render(briefing(client));
    expect(screen.getByText("Keep your easy runs easy.")).toBeTruthy();
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
  });
});
