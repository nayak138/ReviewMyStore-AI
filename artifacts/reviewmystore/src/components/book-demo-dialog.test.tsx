import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookDemoDialog } from "./book-demo-dialog";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  toast: vi.fn(),
  pending: [] as Array<{ resolve: () => void; reject: () => void }>,
  complete: (index = 0) => { mocks.pending.splice(index, 1)[0].resolve(); },
  fail: (index = 0) => { mocks.pending.splice(index, 1)[0].reject(); },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@workspace/api-client-react", () => ({
  useCreateDemoRequest: () => ({
      mutateAsync: (data: unknown) => {
        mocks.mutate(data);
        return new Promise<void>((resolve, reject) => {
          mocks.pending.push({ resolve, reject });
        });
      },
      reset: mocks.reset,
  }),
}));

async function openDialog(marketingDark = false) {
  const user = userEvent.setup();
  render(
    <BookDemoDialog marketingDark={marketingDark}>
      <button type="button">Start 7-Day Free Trial</button>
    </BookDemoDialog>,
  );
  await user.click(screen.getByRole("button", { name: "Start 7-Day Free Trial" }));
  return user;
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: /Agency/i }));
  await user.type(screen.getByRole("textbox", { name: "Name *" }), "Jane Smith");
  await user.type(screen.getByRole("textbox", { name: "Business or shop name *" }), "The Green Room");
  await user.type(screen.getByRole("textbox", { name: "Phone number *" }), "+91 98765 43210");
}

beforeEach(() => {
  mocks.mutate.mockClear();
  mocks.reset.mockClear();
  mocks.toast.mockClear();
  mocks.pending.length = 0;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("guided trial request dialog", () => {
  it("explains that submission requests a guided trial and scopes optional portal dark mode", async () => {
    await openDialog(true);
    expect(screen.getByRole("dialog")).toHaveClass("dark");
    expect(screen.getByRole("dialog")).toHaveTextContent("No 5-Star.AI account or credit card is needed to request it");
    expect(screen.getByRole("dialog")).toHaveTextContent("does not automatically renew or charge");
    expect(screen.getByRole("button", { name: /Send guided trial request/i })).toBeInTheDocument();
  });

  it.each([
    ["lead type", async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByRole("textbox", { name: "Name *" }), "Jane");
      await user.type(screen.getByRole("textbox", { name: "Business or shop name *" }), "The Green Room");
      await user.type(screen.getByRole("textbox", { name: "Phone number *" }), "1234567");
    }, "Please choose an option"],
    ["name", async (user: ReturnType<typeof userEvent.setup>) => {
      await fillValid(user);
      await user.clear(screen.getByRole("textbox", { name: "Name *" }));
    }, "Please enter your name"],
    ["shop name", async (user: ReturnType<typeof userEvent.setup>) => {
      await fillValid(user);
      await user.clear(screen.getByRole("textbox", { name: "Business or shop name *" }));
    }, "Please enter your shop name"],
    ["phone", async (user: ReturnType<typeof userEvent.setup>) => {
      await fillValid(user);
      await user.clear(screen.getByRole("textbox", { name: "Phone number *" }));
      await user.type(screen.getByRole("textbox", { name: "Phone number *" }), "123");
    }, "Please enter a valid phone number"],
  ])("does not submit without valid %s", async (_field, fill, message) => {
    const user = await openDialog();
    await fill(user);
    await user.click(screen.getByRole("button", { name: /Send guided trial request/i }));
    expect(await screen.findByText(message)).toBeVisible();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("uses arrow keys for mutually exclusive lead types and maps fields including honeypot", async () => {
    const user = await openDialog();
    expect(screen.getByRole("dialog")).not.toHaveClass("dark");
    const agency = screen.getByRole("radio", { name: /Agency/i });
    const shop = screen.getByRole("radio", { name: /Single Shop/i });
    await user.click(agency);
    fireEvent.keyDown(agency, { key: "ArrowRight" });
    await waitFor(() => expect(shop).toHaveAttribute("data-state", "checked"));
    fireEvent.keyUp(shop, { key: "ArrowRight" });
    expect(agency).toHaveAttribute("data-state", "unchecked");
    await user.type(screen.getByRole("textbox", { name: "Name *" }), "Jane Smith");
    await user.type(screen.getByRole("textbox", { name: "Business or shop name *" }), "The Green Room");
    await user.type(screen.getByRole("textbox", { name: "Phone number *" }), "1234567890");
    await user.click(screen.getByRole("button", { name: /Send guided trial request/i }));
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledWith({
      data: {
        name: "Jane Smith",
        company: "The Green Room",
        leadType: "SINGLE_SHOP",
        phone: "1234567890",
        website: undefined,
      },
    }));
    expect(document.getElementById("demo-website-field")).toHaveAttribute("tabindex", "-1");
  });

  it("preserves honeypot value in the generated mutation mapping", async () => {
    const user = await openDialog();
    await fillValid(user);
    fireEvent.change(document.getElementById("demo-website-field")!, { target: { value: "bot.example" } });
    await user.click(screen.getByRole("button", { name: /Send guided trial request/i }));
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledWith({
      data: {
        name: "Jane Smith",
        company: "The Green Room",
        leadType: "AGENCY",
        phone: "+91 98765 43210",
        website: "bot.example",
      },
    }));
  });

  it("prevents duplicate submissions while pending and allows retry after a visible error", async () => {
    const user = await openDialog();
    await fillValid(user);
    const submit = screen.getByRole("button", { name: /Send guided trial request/i });
    await user.click(submit);
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Sending request/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Sending request/i }));
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    await act(async () => mocks.fail());
    expect(screen.getByRole("alert")).toHaveTextContent("Your details are still here");
    expect(screen.getByRole("textbox", { name: "Name *" })).toHaveValue("Jane Smith");
    await user.click(screen.getByRole("button", { name: /Send guided trial request/i }));
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("holds the pending guard through close/reopen and ignores the old success", async () => {
    const user = await openDialog();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /Send guided trial request/i }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    // Reopen before the close animation finishes: it must still reset this new visit.
    await user.click(screen.getByRole("button", { name: "Start 7-Day Free Trial" }));
    expect(screen.getByRole("textbox", { name: "Name *" })).toHaveValue("");
    expect(screen.getByRole("button", { name: /Sending request/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Sending request/i }));
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    await act(async () => mocks.complete());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send guided trial request/i })).toBeEnabled();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /Send guided trial request/i }));
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    await act(async () => mocks.complete());
    expect(screen.getByRole("status")).toHaveTextContent("Your trial has not started yet");
  });

  it("keeps pending guarded after the delayed reset and ignores an old failure", async () => {
    const user = await openDialog();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /Send guided trial request/i }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(mocks.reset).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Start 7-Day Free Trial" }));
    expect(screen.getByRole("button", { name: /Sending request/i })).toBeDisabled();
    await act(async () => mocks.fail());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Send guided trial request/i })).toBeEnabled();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /Send guided trial request/i }));
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
  });

  it("acknowledges a request without promising access and resets after close", async () => {
    const user = await openDialog();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /Send guided trial request/i }));
    await act(async () => mocks.complete());
    expect(screen.getByRole("status")).toHaveTextContent("Your trial has not started yet");
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(mocks.reset).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Start 7-Day Free Trial" }));
    expect(screen.getByRole("textbox", { name: "Name *" })).toHaveValue("");
    expect(screen.getByRole("radio", { name: /Agency/i })).toHaveAttribute("data-state", "unchecked");
  });
});