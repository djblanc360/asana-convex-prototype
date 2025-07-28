import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getTeamMembers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // For simplicity, return all users (in a real app, you'd filter by organization)
    const users = await ctx.db.query("users").collect();
    return users.map(user => ({
      _id: user._id,
      name: user.name || user.email || "Unknown User",
      email: user.email,
      image: user.image,
    }));
  },
});
