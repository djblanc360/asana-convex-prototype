import { Id } from "convex/_generated/dataModel";
import type { Project } from "~/components/project/types";

type ProjectListProps = {
    projects: Project[];
    onProjectSelect: (projectId: Id<"projects">) => void;
    onCreateProject: () => void;
}

export function ProjectList({ projects, onProjectSelect, onCreateProject }: ProjectListProps) {
  const activeProjects = projects.filter(p => p.status === "active");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage your team's projects and tasks</p>
        </div>
        <button
          onClick={onCreateProject}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          + New Project
        </button>
      </div>

      {activeProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first project</p>
          <button
            onClick={onCreateProject}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeProjects.map((project) => (
            <div
              key={project._id}
              onClick={() => onProjectSelect(project._id)}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
              </div>
              {project.description && (
                <p className="text-gray-600 text-sm line-clamp-2">{project.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>Click to view tasks</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
