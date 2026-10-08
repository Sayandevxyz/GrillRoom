import "@testing-library/jest-dom/vitest";
import "vitest-axe/extend-expect";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<T = any> {
    toHaveNoViolations(): void;
  }
}
