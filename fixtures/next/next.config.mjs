// Pin the root so the package's own lockfile one level up is not mistaken for a workspace.
export default { outputFileTracingRoot: import.meta.dirname };
