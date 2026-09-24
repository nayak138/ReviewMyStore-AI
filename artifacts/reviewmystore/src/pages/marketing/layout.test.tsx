import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MarketingLayout } from "./layout";

const docsUrl =
  "https://5-star-ai.notion.site/5-STAR-AI-DOCS-3e5e55dd92d580d79d1ecb93dea84e2d";

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ["/", vi.fn()],
}));

vi.mock("@/components/book-demo-dialog", () => ({
  BookDemoDialog: ({ children }: { children: ReactNode }) => children,
}));

afterEach(() => {
  cleanup();
});

describe("MarketingLayout footer", () => {
  it("links to the public Docs page in a safe new tab", () => {
    render(
      <MarketingLayout>
        <div />
      </MarketingLayout>,
    );

    const docsLink = screen.getByRole("link", { name: "Docs" });
    expect(docsLink).toHaveAttribute("href", docsUrl);
    expect(docsLink).toHaveAttribute("target", "_blank");
    expect(docsLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});