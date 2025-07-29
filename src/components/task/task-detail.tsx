import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { toast } from "sonner";
import { TagInput } from "~/components/tag-input";
import type { Task } from "~/components/task/types";

type TaskDetailModalProps = {
  taskId: Id<"tasks">;
  onClose: () => void;
}

export function TaskDetailModal({ taskId, onClose }: TaskDetailModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const task = useQuery(api.tasks.get, { taskId });
  const comments = useQuery(api.comments.listByTask, { taskId });
  const teamMembers = useQuery(api.users.getTeamMembers);
  
  const updateTask = useMutation(api.tasks.update);
  const createComment = useMutation(api.comments.create);
  const createSubtask = useMutation(api.tasks.create);
  const generateUploadUrl = useMutation(api.tasks.generateUploadUrl);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      setDraggedFiles(imageFiles);
      await uploadImages(imageFiles);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      await uploadImages(imageFiles);
    }
  };

  const uploadImages = async (files: File[]) => {
    try {
      const uploadPromises = files.map(async (file) => {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        
        if (result.ok) {
          const { storageId } = await result.json();
          return storageId;
        }
        return null;
      });

      const uploadedIds = (await Promise.all(uploadPromises)).filter(Boolean);
      
      if (uploadedIds.length > 0 && task) {
        await updateTask({
          taskId,
          images: [...task.images.map(img => img.id), ...uploadedIds],
        });
        toast.success(`${uploadedIds.length} image(s) uploaded successfully!`);
      }
    } catch (error) {
      toast.error("Failed to upload images");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await createComment({
        taskId,
        content: newComment.trim(),
      });
      setNewComment("");
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !task) return;

    try {
      await createSubtask({
        title: newSubtaskTitle.trim(),
        projectId: task.projectId,
        parentTaskId: taskId,
        priority: "medium",
      });
      setNewSubtaskTitle("");
      toast.success("Subtask created!");
    } catch (error) {
      toast.error("Failed to create subtask");
    }
  };

  const handleAssignUser = async (userId: Id<"users">) => {
    if (!task) return;
    
    const isAlreadyAssigned = task.assignedUsers.some(u => u?._id === userId) || task.assigneeId === userId;
    
    if (isAlreadyAssigned) {
      // Remove user
      const newAssignedUsers = task.assignedUsers.filter(u => u?._id !== userId);
      await updateTask({
        taskId,
        assignedUsers: newAssignedUsers.filter((u): u is NonNullable<typeof u> => u !== null).map(u => u._id),
        assigneeId: task.assigneeId === userId ? undefined : task.assigneeId,
      });
    } else {
      // Add user
      const newAssignedUsers = [...task.assignedUsers.filter((u): u is NonNullable<typeof u> => u !== null).map(u => u._id), userId];
      await updateTask({
        taskId,
        assignedUsers: newAssignedUsers,
      });
    }
  };

  const handleTagsUpdate = async (newTags: string[]) => {
    if (!task) return;
    
    try {
      await updateTask({
        taskId,
        tags: newTags,
      });
    } catch (error) {
      toast.error("Failed to update tags");
    }
  };

  if (!task || !comments || !teamMembers) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  const modalClasses = isFullscreen 
    ? "fixed inset-0 bg-white z-50 overflow-y-auto"
    : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";

  const contentClasses = isFullscreen
    ? "w-full h-full p-6"
    : "bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto";

  return (
    <div className={modalClasses}>
      <div className={contentClasses}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? "⤓" : "⤢"}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {task.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Images */}
            {task.images.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {task.images.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.url || ""}
                        alt="Task attachment"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drag and drop area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDraggingOver 
                  ? "border-blue-400 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="space-y-2">
                <div className="text-4xl">📎</div>
                <p className="text-gray-500">
                  Drag and drop images here or{" "}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    click to browse
                  </button>
                </p>
              </div>
            </div>

            {/* Subtasks */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Subtasks</h3>
              {task.subtasks.length > 0 ? (
                <div className="space-y-2">
                  {task.subtasks.map((subtask) => (
                    <div key={subtask._id} className="flex items-center gap-2 p-2 border rounded">
                      <input
                        type="checkbox"
                        checked={subtask.status === "completed"}
                        onChange={() => updateTask({
                          taskId: subtask._id,
                          status: subtask.status === "completed" ? "todo" : "completed"
                        })}
                        className="rounded"
                      />
                      <span className={subtask.status === "completed" ? "line-through text-gray-500" : ""}>
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No subtasks yet</p>
              )}
              
              <form onSubmit={handleAddSubtask} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add a subtask..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskTitle.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Comments */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Comments</h3>
              
              {/* Add comment form */}
              <form onSubmit={handleAddComment} className="mb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Comment
                </button>
              </form>

              {/* Comments list */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment._id} className="border-l-4 border-gray-200 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {comment.author?.name || comment.author?.email}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment._creationTime).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                    
                    {/* Replies */}
                    {comment.replies.length > 0 && (
                      <div className="mt-3 ml-4 space-y-2">
                        {comment.replies.map((reply) => (
                          <div key={reply._id} className="border-l-2 border-gray-100 pl-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {reply.author?.name || reply.author?.email}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(reply._creationTime).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-700 text-sm">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Status</h4>
              <select
                value={task.status}
                onChange={(e) => updateTask({
                  taskId,
                  status: e.target.value as any
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Priority</h4>
              <select
                value={task.priority}
                onChange={(e) => updateTask({
                  taskId,
                  priority: e.target.value as any
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Assigned Users */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Assigned Users</h4>
              <div className="space-y-2">
                {teamMembers.map((member) => {
                  const isAssigned = task.assignedUsers.some(u => u?._id === member._id) || task.assigneeId === member._id;
                  return (
                    <label key={member._id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleAssignUser(member._id)}
                        className="rounded"
                      />
                      <span className="text-sm">{member.name || member.email}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Due Date</h4>
              <input
                type="date"
                value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ""}
                onChange={(e) => updateTask({
                  taskId,
                  dueDate: e.target.value ? new Date(e.target.value).getTime() : undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tags */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
              <TagInput
                tags={task.tags}
                onChange={handleTagsUpdate}
                placeholder="Add tags..."
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Type a tag and press Enter to add it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
