import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user has access to the project
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== userId && !project.teamMembers.includes(userId)) {
      throw new Error("Access denied");
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("parentTaskId"), undefined))
      .collect();

    // Get assignee details and subtasks for each task
    const tasksWithDetails = await Promise.all(
      tasks.map(async (task) => {
        let assignee = null;
        if (task.assigneeId) {
          assignee = await ctx.db.get(task.assigneeId);
        }

        const assignedUsers = await Promise.all(
          task.assignedUsers.map(userId => ctx.db.get(userId))
        );

        const subtasks = await ctx.db
          .query("tasks")
          .withIndex("by_parent", (q) => q.eq("parentTaskId", task._id))
          .collect();

        const images = await Promise.all(
          task.images.map(async (imageId) => {
            const url = await ctx.storage.getUrl(imageId);
            return { id: imageId, url };
          })
        );

        return { 
          ...task, 
          assignee, 
          assignedUsers: assignedUsers.filter(Boolean),
          subtasks,
          images: images.filter(img => img.url)
        };
      })
    );

    return tasksWithDetails.sort((a, b) => a.order - b.order);
  },
});

export const get = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    // Verify user has access to the project
    const project = await ctx.db.get(task.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== userId && !project.teamMembers.includes(userId)) {
      throw new Error("Access denied");
    }

    let assignee = null;
    if (task.assigneeId) {
      assignee = await ctx.db.get(task.assigneeId);
    }

    const assignedUsers = await Promise.all(
      task.assignedUsers.map(userId => ctx.db.get(userId))
    );

    const subtasks = await ctx.db
      .query("tasks")
      .withIndex("by_parent", (q) => q.eq("parentTaskId", task._id))
      .collect();

    const images = await Promise.all(
      task.images.map(async (imageId) => {
        const url = await ctx.storage.getUrl(imageId);
        return { id: imageId, url };
      })
    );

    return { 
      ...task, 
      assignee, 
      assignedUsers: assignedUsers.filter(Boolean),
      subtasks,
      images: images.filter(img => img.url)
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    projectId: v.id("projects"),
    categoryId: v.optional(v.id("categories")),
    assigneeId: v.optional(v.id("users")),
    assignedUsers: v.optional(v.array(v.id("users"))),
    parentTaskId: v.optional(v.id("tasks")),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user has access to the project
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== userId && !project.teamMembers.includes(userId)) {
      throw new Error("Access denied");
    }

    // Get the next order number
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const maxOrder = Math.max(...tasks.map(t => t.order), -1);

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      projectId: args.projectId,
      categoryId: args.categoryId,
      assigneeId: args.assigneeId,
      assignedUsers: args.assignedUsers || [],
      parentTaskId: args.parentTaskId,
      createdBy: userId,
      status: "todo",
      priority: args.priority,
      dueDate: args.dueDate,
      tags: args.tags || [],
      images: args.images || [],
      order: maxOrder + 1,
    });

    // Send notifications to assigned users
    const assignedUserIds = [
      ...(args.assignedUsers || []),
      ...(args.assigneeId ? [args.assigneeId] : [])
    ].filter(id => id !== userId);

    for (const assignedUserId of assignedUserIds) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendTaskAssignedNotification, {
        userId: assignedUserId,
        taskId,
        assignedBy: userId,
      });
    }

    return taskId;
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    assigneeId: v.optional(v.id("users")),
    assignedUsers: v.optional(v.array(v.id("users"))),
    status: v.optional(
      v.union(
        v.literal("todo"),
        v.literal("in_progress"),
        v.literal("completed")
      )
    ),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent")
      )
    ),
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    // Verify user has access to the project
    const project = await ctx.db.get(task.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== userId && !project.teamMembers.includes(userId)) {
      throw new Error("Access denied");
    }

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId;
    if (args.assigneeId !== undefined) updates.assigneeId = args.assigneeId;
    if (args.assignedUsers !== undefined) updates.assignedUsers = args.assignedUsers;
    if (args.status !== undefined) updates.status = args.status;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.images !== undefined) updates.images = args.images;

    await ctx.db.patch(args.taskId, updates);

    // Send notifications for newly assigned users
    if (args.assignedUsers !== undefined || args.assigneeId !== undefined) {
      const newAssignedUsers = [
        ...(args.assignedUsers || task.assignedUsers),
        ...(args.assigneeId !== undefined ? (args.assigneeId ? [args.assigneeId] : []) : (task.assigneeId ? [task.assigneeId] : []))
      ].filter(id => id !== userId);

      const oldAssignedUsers = [
        ...task.assignedUsers,
        ...(task.assigneeId ? [task.assigneeId] : [])
      ];

      const newlyAssigned = newAssignedUsers.filter(id => !oldAssignedUsers.includes(id));

      for (const assignedUserId of newlyAssigned) {
        await ctx.scheduler.runAfter(0, internal.notifications.sendTaskUpdatedNotification, {
          userId: assignedUserId,
          taskId: args.taskId,
          updatedBy: userId,
        });
      }
    }
  },
});

export const updateOrder = mutation({
  args: {
    taskId: v.id("tasks"),
    newOrder: v.number(),
    categoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    // Verify user has access to the project
    const project = await ctx.db.get(task.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== userId && !project.teamMembers.includes(userId)) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(args.taskId, {
      order: args.newOrder,
      categoryId: args.categoryId,
    });
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    // Verify user has access to the project
    const project = await ctx.db.get(task.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== userId && !project.teamMembers.includes(userId)) {
      throw new Error("Access denied");
    }

    // Delete all subtasks
    const subtasks = await ctx.db
      .query("tasks")
      .withIndex("by_parent", (q) => q.eq("parentTaskId", args.taskId))
      .collect();

    for (const subtask of subtasks) {
      await ctx.db.delete(subtask._id);
    }

    // Delete all comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    await ctx.db.delete(args.taskId);
  },
});

export const getPersonalTasks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assigneeId", userId))
      .collect();

    // Also get tasks where user is in assignedUsers
    const allTasks = await ctx.db.query("tasks").collect();
    const assignedTasks = allTasks.filter(task => 
      task.assignedUsers.includes(userId) && task.assigneeId !== userId
    );

    const combinedTasks = [...tasks, ...assignedTasks];

    // Get project details for each task
    const tasksWithProjects = await Promise.all(
      combinedTasks.map(async (task) => {
        const project = await ctx.db.get(task.projectId);
        const images = await Promise.all(
          task.images.map(async (imageId) => {
            const url = await ctx.storage.getUrl(imageId);
            return { id: imageId, url };
          })
        );
        return { ...task, project, images: images.filter(img => img.url) };
      })
    );

    return tasksWithProjects;
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
