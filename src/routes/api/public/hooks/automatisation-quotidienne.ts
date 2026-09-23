import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/automatisation-quotidienne")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accepted = [
          process.env["AUTOMATION_CRON_SECRET"],
          process.env["LOVABLE_CRON_SECRET"],
        ].filter((value): value is string => Boolean(value));
        const provided = request.headers.get("x-cron-secret");
        if (accepted.length === 0 || !provided || !accepted.includes(provided)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { runDailyAutomation } = await import("@/lib/automation-daily.server");
          const result = await runDailyAutomation();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("daily automation failed", error);
          return new Response(
            JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
