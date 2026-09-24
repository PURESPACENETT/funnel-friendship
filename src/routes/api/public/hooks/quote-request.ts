import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { quoteRequestSchema } from "@/lib/quotes-shared";
import { submitQuoteRequest } from "@/lib/quotes.functions";

const secretSchema = z.string().min(32).max(256);
const DEFAULT_ALLOWED_ORIGINS = new Set([
  "https://purespacenett.com",
  "https://www.purespacenett.com",
]);

function corsHeaders(origin: string | null): HeadersInit {
  const configured = (process.env["PUBLIC_QUOTE_WEBHOOK_ORIGIN"] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigins = new Set(
    configured.length ? configured : DEFAULT_ALLOWED_ORIGINS,
  );
  const allowOrigin =
    origin && allowedOrigins.has(origin)
      ? origin
      : [...allowedOrigins][0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-quote-webhook-secret",
    "Vary": "Origin",
  };
}

export const Route = createFileRoute("/api/public/hooks/quote-request")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, {
          status: 204,
          headers: corsHeaders(request.headers.get("origin")),
        }),
      GET: async () =>
        new Response("Method Not Allowed", {
          status: 405,
          headers: { Allow: "POST, OPTIONS", "X-Robots-Tag": "noindex, nofollow" },
        }),
      POST: async ({ request }) => {
        const headers = corsHeaders(request.headers.get("origin"));
        const expected =
          process.env["PUBLIC_QUOTE_WEBHOOK_SECRET"] ??
          process.env["B2B_LEAD_WEBHOOK_SECRET"] ??
          "";
        const provided = request.headers.get("x-quote-webhook-secret") ?? "";

        if (!expected || !secretSchema.safeParse(expected).success || provided !== expected) {
          return Response.json(
            { error: "unauthorized" },
            { status: 401, headers },
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { error: "Requête invalide" },
            { status: 400, headers },
          );
        }

        const parsed = quoteRequestSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            {
              error: "Données de demande de devis invalides",
              details: parsed.error.flatten().fieldErrors,
            },
            { status: 400, headers },
          );
        }

        try {
          const result = await submitQuoteRequest({ data: parsed.data });
          return Response.json(
            { ok: true, ...result },
            { status: 200, headers },
          );
        } catch (error) {
          console.error("External quote request import failed", error);
          return Response.json(
            { error: "Enregistrement impossible" },
            { status: 500, headers },
          );
        }
      },
    },
  },
});
