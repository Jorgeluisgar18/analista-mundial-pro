import { formatTimestampInAppTimeZone } from "@/lib/time/colombia";

export function formatTimestamp(value: string) {
  return formatTimestampInAppTimeZone(value);
}
