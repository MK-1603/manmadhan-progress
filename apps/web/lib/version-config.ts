export interface ReleaseInfo {
  version: string;
  releaseDate: string;
  environment: "Production" | "Staging" | "Development";
  summary: string;
  highlights: string[];
  bugFixes: string[];
  performanceImprovements: string[];
}

export const CURRENT_APP_VERSION = "1.4.1";

export const APP_RELEASE_DATA: ReleaseInfo[] = [
  {
    version: "1.4.1",
    releaseDate: "Aug 28, 2026",
    environment: "Production",
    summary: "Production-grade PWA install & update experience, Task Execution Workspace upgrade, and GitHub OAuth resilience.",
    highlights: [
      "Dedicated /updates and /install PWA onboarding experiences",
      "Production-grade Service Worker lifecycle management",
      "Structured task creation workflow and role-based permissions",
      "Resilient GitHub OAuth redirect handling and session preservation",
    ],
    bugFixes: [
      "Fixed missing GITHUB_REDIRECT_URI environment fallback on Render backend",
      "Fixed unexpected session clearance during GitHub OAuth cancellations",
      "Resolved project milestone validation and assignees cross-project filtering",
    ],
    performanceImprovements: [
      "Optimized PWA startup shell & offline caching strategy",
      "Reduced static page bundle size across organization routes",
      "Faster real-time task update socket sync",
    ],
  },
  {
    version: "1.4.0",
    releaseDate: "Aug 20, 2026",
    environment: "Production",
    summary: "Project Lead Authority RBAC model and mobile Project Creation workspace rebuild.",
    highlights: [
      "Project Lead Authority model for assigned CO-CEOs",
      "Compact mobile creation stepper and single-line progress indicator",
      "Organization hierarchy separation (CEO, Project Lead, Members)",
    ],
    bugFixes: [
      "Fixed horizontal stepper overflow on mobile viewports",
      "Resolved legacy project creation route sync",
    ],
    performanceImprovements: [
      "Streamlined API client interceptors and error logging",
    ],
  },
];
