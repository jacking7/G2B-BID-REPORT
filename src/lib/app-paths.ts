export const appBasePath = "/g2breport";

export function appPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (
    normalizedPath === appBasePath ||
    normalizedPath.startsWith(`${appBasePath}/`)
  ) {
    return normalizedPath;
  }

  if (normalizedPath === "/") {
    return `${appBasePath}/`;
  }

  return `${appBasePath}${normalizedPath}`;
}

export function stripAppBasePath(pathname: string) {
  if (pathname === appBasePath) {
    return "/";
  }

  if (pathname.startsWith(`${appBasePath}/`)) {
    return pathname.slice(appBasePath.length) || "/";
  }

  return pathname;
}

export function appUrl(origin: string, path: string) {
  return new URL(appPath(path), origin);
}
