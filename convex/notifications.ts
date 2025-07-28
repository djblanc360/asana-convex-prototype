import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    return notifications;
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    for (const notification of notifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }
  },
});

export const sendTaskAssignedNotification = internalMutation({
  args: {
    userId: v.id("users"),
    taskId: v.id("tasks"),
    assignedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    const assigner = await ctx.db.get(args.assignedBy);
    
    if (!task || !assigner) return;

    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "task_assigned",
      title: "New Task Assigned",
      message: `${assigner.name || assigner.email} assigned you to "${task.title}"`,
      taskId: args.taskId,
      isRead: false,
    });
  },
});

export const sendTaskUpdatedNotification = internalMutation({
  args: {
    userId: v.id("users"),
    taskId: v.id("tasks"),
    updatedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    const updater = await ctx.db.get(args.updatedBy);
    
    if (!task || !updater) return;

    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "task_updated",
      title: "Task Updated",
      message: `${updater.name || updater.email} updated "${task.title}"`,
      taskId: args.taskId,
      isRead: false,
    });
  },
});

export const sendCommentNotification = internalMutation({
  args: {
    userId: v.id("users"),
    taskId: v.id("tasks"),
    commentAuthor: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    const author = await ctx.db.get(args.commentAuthor);
    
    if (!task || !author) return;

    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "comment_added",
      title: "New Comment",
      message: `${author.name || author.email} commented on "${task.title}"`,
      taskId: args.taskId,
      isRead: false,
    });
  },
});
