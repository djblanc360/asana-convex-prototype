import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user has access to the task
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const project = await ctx.db.get(task.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== userId && !project.teamMembers.includes(userId)) {
      throw new Error("Access denied");
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .filter((q) => q.eq(q.field("parentCommentId"), undefined))
      .collect();

    // Get author details and replies for each comment
    const commentsWithDetails = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);
        
        const replies = await ctx.db
          .query("comments")
          .withIndex("by_parent", (q) => q.eq("parentCommentId", comment._id))
          .collect();

        const repliesWithAuthors = await Promise.all(
          replies.map(async (reply) => {
            const replyAuthor = await ctx.db.get(reply.authorId);
            return { ...reply, author: replyAuthor };
          })
        );

        return { ...comment, author, replies: repliesWithAuthors };
      })
    );

    return commentsWithDetails.sort((a, b) => a._creationTime - b._creationTime);
  },
});

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user has access to the task
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const project = await ctx.db.get(task.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== userId && !project.teamMembers.includes(userId)) {
      throw new Error("Access denied");
    }

    const commentId = await ctx.db.insert("comments", {
      taskId: args.taskId,
      authorId: userId,
      content: args.content,
      parentCommentId: args.parentCommentId,
    });

    // Send notifications to task assignees (except the comment author)
    const assignedUserIds = [
      ...task.assignedUsers,
      ...(task.assigneeId ? [task.assigneeId] : [])
    ].filter(id => id !== userId);

    for (const assignedUserId of assignedUserIds) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendCommentNotification, {
        userId: assignedUserId,
        taskId: args.taskId,
        commentAuthor: userId,
      });
    }

    return commentId;
  },
});

export const update = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.authorId !== userId) {
      throw new Error("Only comment author can edit comment");
    }

    await ctx.db.patch(args.commentId, {
      content: args.content,
    });
  },
});

export const remove = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.authorId !== userId) {
      throw new Error("Only comment author can delete comment");
    }

    // Delete all replies
    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parent", (q) => q.eq("parentCommentId", args.commentId))
      .collect();

    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    await ctx.db.delete(args.commentId);
  },
});
