import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// UI helper utilities for consistent styling and formatting

const colors = [
  "bg-blue-600",
  "bg-green-600",
  "bg-purple-600",
  "bg-orange-600",
  "bg-red-600",
  "bg-indigo-600",
  "bg-pink-600",
  "bg-cyan-600",
];

/**
 * Generates a consistent color based on a string (like name or id)
 * @param text - The text to generate a color for
 * @returns A Tailwind CSS color class
 */
export const generateColorFromText = (text: string): string => {
  const colorIndex =
    text.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  return colors[colorIndex];
};

/**
 * Formats a date into a human-readable "time ago" string
 * @param dateString - ISO date string
 * @returns Formatted time string
 */
export const formatTimeAgo = (dateString: string): string => {
  const updatedDate = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - updatedDate.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInHours < 1) {
    return "Just now";
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  } else {
    return updatedDate.toLocaleDateString();
  }
};
