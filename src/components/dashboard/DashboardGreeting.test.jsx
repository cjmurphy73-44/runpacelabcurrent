import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DashboardGreeting from "./DashboardGreeting";

function renderGreeting(athlete) {
  return render(
    <MemoryRouter>
      <DashboardGreeting athlete={athlete} />
    </MemoryRouter>,
  );
}

function metricValue(region, label) {
  return within(region).getByText(label).closest("div").querySelector("dd").textContent;
}

describe("DashboardGreeting training load snapshot", () => {
  it("shows all three existing stored load estimates and links to physiology", () => {
    renderGreeting({ first_name: "Synthetic", current_ctl: 42.4, current_atl: 49.7, current_tsb: -7.3 });

    const region = screen.getByRole("region", { name: "Training load snapshot" });
    expect(metricValue(region, "Fitness")).toBe("42");
    expect(metricValue(region, "Fatigue")).toBe("50");
    expect(metricValue(region, "Form")).toBe("-7");
    expect(screen.getByRole("link", { name: /Explore physiology/ }).getAttribute("href")).toBe("/physiology");
    expect(within(region).getByText(/not live measurements/i)).toBeTruthy();
  });

  it("keeps valid zero distinct from missing values and never invents load", () => {
    renderGreeting({ current_ctl: 0, current_atl: null, current_tsb: Number.NaN });

    const region = screen.getByRole("region", { name: "Training load snapshot" });
    expect(metricValue(region, "Fitness")).toBe("0");
    expect(metricValue(region, "Fatigue")).toBe("—");
    expect(metricValue(region, "Form")).toBe("—");
    expect(within(region).getByText(/zero may be a default/i)).toBeTruthy();
  });

  it("keeps load labels readable on compact phone widths", () => {
    const { container } = renderGreeting({
      current_ctl: 36, current_atl: 28, current_tsb: 8,
    });
    const region = screen.getByRole("region", { name: "Training load snapshot" });
    const metrics = within(region).getByText("Fitness").closest("dl");
    expect(metrics.className).toContain("grid-cols-1 min-[360px]:grid-cols-3");
    expect(within(region).getByText("Longer-term load").className).not.toContain("hidden");
    expect(within(region).getByText("Shorter-term load")).toBeTruthy();
    expect(within(region).getByText("Fitness minus fatigue")).toBeTruthy();
    expect(container.querySelector('a[href="/physiology"]').className).toContain("focus-visible:outline");
  });

  it("formats positive form explicitly without turning it into a readiness verdict", () => {
    renderGreeting({ current_ctl: 40, current_atl: 30, current_tsb: 10 });
    const region = screen.getByRole("region", { name: "Training load snapshot" });
    expect(metricValue(region, "Form")).toBe("+10");
    expect(within(region).queryByText(/green light|ready for a quality session/i)).toBeNull();
  });
});
