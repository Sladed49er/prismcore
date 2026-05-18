"use client";

import { useEffect, useState } from "react";

/**
 * The dashboard greeting — time-of-day aware. Rendered on the client so the
 * greeting and date reflect the viewer's own local time, not the server's.
 */
export function DashboardGreeting({ workspaceName }: { workspaceName: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const hour = now?.getHours() ?? 9;
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLine = now
    ? now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{greeting}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {dateLine ? `${dateLine} · ` : ""}
        {workspaceName} at a glance
      </p>
    </div>
  );
}
