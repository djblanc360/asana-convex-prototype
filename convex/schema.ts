import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
    ownerId: v.id("users"),
    teamMembers: v.array(v.id("users")),
    status: v.union(v.literal("active"), v.literal("archived")),
  }).index("by_owner", ["ownerId"]),

  categories: defineTable({
    name: v.string(),
    color: v.string(),
    projectId: v.id("projects"),
    order: v.number(),
  }).index("by_project", ["projectId"]),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    projectId: v.id("projects"),
    categoryId: v.optional(v.id("categories")),
    assigneeId: v.optional(v.id("users")),
    assignedUsers: v.array(v.id("users")),
    createdBy: v.id("users"),
    parentTaskId: v.optional(v.id("tasks")),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("completed")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    dueDate: v.optional(v.number()),
    tags: v.array(v.string()),
    images: v.array(v.id("_storage")),
    order: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_category", ["categoryId"])
    .index("by_assignee", ["assigneeId"])
    .index("by_parent", ["parentTaskId"])
    .index("by_status", ["status"])
    .index("by_due_date", ["dueDate"]),

  comments: defineTable({
    taskId: v.id("tasks"),
    authorId: v.id("users"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
  })
    .index("by_task", ["taskId"])
    .index("by_parent", ["parentCommentId"]),

  calendarEvents: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    isAllDay: v.boolean(),
    taskId: v.optional(v.id("tasks")),
    createdBy: v.id("users"),
    assignedUsers: v.array(v.id("users")),
    isPrivate: v.boolean(),
    isCompleted: v.boolean(),
    labels: v.array(v.string()),
    image: v.optional(v.id("_storage")),
    color: v.string(),
  })
    .index("by_date", ["startDate"])
    .index("by_creator", ["createdBy"])
    .index("by_task", ["taskId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("task_assigned"),
      v.literal("task_updated"),
      v.literal("comment_added"),
      v.literal("due_date_reminder")
    ),
    title: v.string(),
    message: v.string(),
    taskId: v.optional(v.id("tasks")),
    isRead: v.boolean(),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
