import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const submitContactMessageAction = vi.fn();

vi.mock("@/lib/actions/messages", () => ({
  submitContactMessageAction: (...args: unknown[]) => submitContactMessageAction(...args),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { ContactForm } from "@/components/site/contact-form";

async function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alex Example" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alex@example.com" } });
  fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "A project" } });
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "I would like to discuss a project with you." },
  });
}

describe("ContactForm", () => {
  beforeEach(() => {
    submitContactMessageAction.mockReset();
  });

  it("blocks submission and shows field errors when empty", async () => {
    render(<ContactForm />);

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByText("Tell me your name")).toBeTruthy();
    });
    expect(screen.getByText("Enter a valid email address")).toBeTruthy();
    expect(submitContactMessageAction).not.toHaveBeenCalled();
  });

  it("shows a success state only after the action confirms storage", async () => {
    submitContactMessageAction.mockResolvedValue({
      ok: true,
      message: "Message sent.",
    });

    render(<ContactForm />);
    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByText("Your message has been sent.")).toBeTruthy();
    });
    expect(submitContactMessageAction).toHaveBeenCalledTimes(1);
    const payload = submitContactMessageAction.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.email).toBe("alex@example.com");
  });

  it("surfaces server errors and does not claim success", async () => {
    submitContactMessageAction.mockResolvedValue({
      ok: false,
      error: "Your message could not be saved. Please try again in a moment.",
      fieldErrors: { subject: ["That subject is not allowed."] },
    });

    render(<ContactForm />);
    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByText("Message not sent")).toBeTruthy();
    });
    expect(screen.queryByText("Your message has been sent.")).toBeNull();
    expect(screen.getByText("That subject is not allowed.")).toBeTruthy();
  });

  it("marks invalid fields for assistive technology", async () => {
    render(<ContactForm />);
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Name").getAttribute("aria-invalid")).toBe("true");
    });
  });
});
