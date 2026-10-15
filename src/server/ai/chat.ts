import "server-only";
import { convertToModelMessages, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage } from "ai";
import { z } from "zod";
import { deepModel } from "./models";

const MAX_MESSAGES = 40;
const MAX_CHARS = 60_000;

/** Chat history from useChat, bounded so one request can't carry an unbounded prompt. */
export const chatMessages = z
  .array(z.custom<UIMessage>((m) => typeof m === "object" && m !== null && "role" in m && "parts" in m))
  .min(1)
  .max(MAX_MESSAGES)
  .refine((ms) => JSON.stringify(ms).length <= MAX_CHARS, "Conversation too long; start a new one");

/** Streams a chat reply in the UI message protocol that useChat reads. */
export async function streamChat(instructions: string, messages: UIMessage[]): Promise<Response> {
  const result = streamText({
    model: deepModel(),
    maxRetries: 0,
    instructions,
    messages: await convertToModelMessages(messages),
  });
  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}

/** Plain text of a UI message (text parts only). */
export function messageText(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}
