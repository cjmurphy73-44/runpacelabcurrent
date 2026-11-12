// @vitest-environment happy-dom
import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  filter: vi.fn(),
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      AthleteProfile: { get: mocks.get, update: mocks.update },
    },
  },
}));

import { ServiceProvider } from "@/services/providers/ServiceContext";
import { useCoachInjurySignal } from "../useCoachInjurySignal";

const wrapper = ({ children }) =>
  React.createElement(
    ServiceProvider,
    { services: { coachMessageRepo: { filter: mocks.filter } } },
    children
  );

const message = (content_text, created_date) => ({
  content_text,
  created_date,
  message_type: "coach",
});

const injury = (text, date) => message(text, new Date(Date.now() - date).toISOString());
const hoursAgo = (h) => h * 3600 * 1000;

describe("useCoachInjurySignal", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.update.mockReset();
    mocks.filter.mockReset();
  });

  it("derives an active hold from the coach conversation", async () => {
    mocks.filter.mockResolvedValue([
      injury("Stop running until the injury settles.", hoursAgo(5)),
    ]);
    mocks.get.mockResolvedValue({ id: "ath-1", coach_hold_cleared_at: null });

    const { result } = renderHook(() => useCoachInjurySignal("ath-1"), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.level).toBe("hold");
    expect(result.current.unavailable).toBe(false);
  });

  it("5. failed persistence leaves the hold active and reports the error", async () => {
    mocks.filter.mockResolvedValue([
      injury("Stop running until the injury settles.", hoursAgo(5)),
    ]);
    mocks.get.mockResolvedValue({ id: "ath-1", coach_hold_cleared_at: null });
    mocks.update.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useCoachInjurySignal("ath-1"), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.clearHold()).rejects.toThrow("network down");
    });

    expect(result.current.level).toBe("hold");
    expect(result.current.clearing).toBe(false);
    expect(result.current.clearError).toBe("network down");
    expect(result.current.clearedAt).toBeNull();
  });

  it("ignores duplicate clearance clicks and persists once", async () => {
    mocks.filter.mockResolvedValue([
      injury("Stop running until the injury settles.", hoursAgo(5)),
    ]);
    let persisted = null;
    mocks.get.mockImplementation(async () => ({ id: "ath-1", coach_hold_cleared_at: persisted }));
    let resolveUpdate;
    mocks.update.mockImplementation(
      (_id, data) => new Promise((resolve) => {
        resolveUpdate = () => {
          persisted = data.coach_hold_cleared_at;
          resolve({ id: "ath-1" });
        };
      })
    );

    const { result } = renderHook(() => useCoachInjurySignal("ath-1"), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let first;
    let second;
    act(() => {
      first = result.current.clearHold();
      second = result.current.clearHold();
    });
    await act(async () => {
      resolveUpdate();
      await Promise.all([first, second]);
    });

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(result.current.level).toBe("none");
  });

  it("does not clear the hold when an update succeeds but the saved profile lacks clearance", async () => {
    mocks.filter.mockResolvedValue([
      injury("Stop running until the injury settles.", hoursAgo(5)),
    ]);
    mocks.get.mockResolvedValue({ id: "ath-1", coach_hold_cleared_at: null });
    mocks.update.mockResolvedValue({ id: "ath-1" });

    const { result } = renderHook(() => useCoachInjurySignal("ath-1"), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.clearHold()).rejects.toThrow("could not be verified");
    });

    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(result.current.level).toBe("hold");
    expect(result.current.clearedAt).toBeNull();
    expect(result.current.clearError).toMatch(/could not be verified/);
  });

  it("9. a failed load is reported as unavailable, never as clearance", async () => {
    mocks.filter.mockRejectedValue(new Error("offline"));
    mocks.get.mockResolvedValue({ id: "ath-1", coach_hold_cleared_at: null });

    const { result } = renderHook(() => useCoachInjurySignal("ath-1"), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.unavailable).toBe(true);
    expect(result.current.error).toBe("offline");
    expect(result.current.clearedAt).toBeNull();
  });

  it("refreshes every mounted surface after a confirmed clearance", async () => {
    mocks.filter.mockResolvedValue([
      injury("Stop running until the injury settles.", hoursAgo(5)),
    ]);
    let persisted = null;
    mocks.get.mockImplementation(async () => ({ id: "ath-1", coach_hold_cleared_at: persisted }));
    mocks.update.mockImplementation(async (_id, data) => {
      persisted = data.coach_hold_cleared_at;
      return { id: "ath-1" };
    });

    const first = renderHook(() => useCoachInjurySignal("ath-1"), { wrapper });
    const second = renderHook(() => useCoachInjurySignal("ath-1"), { wrapper });
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.level).toBe("hold");

    await act(async () => {
      await first.result.current.clearHold();
    });

    await waitFor(() => expect(first.result.current.level).toBe("none"));
    await waitFor(() => expect(second.result.current.level).toBe("none"));
    expect(second.result.current.clearedAt).not.toBeNull();
  });
});