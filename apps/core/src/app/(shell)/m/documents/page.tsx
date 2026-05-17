import Link from "next/link";
import { requireModule } from "@/lib/kernel";

/** Sub-modules that are built and live. */
const BUILT = [
  {
    href: "/m/documents/library",
    name: "Document Library",
    desc: "The document register — every form and agreement on file.",
  },
  {
    href: "/m/documents/templates",
    name: "Templates",
    desc: "Reusable document templates, drafted and published.",
  },
  {
    href: "/m/documents/folders",
    name: "Folders",
    desc: "The folder structure the library is organized under.",
  },
  {
    href: "/m/documents/shares",
    name: "Shared Links",
    desc: "Shareable links to documents — with expiry and revocation.",
  },
];

/** The remaining documents sub-modules, ported in over the coming turns. */
const PLANNED: string[] = [];

export default async function DocumentsHub() {
  await requireModule("documents");

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Documents</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The agency&rsquo;s document management — the library, reusable
        templates, the folder structure, and shareable links.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {BUILT.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300"
          >
            <h3 className="font-semibold">{s.name}</h3>
            <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
          </Link>
        ))}
      </div>

      {PLANNED.length > 0 ? (
        <>
          <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Coming next in the documents build-out
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PLANNED.map((p) => (
              <span
                key={p}
                className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-sm text-gray-400"
              >
                {p}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ Documents is fully built out.
        </p>
      )}
    </div>
  );
}
