import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import DashboardQuickActions from "../DashboardQuickActions";
import DashboardGreeting from "../DashboardGreeting";
import SectionHeading from "../../layout/SectionHeading";

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
    expect(markup).toContain("motion-reduce:transform-none");
    expect(markup).toContain("min-h-[64px]");
    expect((markup.match(/<a /g) || []).length).toBe(4);
  });
});

describe("dashboard visual hierarchy", () => {
  it("renders a restrained, readable hero with measured load labels", () => {
    const markup = renderToStaticMarkup(<DashboardGreeting athlete={{ first_name: "Test", current_ctl: 42, current_tsb: -3 }} />);
    expect(markup).toContain("Your training, in focus.");
    expect(markup).toContain("Fitness");
    expect(markup).toContain("Form");
    expect(markup).toContain("rounded-2xl");
    expect(markup).toContain("text-muted-foreground");
    expect(markup).toContain("tabular-nums");
    expect(markup).not.toContain("great day for a quality session");
  });
});

describe("narrow-screen section actions", () => {
  it("keeps the heading and its action accessible without forcing a single cramped row", () => {
    const markup = renderToStaticMarkup(
      <SectionHeading index="03" title="Recent activity" description="Your latest sessions" action={<a href="/import">All import options</a>} />
    );
    expect(markup).toContain("Recent activity");
    expect(markup).toContain("All import options");
    expect(markup).toContain('href="/import"');
    expect(markup).toContain("flex-col");
    expect(markup).toContain("sm:flex-row");
    expect(markup).toContain("w-full min-w-0");
  });
});
