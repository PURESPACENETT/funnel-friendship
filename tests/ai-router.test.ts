import { describe, expect, test } from "bun:test";

import { AI_ROUTES, createAIRouter } from "@/lib/ai-router.server";

describe("OpenAI model routing", () => {
  test("routes high-volume prospecting to Luna and quote qualification to Sol", () => {
    const ai = createAIRouter({ apiKey: "sk-test" });

    expect(ai?.modelFor("prospecting").modelId).toBe("gpt-6-luna");
    expect(ai?.modelFor("quoteQualification").modelId).toBe("gpt-6.1-sol");
  });

  test("keeps Astra isolated for explicit complex analysis", () => {
    const ai = createAIRouter({ apiKey: "sk-test" });

    expect(ai?.modelFor("complexAnalysis").modelId).toBe("gpt-6-astra");
    expect(AI_ROUTES.complexAnalysis.model).not.toBe(AI_ROUTES.prospecting.model);
  });

  test("uses low reasoning effort and disables response storage for routed calls", () => {
    const ai = createAIRouter({ apiKey: "sk-test" });

    expect(ai?.providerOptionsFor("prospecting")).toEqual({
      openai: { reasoningEffort: "low", reasoningSummary: null, store: false },
    });
    expect(ai?.providerOptionsFor("quoteQualification")).toEqual({
      openai: { reasoningEffort: "low", reasoningSummary: null, store: false },
    });
  });
});
