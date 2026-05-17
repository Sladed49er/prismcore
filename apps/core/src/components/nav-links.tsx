"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModuleIcon } from "@/components/module-icon";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export function NavLinks({
  items,
  accentColor,
}: {
  items: NavItem[];
  accentColor: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
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
      })}
    </nav>
  );
}
