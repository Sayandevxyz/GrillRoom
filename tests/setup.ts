import "@testing-library/jest-dom/vitest";
import "vitest-axe/extend-expect";
import { vi } from "vitest";

if (typeof window !== "undefined") {
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  }
  if (!navigator.clipboard) {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  }
}

declare module "vitest" {
  interface Assertion {
    toHaveNoViolations(): void;
  }
}
