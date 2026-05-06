/**
 * Centralized Icon Set
 * Exports optimized SVG icons with consistent sizes and styling
 * Usage: <Icons.Plus className="h-4 w-4" />
 */

import React from "react";

interface IconProps {
  className?: string;
  "aria-hidden"?: boolean;
}

const iconDefaults = {
  fill: "none",
  viewBox: "0 0 24 24",
  strokeWidth: 1.5,
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Icons = {
  // Navigation & UI
  Menu: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),

  Close: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),

  ChevronDown: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M19 9l-7 7-7-7" />
    </svg>
  ),

  ChevronRight: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  ),

  ChevronUp: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M5 15l7-7 7 7" />
    </svg>
  ),

  // Actions
  Plus: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M12 4.5v15m7.5-7.5h-15" strokeWidth={2} />
    </svg>
  ),

  Check: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M5 13l4 4L19 7" strokeWidth={3} />
    </svg>
  ),

  Trash: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  ),

  Edit: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  ),

  Download: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 10.5 12 15m0 0 4.5-4.5M12 15V3" />
    </svg>
  ),

  Search: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),

  // Forms & Input
  Document: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M4.5 4.5A2.25 2.25 0 0 1 6.75 2.25h8.25a2.25 2.25 0 0 1 2.25 2.25v15A2.25 2.25 0 0 1 15 21.75H6.75A2.25 2.25 0 0 1 4.5 19.5v-15Z" />
      <path d="M8.25 6.75h7.5M8.25 10.5h7.5M8.25 14.25H12" />
    </svg>
  ),

  Expand: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M8.25 3.75H4.5A.75.75 0 0 0 3.75 4.5v3.75M15.75 3.75h3.75a.75.75 0 0 1 .75.75v3.75M20.25 15.75V19.5a.75.75 0 0 1-.75.75h-3.75M3.75 15.75V19.5a.75.75 0 0 0 .75.75h3.75" />
    </svg>
  ),

  // Content
  Music: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M12 3v10.5M19.5 8.25a3 3 0 11-3-3M6.75 6.75a3 3 0 11-3 3" />
    </svg>
  ),

  Calendar: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),

  GridView: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25v-2.25Zm9-9.75A2.25 2.25 0 0 1 15 3.75H17.25a2.25 2.25 0 0 1 2.25 2.25V6A2.25 2.25 0 0 1 17.25 8.25H15a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75A2.25 2.25 0 0 1 15 13.5H17.25a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 17.25 20.25H15a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  ),

  ListView: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  ),

  People: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),

  // Status
  Settings: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94a6.05 6.05 0 0 0 1.079 1.938c.464.449 1.069.688 1.677.688.847 0 1.635.37 2.176 1.025a6.076 6.076 0 0 0 1.6 2.368c.464.449.688 1.069.688 1.677v2.592c0 .55-.398 1.02-.94 1.11a6.05 6.05 0 0 0-1.938 1.079c-.449.464-.688 1.069-.688 1.677.847 0 1.635.37 2.176 1.025a6.076 6.076 0 0 0 1.6 2.368c.164.243.39.495.667.738.28.246.602.417.943.417.556 0 1.09.198 1.511.55a6.078 6.078 0 0 1-2.368 1.6c-.655.541-1.025 1.329-1.025 2.176 0 .847.37 1.635 1.025 2.176a6.078 6.078 0 0 1-1.6 2.368c-.246.28-.494.602-.738.943-.353.351-.924.921-1.511.921-.556 0-1.09-.198-1.511-.55a6.078 6.078 0 0 1-2.368-1.6c-.655-.541-1.329-1.025-2.176-1.025-.847 0-1.635.37-2.176 1.025a6.076 6.076 0 0 1-2.368 1.6c-.243.164-.495.39-.738.667-.246.28-.417.602-.417.943 0 .556-.198 1.09-.55 1.511a6.078 6.078 0 0 1-1.6-2.368c-.541-.655-1.329-1.025-2.176-1.025-.847 0-1.635.37-2.176 1.025a6.078 6.078 0 0 1-2.368 1.6c-.28.246-.602.494-.943.738-.351.353-.921.924-.921 1.511 0 .556-.198 1.09-.55 1.511a6.078 6.078 0 0 1-1.6-2.368c-.541-.655-1.025-1.329-1.025-2.176 0-.847.37-1.635 1.025-2.176a6.076 6.076 0 0 1 1.6-2.368c.164-.243.39-.495.667-.738.28-.246.602-.417.943-.417.556 0 1.09-.198 1.511-.55a6.078 6.078 0 0 1 2.368-1.6c.655-.541 1.025-1.329 1.025-2.176 0-.847-.37-1.635-1.025-2.176a6.076 6.076 0 0 1-1.6-2.368c-.246-.28-.494-.602-.738-.943-.353-.351-.924-.921-1.511-.921-.556 0-1.09.198-1.511.55a6.078 6.078 0 0 1-2.368 1.6c-.243.164-.495.39-.738.667-.246.28-.417.602-.417.943 0 .556-.198 1.09-.55 1.511a6.078 6.078 0 0 1-1.6-2.368c-.541-.655-1.329-1.025-2.176-1.025" />
    </svg>
  ),

  // Analytics
  Analytics: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 6.75c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v13.5c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V6.75ZM16.5 6.75c0-.621.504-1.125 1.125-1.125h2.25C20.496 5.625 21 6.129 21 6.75v13.5c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V6.75Z" />
    </svg>
  ),

  ChartLine: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M3 3v18h18M7.5 14.25 10.5 11l2.25 2.25 4.5-5.25" />
    </svg>
  ),

  // Finance
  Wallet: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M2.25 9.75A3.75 3.75 0 0 1 6 6h12a3.75 3.75 0 0 1 3.75 3.75v5.25A3.75 3.75 0 0 1 18 18.75H6A3.75 3.75 0 0 1 2.25 15V9.75Z" />
      <path d="M6 9h12M7.5 13.5h3" />
    </svg>
  ),

  TrendingUp: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M2.25 18 9 11.25l4.306 4.306a11.25 11.25 0 015.814 5.814L21.75 7.5M5.25 7.5H21m0 0V21.75" />
    </svg>
  ),

  // Alerts
  AlertTriangle: (props: IconProps) => (
    <svg {...iconDefaults} {...props} fill="currentColor">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),

  AlertCircle: (props: IconProps) => (
    <svg {...iconDefaults} {...props} fill="currentColor">
      <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),

  InfoCircle: (props: IconProps) => (
    <svg {...iconDefaults} {...props} fill="currentColor">
      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),

  // Animations
  Spinner: (props: IconProps) => (
    <svg
      {...props}
      className={`animate-spin ${props.className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="4"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  ),

  // Empty states
  Music2: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
    </svg>
  ),

  Phone: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M4.5 4.5A2.25 2.25 0 0 1 6.75 2.25h8.25a2.25 2.25 0 0 1 2.25 2.25v15A2.25 2.25 0 0 1 15 21.75H6.75A2.25 2.25 0 0 1 4.5 19.5v-15Z" />
      <path d="M8.25 6.75h7.5M8.25 10.5h7.5M8.25 14.25H12" />
    </svg>
  ),

  Link: (props: IconProps) => (
    <svg {...iconDefaults} {...props}>
      <path d="M7.5 8.25h9m-9 3h5.25m4.173 6.951 1.202-.601a2.25 2.25 0 0 0 1.244-2.012V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v8.838a2.25 2.25 0 0 0 1.244 2.012l1.202.601a2.25 2.25 0 0 0 2.012 0l1.202-.601a2.25 2.25 0 0 1 2.012 0l1.202.601a2.25 2.25 0 0 0 2.012 0Z" />
    </svg>
  ),
};

// For backward compatibility with common patterns
export const LoadingSpinner = (props: IconProps) => Icons.Spinner(props);
