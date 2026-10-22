import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import chatReducer, { addMessage } from "@/store/slices/chatSlice";
import AgentMessage from "./AgentMessage";
import { submitFeedback } from "@/services/feedbackService";
import type { ChatMessage } from "@/types";

vi.mock("@/services/feedbackService", () => ({
  submitFeedback: vi.fn().mockResolvedValue(undefined),
}));

// CodeBlock depends on the optional highlight.js assets; the feedback tests
// only need the markdown passthrough, so keep the dependency out of the suite.
vi.mock("./CodeBlock", () => ({
  CodeBlock: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <code className={className}>{children}</code>
  ),
}));

const message: ChatMessage = {
  id: "agent-answer",
  type: "agent",
  content: "A helpful answer",
  timestamp: "2026-10-20T00:00:00.000Z",
};

function renderMessage() {
  const store = configureStore({ reducer: { chat: chatReducer } });
  store.dispatch(addMessage(message));
  render(
    <Provider store={store}>
      <AgentMessage message={message} />
    </Provider>,
  );
  return store;
}

describe("AgentMessage feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates the chat state and calls the feedback seam once", () => {
    const store = renderMessage();
    fireEvent.click(screen.getByRole("button", { name: "Thumbs up" }));

    expect(store.getState().chat.messages[0].metadata?.feedback?.rating).toBe("up");
    expect(submitFeedback).toHaveBeenCalledTimes(1);
    expect(submitFeedback).toHaveBeenCalledWith("agent-answer", expect.objectContaining({ rating: "up" }));
  });

  it("opens the negative comment prompt and permits dismissing without rating", () => {
    const store = renderMessage();
    fireEvent.click(screen.getByRole("button", { name: "Thumbs down" }));
    expect(screen.getByRole("dialog", { name: "Tell us what was wrong" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(submitFeedback).not.toHaveBeenCalled();
    expect(store.getState().chat.messages[0].metadata?.feedback).toBeUndefined();
  });
});
