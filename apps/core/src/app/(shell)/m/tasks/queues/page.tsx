import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listTaskQueues } from "@/lib/task-queues";
import {
  TaskQueuesPanel,
  type TaskQueueDTO,
} from "@/components/task-queues-panel";

export default async function TaskQueuesPage() {
  await requireModule("tasks");
  const { config } = await loadCurrentTenant();
  const rows = await listTaskQueues(config.id);

  const queues: TaskQueueDTO[] = rows.map((q) => ({
    id: q.id,
    name: q.name,
    description: q.description,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/tasks"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Tasks
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Queues</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The work queues tasks are grouped into — by team, function, or service
        line, so work routes to the right desk.
      </p>
      <TaskQueuesPanel queues={queues} />
    </div>
  );
}
