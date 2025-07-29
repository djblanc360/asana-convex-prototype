import { Id } from "convex/_generated/dataModel";

export type Project = {
    _id: Id<"projects">;
    name: string;
    description?: string;
    color: string;
    status: "active" | "archived";
}
