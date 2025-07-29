import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import type { Task } from "~/components/task/types";


type TaskCardProps = {
  task: Task;
  onTaskSelect?: (taskId: Id<"tasks">) => void;
}

export function TaskCard({ task, onTaskSelect }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const updateTask = useMutation(api.tasks.update);

  const priorityColors = {
    low: "bg-gray-100 text-gray-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };

  const statusOptions = [
    { value: "todo", label: "To Do" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ];

  const handleStatusChange = async (newStatus: "todo" | "in_progress" | "completed") => {
    await updateTask({
      taskId: task._id,
      status: newStatus,
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onTaskSelect?.(task._id)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 flex-1 pr-2">{task.title}</h4>
        <select
          value={task.status}
          onChange={(e) => handleStatusChange(e.target.value as any)}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        {task.dueDate && (
          <span className="text-xs text-gray-500">
            📅 {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.map((tag, index) => (
            <span
              key={index}
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {task.assignee && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {task.assignee.image ? (
            <img
              src={task.assignee.image}
              alt={task.assignee.name || "User"}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
              {(task.assignee.name || task.assignee.email || "U")[0].toUpperCase()}
            </div>
          )}
          <span className="truncate">
            {task.assignee.name || task.assignee.email}
          </span>
        </div>
      )}
    </div>
  );
}
