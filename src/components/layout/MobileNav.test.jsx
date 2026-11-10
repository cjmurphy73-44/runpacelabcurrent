import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MobileNav from "./MobileNav";

vi.mock("@/context/UIPreferencesContext", () => ({
  useUIPreferences: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));
vi.mock("@/lib/AuthContext", () => ({ useAuth: () => ({ user: { role: "athlete" } }) }));
vi.mock("@/hooks/useCoachAccess", () => ({
  useCoachAccess: () => ({ isPro: true, canUseCoachWorkspace: false }),
}));
vi.mock("@/components/layout/ModeSwitch", () => ({ default: () => <button type="button">Display mode</button> }));

function CurrentPath() {
  const location = useLocation();
  return <output aria-label="Current route">{location.pathname}</output>;
}

describe("MobileNav", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens More tools and navigates to Physiology Lab from the mobile menu", async () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <MobileNav />
        <Routes><Route path="*" element={<CurrentPath />} /></Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const tools = await screen.findByRole("button", { name: /More tools/ });
    expect(tools.getAttribute("aria-expanded")).toBe("false");
    tools.focus();
    expect(document.activeElement).toBe(tools);
    fireEvent.click(tools);
    await waitFor(() => expect(tools.getAttribute("aria-expanded")).toBe("true"));

    const physiology = await screen.findByRole("link", { name: "Physiology Lab" });
    expect(physiology.getAttribute("href")).toBe("/physiology");
    expect(physiology.className).toContain("min-h-[44px]");
    fireEvent.click(physiology);

    await waitFor(() => expect(screen.getByLabelText("Current route").textContent).toBe("/physiology"));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Menu" })).toBeNull());
  });
});
