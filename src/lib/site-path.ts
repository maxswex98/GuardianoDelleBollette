export function getSiteBasePath(): string {
  const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
  const shouldUseBasePath =
    process.env.GITHUB_ACTIONS === "true" && repositoryName !== "" && !repositoryName.endsWith(".github.io");

  return shouldUseBasePath ? `/${repositoryName}` : "";
}

export function getSiteVersionQuery(): string {
  const version = process.env.GITHUB_SHA?.slice(0, 8) ?? process.env.NEXT_PUBLIC_SITE_VERSION?.trim() ?? "";
  return version ? `?v=${version}` : "";
}

export function withSiteBasePath(inputPath: string): string {
  if (/^https?:\/\//i.test(inputPath)) {
    return inputPath;
  }

  const basePath = getSiteBasePath();
  const normalizedPath = inputPath.startsWith("/") ? inputPath : `/${inputPath}`;

  if (basePath && (normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`))) {
    return normalizedPath;
  }

  return basePath ? `${basePath}${normalizedPath}` : normalizedPath;
}

export function withSiteBasePathRoute(inputPath: string): string {
  const pathWithBase = withSiteBasePath(inputPath);
  const pathname = pathWithBase.split(/[?#]/, 1)[0];

  if (/\.[a-z0-9]+$/i.test(pathname)) {
    return pathWithBase;
  }

  const route = pathWithBase.endsWith("/") ? pathWithBase : `${pathWithBase}/`;
  const versionQuery = getSiteVersionQuery();
  return versionQuery ? `${route}${versionQuery}` : route;
}
