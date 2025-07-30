import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ProjectList } from "~/components/project/list";
import { ProjectBoard } from "~/components/project/board";
import { PersonalTasks } from "~/components/task/personal-tasks";
import { CalendarView } from "~/components/calendar/view";
import { TaskDetailModal } from "~/components/task/detail-modal";
import { CreateProjectModal } from "~/components/project/create-project-modal";
import { NotificationCenter } from "~/components/notification-center";
import { Id } from "convex/_generated/dataModel";

type View = "projects" | "board" | "my-tasks" | "calendar";

export function Dashboard() {
  const [currentView, setCurrentView] = useState<View>("projects");
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const projects = useQuery(api.projects.list);
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const notifications = useQuery(api.notifications.list);

  if (projects === undefined || loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleProjectSelect = (projectId: Id<"projects">) => {
    setSelectedProjectId(projectId);
    setCurrentView("board");
  };

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900">Welcome back,</h3>
              <p className="text-sm text-gray-600">{loggedInUser?.name || loggedInUser?.email}</p>
            </div>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
          {showNotifications && (
            <NotificationCenter onClose={() => setShowNotifications(false)} />
          )}
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setCurrentView("projects")}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === "projects"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                📁 Projects
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentView("my-tasks")}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === "my-tasks"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                ✅ My Tasks
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentView("calendar")}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === "calendar"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                📅 Calendar
              </button>
            </li>
          </ul>
          
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Projects
              </h4>
              <button
                onClick={() => setShowCreateProject(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + New
              </button>
            </div>
            <ul className="space-y-1">
              {projects.map((project) => (
                <li key={project._id}>
                  <button
                    onClick={() => handleProjectSelect(project._id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
                      selectedProjectId === project._id
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === "projects" && (
          <ProjectList
            projects={projects}
            onProjectSelect={handleProjectSelect}
            onCreateProject={() => setShowCreateProject(true)}
          />
        )}
        {currentView === "board" && selectedProjectId && (
          <ProjectBoard 
            projectId={selectedProjectId} 
            onTaskSelect={setSelectedTaskId}
          />
        )}
        {currentView === "my-tasks" && (
          <PersonalTasks onTaskSelect={setSelectedTaskId} />
        )}
        {currentView === "calendar" && <CalendarView />}
      </div>

      {/* Modals */}
      {showCreateProject && (
        <CreateProjectModal onClose={() => setShowCreateProject(false)} />
      )}
      
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
