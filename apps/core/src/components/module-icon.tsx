import { icons } from "lucide-react";

/** kebab-case → PascalCase, e.g. "file-text" → "FileText". */
function toPascal(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Renders a module's `icon` (a kebab-case lucide name) by dynamic lookup, so the
 * 36-module catalog works without 36 hand-wired imports. Unknown names fall back
 * to the Blocks icon.
 */
export function ModuleIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = icons[toPascal(name) as keyof typeof icons] ?? icons.Blocks;
  return <Icon className={className} />;
}
