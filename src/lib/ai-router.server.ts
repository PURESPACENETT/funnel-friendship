import { createOpenAI } from "@ai-sdk/openai";

export const AI_ROUTES = {
  prospecting: { model: "gpt-6-luna", reasoningEffort: "low" },
  quoteQualification: { model: "gpt-6.1-sol", reasoningEffort: "low" },
  // Reserved for future complex analysis; no current production task uses Astra.
  complexAnalysis: { model: "gpt-6-astra", reasoningEffort: "low" },
} as const;

export type AIRoute = keyof typeof AI_ROUTES;

interface TokenUsageSummary {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  totalTokens?: number | undefined;
}

export function createAIRouter(options: { apiKey?: string; fetch?: typeof fetch } = {}) {
  const apiKey = options.apiKey ?? process.env["OPENAI_API_KEY"];
  if (!apiKey) return null;

  const openai = createOpenAI({
    apiKey,
    // Pin direct OpenAI traffic even if an OpenAI-compatible gateway is configured globally.
    baseURL: "https://api.openai.com/v1",
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });

  return {
    modelFor(route: AIRoute) {
      return openai.responses(AI_ROUTES[route].model);
    },
    providerOptionsFor(route: AIRoute) {
      return {
        openai: {
          reasoningEffort: AI_ROUTES[route].reasoningEffort,
          reasoningSummary: null,
          store: false,
        },
      };
    },
  };
}

export async function logAIUsage(
  route: AIRoute,
  usage: PromiseLike<TokenUsageSummary>,
): Promise<void> {
  const totals = await usage;
  console.info("OpenAI request usage", {
    route,
    model: AI_ROUTES[route].model,
    inputTokens: totals.inputTokens ?? null,
    outputTokens: totals.outputTokens ?? null,
    totalTokens: totals.totalTokens ?? null,
  });
}
