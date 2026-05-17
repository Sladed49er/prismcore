import Link from "next/link";
import { getRegistry } from "@/lib/registry";
import { toComposableModule } from "@/lib/module-dto";
import { Composer } from "@/components/composer";

export default function ComposePage() {
  const modules = getRegistry().composable().map(toComposableModule);

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
        ← Prism Core
      </Link>
      <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-indigo-500">
        Compose
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Build your workspace.
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Pick the modules your agency needs. Dependencies are added automatically,
        and you only pay for what you pick.
      </p>
      <Composer modules={modules} />
    </main>
  );
}
