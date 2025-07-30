import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { TaskCard } from "~/components/task/card";

interface PersonalTasksProps {
  onTaskSelect?: (taskId: Id<"tasks">) => void;
}

export function PersonalTasks({ onTaskSelect }: PersonalTasksProps) {
  const PersonalTasks = useQuery(api.tasks.getPersonalTasks);

  if (PersonalTasks === undefined) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const todoTasks = PersonalTasks.filter(task => task.status === "todo");
  const inProgressTasks = PersonalTasks.filter(task => task.status === "in_progress");
  const completedTasks = PersonalTasks.filter(task => task.status === "completed");

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-600 mt-1">Tasks assigned to you across all projects</p>
      </div>

      {PersonalTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks assigned</h3>
          <p className="text-gray-600">You're all caught up! Tasks assigned to you will appear here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {todoTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                📋 To Do
                <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded-full">
                  {todoTasks.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todoTasks.map((task) => (
                  <div key={task._id} className="space-y-2">
                    <TaskCard task={task} onTaskSelect={onTaskSelect} />
                    {task.project && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 px-4">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: task.project.color }}
                        />
                        <span>{task.project.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {inProgressTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                🔄 In Progress
                <span className="bg-blue-100 text-blue-600 text-sm px-2 py-1 rounded-full">
                  {inProgressTasks.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgressTasks.map((task) => (
                  <div key={task._id} className="space-y-2">
                    <TaskCard task={task} onTaskSelect={onTaskSelect} />
                    {task.project && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 px-4">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: task.project.color }}
                        />
                        <span>{task.project.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                ✅ Completed
                <span className="bg-green-100 text-green-600 text-sm px-2 py-1 rounded-full">
                  {completedTasks.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedTasks.map((task) => (
                  <div key={task._id} className="space-y-2">
                    <TaskCard task={task} onTaskSelect={onTaskSelect} />
                    {task.project && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 px-4">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: task.project.color }}
                        />
                        <span>{task.project.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
