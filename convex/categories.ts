import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return categories.sort((a, b) => a.order - b.order);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    projectId: v.id("projects"),
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
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const maxOrder = Math.max(...categories.map(c => c.order), -1);

    const categoryId = await ctx.db.insert("categories", {
      name: args.name,
      color: args.color,
      projectId: args.projectId,
      order: maxOrder + 1,
    });

    return categoryId;
  },
});

export const update = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Verify user has access to the project
    const project = await ctx.db.get(category.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== userId && !project.teamMembers.includes(userId)) {
      throw new Error("Access denied");
    }

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.categoryId, updates);
  },
});

export const remove = mutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Verify user has access to the project
    const project = await ctx.db.get(category.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== userId && !project.teamMembers.includes(userId)) {
      throw new Error("Access denied");
    }

    // Move all tasks in this category to uncategorized
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    for (const task of tasks) {
      await ctx.db.patch(task._id, { categoryId: undefined });
    }

    await ctx.db.delete(args.categoryId);
  },
});
