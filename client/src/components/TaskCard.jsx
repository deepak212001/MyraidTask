import { useState } from "react";

const statusColors = {
  pending: "bg-amber-500/20 text-amber-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  completed: "bg-emerald-500/20 text-emerald-400",
};

export default function TaskCard({ task, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return;
    setDeleting(true);
    try {
      await onDelete(task._id);
    } finally {
      setDeleting(false);
    }
  };

  const statusLabel =
    task.status === "in_progress"
      ? "In Progress"
      : task.status.charAt(0).toUpperCase() + task.status.slice(1);

  return (
    <div className="bg-[var(--card)] rounded-xl p-4 border border-zinc-800 hover:border-zinc-700 transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{task.title}</h3>
          {task.description && (
            <p className="text-zinc-400 text-sm mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
          <span
            className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
              statusColors[task.status] || "bg-zinc-500/20 text-zinc-400"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
            title="Edit"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 rounded-lg text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition disabled:opacity-50"
            title="Delete"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
