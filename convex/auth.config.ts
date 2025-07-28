const CONVEX_SITE_URL = process.env.VITE_CONVEX_SITE_URL;
export default {
  providers: [
    {
      domain: CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
