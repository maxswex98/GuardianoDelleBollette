import type { NextConfig } from "next";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const shouldUseBasePath =
  process.env.GITHUB_ACTIONS === "true" && repositoryName !== "" && !repositoryName.endsWith(".github.io");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  basePath: shouldUseBasePath ? `/${repositoryName}` : "",
  assetPrefix: shouldUseBasePath ? `/${repositoryName}/` : undefined,
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
