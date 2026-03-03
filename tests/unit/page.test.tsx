import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks for server-side dependencies
// ---------------------------------------------------------------------------

jest.mock("@/app/lib/utils/session", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/app/lib/db/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

import { getSession } from "@/app/lib/utils/session";
import Home from "@/app/page";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;

describe("Home Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders hero section with app name", async () => {
    mockedGetSession.mockResolvedValue(null);

    const jsx = await Home();
    render(jsx);

    expect(screen.getByText(/Pikes Calendar/)).toBeTruthy();
  });

  it("shows Get Started and Sign In when logged out", async () => {
    mockedGetSession.mockResolvedValue(null);

    const jsx = await Home();
    render(jsx);

    expect(screen.getByRole("link", { name: /get started/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeTruthy();
  });

  it("shows welcome message when logged in", async () => {
    mockedGetSession.mockResolvedValue({
      userId: "user-1",
      firstName: "John",
      email: "john@test.com",
    } as Awaited<ReturnType<typeof getSession>>);

    const jsx = await Home();
    render(jsx);

    expect(screen.getByText(/Welcome back/)).toBeTruthy();
    expect(screen.getByText("John")).toBeTruthy();
    expect(screen.getByRole("link", { name: /go to dashboard/i })).toBeTruthy();
  });

  it("renders all four feature cards", async () => {
    mockedGetSession.mockResolvedValue(null);

    const jsx = await Home();
    render(jsx);

    expect(screen.getByText("Event Management")).toBeTruthy();
    expect(screen.getByText("Smart Reminders")).toBeTruthy();
    expect(screen.getByText("Collaboration")).toBeTruthy();
    expect(screen.getByText("Analytics")).toBeTruthy();
  });
});
