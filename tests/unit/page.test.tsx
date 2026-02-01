import { render } from "@testing-library/react";
import Home from "@/app/page";

describe("Home Page", () => {
  it("renders without crashing", () => {
    const { container } = render(<Home />);
    expect(container).toBeTruthy();
  });
});
