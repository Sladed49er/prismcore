import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listRecurringTasks } from "@/lib/recurring-tasks";
import {
  RecurringTasksPanel,
  type RecurringTaskDTO,
} from "@/components/recurring-tasks-panel";

export default async function RecurringTasksPage() {
  await requireModule("tasks");
  const { config } = await loadCurrentTenant();
  const rows = await listRecurringTasks(config.id);

  const tasks: RecurringTaskDTO[] = rows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    assignee: t.assignee,
    priority: t.priority,
    frequency: t.frequency,
    nextDueDate: t.nextDueDate,
    status: t.status,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/tasks"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Tasks
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Recurring Tasks</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Task templates that recur on a schedule — daily, weekly, monthly — so
        routine work never falls off the radar.
      </p>
      <RecurringTasksPanel tasks={tasks} />
    </div>
  );
}
