import { useState, useEffect, useCallback, useRef } from "react";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../lib/tasks";
import { useAuth } from "../context/AuthContext";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";

export default function TaskDashboard({ user }) {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const searchTimeout = useRef(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const { logout } = useAuth();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTasks({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter || undefined,
        search: searchDebounced.trim() || undefined,
      });
      setTasks(res.data.tasks);
      setPagination(res.data.pagination);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchDebounced]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleFilterChange = (value) => {
    setStatusFilter(value);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchDebounced(value);
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
  };

  const handleCreate = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    try {
      if (editingTask) {
        await updateTask(editingTask._id, data);
      } else {
        await createTask(data);
      }
      setModalOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTask(id);
      fetchTasks();
    } catch {
      // Error handled in TaskCard
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">TaskFlow</h1>
          <p className="text-zinc-400 text-sm">Hello, {user.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition"
          >
            Logout
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
          >
            + New Task
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-zinc-400">Loading tasks...</div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-[var(--card)] rounded-xl border border-zinc-800">
          <p className="text-zinc-400 mb-4">No tasks yet</p>
          <button
            onClick={handleCreate}
            className="text-indigo-400 hover:underline"
          >
            Create your first task
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                }
                disabled={pagination.page <= 1}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-zinc-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: Math.min(p.totalPages, p.page + 1),
                  }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <TaskModal
          task={editingTask}
          onSave={handleSave}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}
