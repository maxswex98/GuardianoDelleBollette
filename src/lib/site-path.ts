export function getSiteBasePath(): string {
  const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
  const shouldUseBasePath =
    process.env.GITHUB_ACTIONS === "true" && repositoryName !== "" && !repositoryName.endsWith(".github.io");

  return shouldUseBasePath ? `/${repositoryName}` : "";
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
