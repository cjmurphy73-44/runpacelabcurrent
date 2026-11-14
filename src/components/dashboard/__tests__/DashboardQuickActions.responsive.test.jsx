import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import DashboardQuickActions from "../DashboardQuickActions";

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
