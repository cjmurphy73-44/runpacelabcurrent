import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DashboardQuickActions from "./DashboardQuickActions";

describe("DashboardQuickActions", () => {
  it("offers a direct responsive shortcut to the existing training plan", () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardQuickActions />
      </MemoryRouter>,
    );

    const planLink = screen.getByRole("link", { name: /Training plan.*Your upcoming sessions/ });
    expect(planLink.getAttribute("href")).toBe("/plan");
    expect(container.firstChild.className).toContain("grid-cols-2 sm:grid-cols-3 lg:grid-cols-5");
  });
});
