// Format utility functions for the ChenPilot client

/**
 * Format a Stellar-style address for display.
 * Keep the full value when it is already short enough; otherwise keep the first
 * characters and append a trailing suffix with the end characters.
 */
export function formatAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4,
): string {
  if (!address || address.length <= startChars + endChars + 1) {
    return address;
  }

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format a token amount for display
 */
export function formatTokenAmount(
  amount: string | number,
  decimals: number = 4,
  tokenSymbol?: string,
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (Number.isNaN(numAmount)) {
    return "0";
  }

  const formatted = numAmount.toFixed(decimals);
  const trimmed = parseFloat(formatted).toString();

  return tokenSymbol ? `${trimmed} ${tokenSymbol}` : trimmed;
}

/**
 * Format a large number with appropriate suffixes (K, M, B)
 */
export function formatLargeNumber(num: number, decimals: number = 1): string {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(decimals) + "B";
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(decimals) + "M";
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(decimals) + "K";
  }
  return num.toString();
}

/**
 * Format a date for display.
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return dateObj.toLocaleDateString("en-US", { ...defaultOptions, ...options });
}

/**
 * Format a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
  }

  return formatDate(dateObj, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a transaction hash for display
 */
export function formatTransactionHash(
  hash: string,
  startChars: number = 8,
  endChars: number = 8,
): string {
  if (!hash || hash.length <= startChars + endChars) {
    return hash;
  }
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Format a percentage for display
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a file size in bytes to human readable format
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert a string to title case
 */
export function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
  );
}

/**
 * Truncate text to a specified length.
 * Reserve one character for a separating space when a custom suffix is used.
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = "...",
): string {
  if (text.length <= maxLength) {
    return text;
  }

  if (suffix === "...") {
    return text.slice(0, maxLength - suffix.length) + suffix;
  }

  const visibleLength = Math.max(0, maxLength - suffix.length - 1);
  return `${text.slice(0, visibleLength).trimEnd()} ${suffix}`;
}
