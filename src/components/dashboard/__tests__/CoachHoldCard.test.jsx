// @vitest-environment happy-dom
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CoachHoldCard from "../CoachHoldCard";

const renderCard = (injury) =>
  render(
    <MemoryRouter>
      <CoachHoldCard injury={injury} />
    </MemoryRouter>
  );

const holdSignal = (overrides = {}) => ({
  level: "hold",
  loading: false,
  unavailable: false,
  clearing: false,
  clearError: null,
  summary: "Your coach paused running in the conversation on Nov 11. It stays paused until you are cleared.",
  evidence: [
    {
      date: "2026-11-11T08:00:00Z",
      type: "coach",
      source: "Coach message",
      snippet: "Stop running until the knee injury settles.",
    },
  ],
  clearHold: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn(),
  ...overrides,
});

describe("CoachHoldCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("1. shows the active hold, its reason, date and source", () => {
    renderCard(holdSignal());
    expect(screen.getByText("Running paused")).toBeTruthy();
    expect(screen.getByText("Current coaching status")).toBeTruthy();
    expect(screen.getByText(/paused running in the conversation/)).toBeTruthy();
    expect(screen.getByText(/Coach message, Nov 11, 2026/)).toBeTruthy();
  });

  it("keeps the evidence collapsed until asked for, wired for screen readers", () => {
    renderCard(holdSignal());
    const toggle = screen.getByRole("button", { name: /why am i seeing this/i });
    expect(toggle.tagName).toBe("BUTTON");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    const panelId = toggle.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId).hasAttribute("hidden")).toBe(true);

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById(panelId).hasAttribute("hidden")).toBe(false);
    expect(screen.getByText(/Stop running until the knee injury settles/)).toBeTruthy();
  });

  it("3. offers a clearly labelled, confirmed clearance with the required disclosure", async () => {
    renderCard(holdSignal());
    fireEvent.click(screen.getByRole("button", { name: /i've been cleared — review hold/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeTruthy();
    expect(screen.getByText("Review this coach hold")).toBeTruthy();
    expect(screen.getByText(/marked as resolved/)).toBeTruthy();
    expect(screen.getByText(/stay in your conversation history/)).toBeTruthy();
    expect(screen.getByText(/can create another hold/)).toBeTruthy();
    expect(screen.getByText(/not a medical assessment/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /keep hold/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /confirm clearance/i })).toBeTruthy();
  });

  it("clears only after confirmation and announces success", async () => {
    const injury = holdSignal();
    renderCard(injury);
    expect(injury.clearHold).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /i've been cleared — review hold/i }));
    fireEvent.click(await screen.findByRole("button", { name: /confirm clearance/i }));

    await waitFor(() => expect(injury.clearHold).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/Coach hold cleared/)
    );
  });

  it("keeps the hold and announces a failure when persistence fails", async () => {
    const injury = holdSignal({ clearHold: vi.fn().mockRejectedValue(new Error("save failed")) });
    renderCard(injury);

    fireEvent.click(screen.getByRole("button", { name: /i've been cleared — review hold/i }));
    fireEvent.click(await screen.findByRole("button", { name: /confirm clearance/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/still active/i);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/still active/i);
  });

  it("2/4. renders a caution state without offering a clearance", () => {
    renderCard(
      holdSignal({
        level: "caution",
        summary: "The conversation on Nov 11 flagged a niggle or soreness.",
      })
    );
    expect(screen.getByText("Caution")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /i've been cleared/i })).toBeNull();
  });

  it("2. states plainly when no hold is active", () => {
    renderCard(holdSignal({ level: "none", summary: null, evidence: [] }));
    expect(screen.getByText("No active coach hold.")).toBeTruthy();
  });

  it("hideWhenNone keeps the quiet state off dense surfaces", () => {
    const { container } = render(
      <MemoryRouter>
        <CoachHoldCard injury={holdSignal({ level: "none", summary: null, evidence: [] })} hideWhenNone />
      </MemoryRouter>
    );
    expect(container.textContent).toBe("");
  });

  it("9. shows a loading status instead of implying clearance", () => {
    renderCard(holdSignal({ loading: true, level: "none" }));
    expect(screen.getByRole("status").textContent).toMatch(/Checking your coaching status/i);
    expect(screen.queryByText(/No active coach hold/i)).toBeNull();
  });

  it("7. Escape closes the clearance dialog without clearing the hold", async () => {
    const injury = holdSignal();
    renderCard(injury);
    fireEvent.click(screen.getByRole("button", { name: /i've been cleared — review hold/i }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(injury.clearHold).not.toHaveBeenCalled();
  });

  it("8. stacks its actions full-width for narrow screens", () => {
    renderCard(holdSignal());
    const actions = [
      screen.getByRole("link", { name: /talk to coach/i }),
      screen.getByRole("button", { name: /i've been cleared — review hold/i }),
    ];
    for (const el of actions) {
      expect(el.className).toContain("w-full");
      expect(el.className).toContain("sm:w-auto");
      expect(el.className).toContain("min-h-[44px]");
    }
  });

  it("9. an unavailable load is an alert with a retry, not a clearance", () => {
    const injury = holdSignal({ unavailable: true, level: "none", error: "offline" });
    renderCard(injury);
    expect(screen.getByRole("alert").textContent).toMatch(/cannot confirm whether a hold is active/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(injury.reload).toHaveBeenCalled();
  });
});