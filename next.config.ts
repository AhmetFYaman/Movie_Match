import type { NextConfig } from "next";
import { basePath } from "./src/lib/paths";
const config: NextConfig = {
  basePath,
  // Client JavaScript is still public; do not publish readable production source maps.
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
        search: "",
      },
    ],
  },
};
export default config;
