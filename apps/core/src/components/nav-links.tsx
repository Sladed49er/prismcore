"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModuleIcon } from "@/components/module-icon";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** Section heading this item sits under; ungrouped items render first. */
  group?: string;
}

export function NavLinks({
  items,
  accentColor,
}: {
  items: NavItem[];
  accentColor: string;
}) {
  const pathname = usePathname();

  function row(item: NavItem) {
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          active ? "" : "text-gray-600 hover:bg-gray-50"
        }`}
        // Active item is tinted with the tenant's accent colour
        // (`1f` ≈ 12% alpha) rather than a fixed indigo.
        style={
          active
            ? { backgroundColor: `${accentColor}1f`, color: accentColor }
            : undefined
        }
      >
        <ModuleIcon name={item.icon} className="h-4 w-4" />
        {item.label}
      </Link>
    );
  }

  const ungrouped = items.filter((i) => !i.group);
  // Distinct group names, in first-appearance order.
  const groups: string[] = [];
  for (const i of items) {
    if (i.group && !groups.includes(i.group)) groups.push(i.group);
  }

  return (
    <nav className="flex flex-col gap-1">
      {ungrouped.map(row)}
      {groups.map((group) => (
        <div key={group} className="mt-4 first:mt-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {group}
          </p>
          {items.filter((i) => i.group === group).map(row)}
        </div>
      ))}
    </nav>
  );
}
