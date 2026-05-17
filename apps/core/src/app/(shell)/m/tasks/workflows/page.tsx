import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listTaskWorkflows } from "@/lib/task-workflows";
import {
  TaskWorkflowsPanel,
  type TaskWorkflowDTO,
} from "@/components/task-workflows-panel";

export default async function TaskWorkflowsPage() {
  await requireModule("tasks");
  const { config } = await loadCurrentTenant();
  const rows = await listTaskWorkflows(config.id);

  const workflows: TaskWorkflowDTO[] = rows.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    steps: w.steps,
    status: w.status,
  }));

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/m/tasks"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Tasks
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Workflows</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Named multi-step processes — the repeatable sequences your team follows
        for onboarding, renewals, and claims handling.
      </p>
      <TaskWorkflowsPanel workflows={workflows} />
    </div>
  );
}
