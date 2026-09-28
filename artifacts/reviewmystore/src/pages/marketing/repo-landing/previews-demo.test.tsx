import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReviewGeneratorDemo } from "./previews-demo";

afterEach(cleanup);

describe("ReviewGeneratorDemo business reply mode", () => {
  it("drafts a relevant reply and keeps the Post Reply action demo-only", () => {
    render(<ReviewGeneratorDemo />);
    fireEvent.click(screen.getByTestId("button-demo-business-mode"));

    const review = screen.getByTestId("textarea-demo-owner-review") as HTMLTextAreaElement;
    const reply = screen.getByTestId("textarea-demo-draft") as HTMLTextAreaElement;
    expect(reply.value).toContain("glad you enjoyed the food");
    expect(reply.value).toContain("sorry your drinks took nearly 25 minutes");

    fireEvent.change(review, {
      target: { value: "The food was excellent, but drinks took almost 30 minutes." },
    });
    fireEvent.click(screen.getByTestId("button-demo-generate"));
    expect(reply.value).toContain("drinks took almost 30 minutes");

    const postButton = screen.getByRole("button", { name: "Post Reply" });
    expect(postButton.querySelector("svg")).not.toBeNull();
    fireEvent.click(postButton);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Demo only — this reply was not posted to Google.",
    );
  });

  it("loads a matching sample review and reply when a different business is selected", () => {
    render(<ReviewGeneratorDemo />);
    fireEvent.click(screen.getByTestId("button-demo-business-mode"));
    fireEvent.change(screen.getByTestId("select-demo-business"), {
      target: { value: "apex" },
    });

    const review = screen.getByTestId("textarea-demo-owner-review") as HTMLTextAreaElement;
    const reply = screen.getByTestId("textarea-demo-draft") as HTMLTextAreaElement;
    expect(review.value).toContain("appointment");
    expect(reply.value).toContain("sorry your wait was longer than expected");

    fireEvent.click(screen.getByTestId("button-demo-generate"));
    expect(reply.value).toContain("sorry your wait was longer than expected");
    expect(reply.value).not.toContain("drinks");
  });
});