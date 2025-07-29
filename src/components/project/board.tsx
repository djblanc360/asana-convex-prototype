import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { TaskCard } from "~/components/task/card";
import { CreateTaskModal } from "~/components/task/create-task-modal";
import { CreateCategoryModal } from "~/components/task/create-category-modal";

type ProjectBoardProps = {
  projectId: Id<"projects">;
  onTaskSelect?: (taskId: Id<"tasks">) => void;
}

export function ProjectBoard({ projectId, onTaskSelect }: ProjectBoardProps) {
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const project = useQuery(api.projects.get, { projectId });
  const tasks = useQuery(api.tasks.listByProject, { projectId });
  const categories = useQuery(api.categories.listByProject, { projectId });

  if (project === undefined || tasks === undefined || categories === undefined) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const todoTasks = tasks.filter(task => task.status === "todo");
  const inProgressTasks = tasks.filter(task => task.status === "in_progress");
  const completedTasks = tasks.filter(task => task.status === "completed");

  const columns = [
    { title: "To Do", status: "todo" as const, tasks: todoTasks, color: "bg-gray-100" },
    { title: "In Progress", status: "in_progress" as const, tasks: inProgressTasks, color: "bg-blue-100" },
    { title: "Completed", status: "completed" as const, tasks: completedTasks, color: "bg-green-100" },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateCategory(true)}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors font-medium"
            >
              + Category
            </button>
            <button
              onClick={() => setShowCreateTask(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              + Add Task
            </button>
          </div>
        </div>
        {project.description && (
          <p className="text-gray-600 mt-2">{project.description}</p>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 p-6 overflow-x-auto">
        <div className="flex gap-6 h-full min-w-max">
          {columns.map((column) => (
            <div key={column.status} className="w-80 flex flex-col">
              <div className={`${column.color} rounded-lg p-4 mb-4`}>
                <h3 className="font-semibold text-gray-900 flex items-center justify-between">
                  {column.title}
                  <span className="bg-white text-gray-600 text-sm px-2 py-1 rounded-full">
                    {column.tasks.length}
                  </span>
                </h3>
              </div>
              
              <div className="flex-1 space-y-3 overflow-y-auto">
                {column.tasks.map((task) => (
                  <TaskCard 
                    key={task._id} 
                    task={task} 
                    onTaskSelect={onTaskSelect}
                  />
                ))}
                
                {column.tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">📝</div>
                    <p className="text-sm">No tasks in {column.title.toLowerCase()}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreateTask && (
        <CreateTaskModal
          projectId={projectId}
          onClose={() => setShowCreateTask(false)}
        />
      )}

      {showCreateCategory && (
        <CreateCategoryModal
          projectId={projectId}
          onClose={() => setShowCreateCategory(false)}
        />
      )}
    </div>
  );
}
