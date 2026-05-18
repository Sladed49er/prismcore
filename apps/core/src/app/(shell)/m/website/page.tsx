import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import {
  listWebsitePages,
  listWebsiteRequests,
  listWebsiteRequestComments,
} from "@/lib/website";
import {
  WebsiteRequestsPanel,
  type WebsiteRequestDTO,
} from "@/components/website-requests-panel";
import {
  WebsitePagesPanel,
  type WebsitePageDTO,
} from "@/components/website-pages-panel";
import {
  WebsiteRequestCommentsPanel,
  type RequestCommentDTO,
  type RequestOption,
} from "@/components/website-request-comments-panel";

/**
 * Website Manager module — a queue of change requests (with an activity
 * thread on each) and a page inventory.
 */
export default async function WebsitePage() {
  await requireModule("website");
  const { config } = await loadCurrentTenant();
  const [requestRows, pageRows, commentRows] = await Promise.all([
    listWebsiteRequests(config.id),
    listWebsitePages(config.id),
    listWebsiteRequestComments(config.id),
  ]);

  const requests: WebsiteRequestDTO[] = requestRows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    priority: r.priority,
    status: r.status,
    requestorName: r.requestorName,
    pageRef: r.pageRef,
    resolution: r.resolution,
  }));

  const pages: WebsitePageDTO[] = pageRows.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
    summary: p.summary,
    url: p.url,
    notes: p.notes,
  }));

  const comments: RequestCommentDTO[] = commentRows.map((c) => ({
    id: c.id,
    requestTitle: c.requestTitle,
    authorName: c.authorName,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
  }));

  const requestOptions: RequestOption[] = requestRows.map((r) => ({
    id: r.id,
    title: r.title,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Website Manager</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Run your website from inside Prism Core — track change requests with an
        activity thread, and keep an inventory of every page.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Change requests</h2>
      <p className="mt-1 text-sm text-gray-500">
        Anything you want done on the site — content edits, new pages, fixes —
        captured and worked from submitted to completed.
      </p>
      <WebsiteRequestsPanel requests={requests} />

      <h2 className="mt-10 text-lg font-semibold">Activity</h2>
      <p className="mt-1 text-sm text-gray-500">
        Progress notes, questions, and updates on each request.
      </p>
      <WebsiteRequestCommentsPanel
        comments={comments}
        requests={requestOptions}
      />

      <h2 className="mt-10 text-lg font-semibold">Pages</h2>
      <p className="mt-1 text-sm text-gray-500">
        The inventory of pages that make up your website.
      </p>
      <WebsitePagesPanel pages={pages} />
    </div>
  );
}
