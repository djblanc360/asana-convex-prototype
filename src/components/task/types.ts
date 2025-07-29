import { Id } from "convex/_generated/dataModel";

export type Task = {
    _id: Id<"tasks">;
    title: string;
    description?: string;
    status: "todo" | "in_progress" | "completed";
    priority: "low" | "medium" | "high" | "urgent";
    dueDate?: number;
    tags: string[];
    assignee?: {
      _id: Id<"users">;
      name?: string;
      email?: string;
      image?: string;
    } | null;
}