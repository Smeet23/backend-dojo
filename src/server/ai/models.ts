import "server-only";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { defaultSettingsMiddleware, wrapLanguageModel } from "ai";
import type { LanguageModelV4 } from "@ai-sdk/provider";

/**
 * Both providers are on free tiers, so every call goes through a chain: if one model is
 * rate-limited or overloaded, the next one answers instead.
 *
 * - quick: short prompts (grading, "why was I wrong"). Groq is fastest, but its free tier
 *   allows only ~8k tokens a minute, so it can't take whole lessons.
 * - deep: long context (tutor, interviews, reviews, question writing). Gemini first.
 */

function groqModel(): LanguageModelV4 {
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  return wrapLanguageModel({
    model: groq("openai/gpt-oss-120b"),
    middleware: defaultSettingsMiddleware({ settings: { providerOptions: { groq: { reasoningEffort: "low" } } } }),
  });
}

function geminiModel(id: string): LanguageModelV4 {
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  return wrapLanguageModel({
    model: google(id),
    middleware: defaultSettingsMiddleware({
      settings: { providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } } },
    }),
  });
}

/** Tries each model in turn until one accepts the request. */
export function fallbackModel(models: LanguageModelV4[]): LanguageModelV4 {
  async function attempt<T>(call: (m: LanguageModelV4) => PromiseLike<T>): Promise<T> {
    let lastError: unknown;
    for (const model of models) {
      try {
        return await call(model);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw err;
        console.warn(`AI model ${model.provider}/${model.modelId} failed, trying the next one:`, err instanceof Error ? err.message : err);
        lastError = err;
      }
    }
    throw lastError;
  }
  return {
    specificationVersion: "v4",
    provider: "fallback",
    modelId: models.map((m) => m.modelId).join(" > "),
    supportedUrls: {},
    doGenerate: (options) => attempt((m) => m.doGenerate(options)),
    doStream: (options) => attempt((m) => m.doStream(options)),
  };
}

export function quickModel(): LanguageModelV4 {
  return fallbackModel([groqModel(), geminiModel("gemini-3.7-flash"), geminiModel("gemini-3.5-flash-lite")]);
}

export function deepModel(): LanguageModelV4 {
  return fallbackModel([geminiModel("gemini-3.7-flash"), geminiModel("gemini-3.5-flash"), groqModel()]);
}
