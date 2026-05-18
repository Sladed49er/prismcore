import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listTemplates } from "@/lib/marketing-engine";
import {
  MarketingTemplatesPanel,
  type TemplateDTO,
} from "@/components/marketing-templates-panel";

/** Marketing email templates — reusable subject + HTML body. */
export default async function MarketingTemplatesPage() {
  await requireModule("marketing");
  const { config } = await loadCurrentTenant();
  const rows = await listTemplates(config.id);

  const templates: TemplateDTO[] = rows.map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subject,
    body: t.body,
  }));

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/m/marketing"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Marketing
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Email Templates</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Reusable email templates for campaign blasts and drip sequences. Use
        {" {{name}} "}
        and {"{{first_name}}"} as merge fields.
      </p>
      <MarketingTemplatesPanel templates={templates} />
    </div>
  );
}
