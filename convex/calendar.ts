import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listEvents = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    showCompleted: v.optional(v.boolean()),
    labelFilter: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let eventsQuery = ctx.db
      .query("calendarEvents")
      .withIndex("by_date", (q) => 
        q.gte("startDate", args.startDate).lte("startDate", args.endDate)
      );

    const allEvents = await eventsQuery.collect();

    // Filter events based on privacy and completion status
    let filteredEvents = allEvents.filter(event => {
      // Show public events and private events created by or assigned to the user
      const hasAccess = !event.isPrivate || 
        event.createdBy === userId || 
        event.assignedUsers.includes(userId);

      if (!hasAccess) return false;

      // Filter by completion status
      if (args.showCompleted === false && event.isCompleted) return false;

      // Filter by labels
      if (args.labelFilter && args.labelFilter.length > 0) {
        const hasMatchingLabel = event.labels.some((label: string) => 
          args.labelFilter!.includes(label)
        );
        if (!hasMatchingLabel) return false;
      }

      return true;
    });

    // Get additional details for each event
    const eventsWithDetails = await Promise.all(
      filteredEvents.map(async (event) => {
        const creator = await ctx.db.get(event.createdBy);
        
        const assignedUsers = await Promise.all(
          event.assignedUsers.map((userId: any) => ctx.db.get(userId))
        );

        let task = null;
        if (event.taskId) {
          task = await ctx.db.get(event.taskId);
        }

        let imageUrl = null;
        if (event.image) {
          imageUrl = await ctx.storage.getUrl(event.image);
        } else if (task && task.images.length > 0) {
          // Use first image from task if no event image
          imageUrl = await ctx.storage.getUrl(task.images[0]);
        }

        return {
          ...event,
          creator,
          assignedUsers: assignedUsers.filter(Boolean),
          task,
          imageUrl,
        };
      })
    );

    return eventsWithDetails;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    isAllDay: v.boolean(),
    taskId: v.optional(v.id("tasks")),
    assignedUsers: v.optional(v.array(v.id("users"))),
    isPrivate: v.boolean(),
    labels: v.optional(v.array(v.string())),
    image: v.optional(v.id("_storage")),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const eventId = await ctx.db.insert("calendarEvents", {
      title: args.title,
      description: args.description,
      startDate: args.startDate,
      endDate: args.endDate,
      isAllDay: args.isAllDay,
      taskId: args.taskId,
      createdBy: userId,
      assignedUsers: args.assignedUsers || [],
      isPrivate: args.isPrivate,
      isCompleted: false,
      labels: args.labels || [],
      image: args.image,
      color: args.color,
    });

    return eventId;
  },
});

export const update = mutation({
  args: {
    eventId: v.id("calendarEvents"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    isAllDay: v.optional(v.boolean()),
    assignedUsers: v.optional(v.array(v.id("users"))),
    isPrivate: v.optional(v.boolean()),
    isCompleted: v.optional(v.boolean()),
    labels: v.optional(v.array(v.string())),
    image: v.optional(v.id("_storage")),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Only creator or assigned users can update the event
    if (event.createdBy !== userId && !event.assignedUsers.includes(userId)) {
      throw new Error("Access denied");
    }

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.endDate !== undefined) updates.endDate = args.endDate;
    if (args.isAllDay !== undefined) updates.isAllDay = args.isAllDay;
    if (args.assignedUsers !== undefined) updates.assignedUsers = args.assignedUsers;
    if (args.isPrivate !== undefined) updates.isPrivate = args.isPrivate;
    if (args.isCompleted !== undefined) updates.isCompleted = args.isCompleted;
    if (args.labels !== undefined) updates.labels = args.labels;
    if (args.image !== undefined) updates.image = args.image;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.eventId, updates);
  },
});

export const remove = mutation({
  args: { eventId: v.id("calendarEvents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Only creator can delete the event
    if (event.createdBy !== userId) {
      throw new Error("Only event creator can delete event");
    }

    await ctx.db.delete(args.eventId);
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getLabels = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const events = await ctx.db.query("calendarEvents").collect();
    
    // Get all unique labels from events the user can see
    const visibleEvents = events.filter(event => 
      !event.isPrivate || 
      event.createdBy === userId || 
      event.assignedUsers.includes(userId)
    );

    const allLabels = visibleEvents.flatMap(event => event.labels);
    const uniqueLabels = [...new Set(allLabels)];

    return uniqueLabels.sort();
  },
});
