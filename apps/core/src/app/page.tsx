import Link from "next/link";
import { getRegistry } from "@/lib/registry";

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core",
  insurance: "Insurance",
  accounting: "Accounting",
  communications: "Communications",
  wealth: "Wealth",
  association: "Association",
  integration: "Integrations",
};

export default function Home() {
  const modules = getRegistry().composable();
  const counts = new Map<string, number>();
  for (const m of modules) {
    counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
        Prism Core
      </p>
      <h1 className="mt-3 text-5xl font-semibold tracking-tight">
        Software your way.
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        The core is not a CRM — it is the composer. Pick only the modules your
        agency needs, customize them yourself, and pay only for what you use.
      </p>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/compose"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Compose a workspace
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-indigo-300"
        >
          Open the demo workspace
        </Link>
        <Link
          href="/sign-in"
          className="px-5 py-2.5 text-sm font-semibold text-gray-500 transition hover:text-gray-900"
        >
          Sign in
        </Link>
      </div>

      <p className="mt-12 text-sm text-gray-500">
        {modules.length} modules across {counts.size} categories — every one
        registered with the kernel, every one composable.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[...counts.entries()].map(([category, count]) => (
          <span
            key={category}
            className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600"
          >
            {CATEGORY_LABELS[category] ?? category} · {count}
          </span>
        ))}
      </div>
    </main>
  );
}
