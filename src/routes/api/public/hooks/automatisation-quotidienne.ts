import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/automatisation-quotidienne")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ error: "method_not_allowed" }), {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            "Allow": "POST",
            "Cache-Control": "no-store",
          },
        }),
      POST: async ({ request }) => {
        const { secretMatches, providedCronSecret } = await import("@/lib/secret-compare.server");
        const accepted = [
          process.env["AUTOMATION_CRON_SECRET"],
          process.env["LOVABLE_CRON_SECRET"],
        ];
        if (!secretMatches(providedCronSecret(request), accepted)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          });
        }

        try {
          const { runDailyAutomation } = await import("@/lib/automation-daily.server");
          const result = await runDailyAutomation();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          console.error("daily automation failed", error);
          return new Response(
            JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "error" }),
            { status: 500, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
