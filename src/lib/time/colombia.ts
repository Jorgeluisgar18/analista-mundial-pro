export const APP_TIME_ZONE = "America/Bogota";
export const APP_TIME_ZONE_LABEL = "Colombia";
export const APP_TIME_ZONE_ABBREVIATION = "COT";

function partsForTimeZone(value: string | Date, timeZone = APP_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");

  if (!year || !month || !day || !hour || !minute) return null;

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    displayDate: `${day}/${month}/${year}`,
  };
}

export function formatDateInAppTimeZone(value: string | Date) {
  return partsForTimeZone(value)?.date ?? "";
}

export function formatTimeInAppTimeZone(value: string | Date) {
  return partsForTimeZone(value)?.time ?? "";
}

export function normalizeKickoffForAppTimeZone(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = partsForTimeZone(date);
  if (!parts || Number.isNaN(date.getTime())) {
    return {
      date: "",
      time: "",
      kickoff: "",
      timezone: APP_TIME_ZONE,
    };
  }

  return {
    date: parts.date,
    time: parts.time,
    kickoff: date.toISOString(),
    timezone: APP_TIME_ZONE,
  };
}

export function formatTimestampInAppTimeZone(value: string | Date) {
  const parts = partsForTimeZone(value);
  if (!parts) return "Fecha no disponible";
  return `${parts.displayDate} · ${parts.time} ${APP_TIME_ZONE_ABBREVIATION}`;
}

export function nextIsoDate(date: string) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}
