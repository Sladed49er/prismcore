"use client";

import { useState } from "react";
import {
  CustomizePanel,
  type EntityRef,
  type CustomFieldDTO,
} from "@/components/customize-panel";
import { TerminologyPanel } from "@/components/terminology-panel";
import { OptionSetsPanel } from "@/components/option-sets-panel";
import { SavedViewsPanel } from "@/components/saved-views-panel";
import { BrandingPanel } from "@/components/branding-panel";
import { AssistantPanel } from "@/components/assistant-panel";
import { HistoryPanel } from "@/components/history-panel";

export type { EntityRef, CustomFieldDTO };

/** A renameable thing — a module or a record type — and its current override. */
export interface TermItemDTO {
  termKey: string;
  kind: "Module" | "Record";
  defaultLabel: string;
  currentLabel: string | null;
}

export interface OptionItemDTO {
  id: string;
  value: string;
  label: string;
  color: string;
  sortOrder: number;
  active: boolean;
}

export interface OptionSetDTO {
  id: string;
  setKey: string;
  name: string;
  description: string | null;
  isCoreOverride: boolean;
  items: OptionItemDTO[];
}

export interface SavedViewDTO {
  id: string;
  listKey: string;
  name: string;
  isDefault: boolean;
  columnCount: number;
}

export interface BrandingDTO {
  workspaceName: string;
  accentColor: string;
  logoUrl: string;
}

export interface LogEntryDTO {
  id: string;
  actorType: "user" | "ai";
  actorName: string;
  action: string;
  summary: string;
  createdAt: string;
}

type TabKey =
  | "assistant"
  | "fields"
  | "terminology"
  | "statuses"
  | "views"
  | "branding"
  | "history";

const TABS: { key: TabKey; label: string; blurb: string }[] = [
  {
    key: "assistant",
    label: "AI assistant",
    blurb: "Describe a change in plain words — the assistant makes it.",
  },
  {
    key: "fields",
    label: "Custom fields",
    blurb: "Add your own fields to any record.",
  },
  {
    key: "terminology",
    label: "Terminology",
    blurb: "Rename modules and records to your own words.",
  },
  {
    key: "statuses",
    label: "Statuses & picklists",
    blurb: "Define your own option sets, or restyle the built-in ones.",
  },
  {
    key: "views",
    label: "Saved views",
    blurb: "Manage the saved column/sort/filter layouts for your lists.",
  },
  {
    key: "branding",
    label: "Branding",
    blurb: "Name, accent colour, and logo for this workspace.",
  },
  {
    key: "history",
    label: "History",
    blurb:
      "Every customization change ever made — the historical record of this workspace.",
  },
];

/**
 * The customization hub — one tabbed surface over the whole customization
 * engine. Each tab is self-service and tenant-isolated; nothing here can
 * reach code or another tenant.
 */
export function CustomizeHub({
  entities,
  fields,
  termItems,
  optionSets,
  views,
  branding,
  log,
}: {
  entities: EntityRef[];
  fields: CustomFieldDTO[];
  termItems: TermItemDTO[];
  optionSets: OptionSetDTO[];
  views: SavedViewDTO[];
  branding: BrandingDTO;
  log: LogEntryDTO[];
}) {
  const [tab, setTab] = useState<TabKey>("assistant");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-gray-500">{active.blurb}</p>

      {tab === "assistant" ? <AssistantPanel /> : null}

      {tab === "fields" ? (
        entities.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">
            No customizable modules are enabled yet. Add modules from the
            composer.
          </p>
        ) : (
          <CustomizePanel entities={entities} fields={fields} />
        )
      ) : null}

      {tab === "terminology" ? <TerminologyPanel items={termItems} /> : null}
      {tab === "statuses" ? <OptionSetsPanel optionSets={optionSets} /> : null}
      {tab === "views" ? <SavedViewsPanel views={views} /> : null}
      {tab === "branding" ? <BrandingPanel branding={branding} /> : null}
      {tab === "history" ? <HistoryPanel log={log} /> : null}
    </div>
  );
}
