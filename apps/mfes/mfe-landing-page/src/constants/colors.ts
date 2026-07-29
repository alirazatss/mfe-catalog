/**
 * Making this for now, we can change to library after
 */

export const TSS_COLORS = {
  // Primary brand colors
  primary: "#312e51",
  secondaryGreen: "#99cc00",
  lightBlue: "#043872",
  white: "#ffffff",
  black: "#000000",

  // Grays
  grey2: "#999999",
  lightGray: "#9694a5",
  mediumGray: "#d1d5db",
  lightBackground: "#fafafa",
  borderGray: "#ecf1f3",

  // Purples
  primaryLight: "#706cad",
  purple3: "#706cad",
  purple4: "#c6c4e291",

  // Milestone status colors
  milestone: {
    completed: "#706cad",
    current: "#99cc00",
    future: "#999999",
  },

  // Alarm colors
  alarm: {
    primary: "rgb(220, 38, 38)",
    background: "rgb(254, 242, 242)",
    border: "rgb(254, 226, 226)",
  },

  // Status badge colors (background + text pairs)
  status: {
    pendingBackground: "#fef3c7",
    pendingText: "#92400e",
    uploadingBackground: "#dbeafe",
    uploadingText: "#1e40af",
    uploadedBackground: "rgba(153, 204, 0, 0.15)",
    uploadedText: "#5a7a00",
    failedBackground: "#fee2e2",
    failedText: "#b91c1c",
    quarantineBackground: "rgb(254, 242, 242)",
    quarantineText: "rgb(220, 38, 38)",
  },
} as const;
