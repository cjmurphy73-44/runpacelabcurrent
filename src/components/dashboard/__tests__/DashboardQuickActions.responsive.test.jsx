import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import DashboardQuickActions from "../DashboardQuickActions";
import DashboardGreeting from "../DashboardGreeting";

describe("responsive dashboard quick actions", () => {
  it("exposes the four primary destinations with readable links", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter><DashboardQuickActions /></MemoryRouter>
    );
    for (const route of ["/workouts", "/calendar", "/recovery", "/import"]) {
      expect(markup).toContain(`href="${route}"`);
    }
    expect(markup).toContain("min-[360px]:grid-cols-2");
    expect(markup).toContain("focus-visible:ring-2");
  });
});

describe("dashboard visual hierarchy", () => {
  it("renders a restrained, readable hero with measured load labels", () => {
    const markup = renderToStaticMarkup(<DashboardGreeting athlete={{ first_name: "Test", current_ctl: 42, current_tsb: -3 }} />);
    expect(markup).toContain("Your training, in focus.");
    expect(markup).toContain("Fitness");
    expect(markup).toContain("Form");
    expect(markup).toContain("rounded-2xl");
    expect(markup).not.toContain("great day for a quality session");
  });
});
