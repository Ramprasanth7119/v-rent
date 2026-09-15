import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The photograph upload uses sharp, whose native binding loads libvips from a
     sibling package through the dynamic linker. File tracing cannot see that
     load, so without these the deployed function can lack the library and fail
     as soon as it starts. Serving stored photographs does not need sharp. */
  outputFileTracingIncludes: {
    "/api/phase1/photos": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"],
  },
};

export default nextConfig;
