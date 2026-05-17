import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listTasks } from "@/lib/tasks";
import { listCustomFields } from "@/lib/customization";
import {
  TasksPanel,
  type TaskDTO,
  type CustomFieldDTO,
} from "@/components/tasks-panel";

/** Task list — the team's task register, with the tenant's custom fields. */
export default async function TaskListPage() {
  await requireModule("tasks");
  const { config } = await loadCurrentTenant();
  const [taskRows, fieldRows] = await Promise.all([
    listTasks(config.id),
    listCustomFields(config.id),
  ]);

  const tasks: TaskDTO[] = taskRows.map((t) => ({
    id: t.id,
    title: t.title,
    assignee: t.assignee,
    priority: t.priority,
    dueDate: t.dueDate,
    status: t.status,
  }));
  const customFields: CustomFieldDTO[] = fieldRows
    .filter((f) => f.entityKey === "task")
    .map((f) => ({
      fieldKey: f.fieldKey,
      label: f.label,
      fieldType: f.fieldType,
      required: f.required,
    }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/tasks"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Tasks
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Task List</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The team&rsquo;s task list — assignments, priorities, and due dates,
        with any custom fields defined in Customize.
      </p>
      <TasksPanel tasks={tasks} customFields={customFields} />
    </div>
  );
}
