import {
  Users,
  FileText,
  Phone,
  LayoutDashboard,
  Blocks,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps a module's `icon` (a kebab-case lucide name) to a component. Extend this
 * map as modules are poured in — an unknown name falls back to the Blocks icon.
 */
const ICONS: Record<string, LucideIcon> = {
  users: Users,
  "file-text": FileText,
  phone: Phone,
  "layout-dashboard": LayoutDashboard,
  blocks: Blocks,
};

export function ModuleIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Blocks;
  return <Icon className={className} />;
}
