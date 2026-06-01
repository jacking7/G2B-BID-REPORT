const DEFAULT_TIMEZONE = "Asia/Seoul";
const DEFAULT_SEND_TIME = "09:00";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function parseClockTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return { hour: 9, minute: 0 };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour > 23 || minute > 59) {
    return { hour: 9, minute: 0 };
  }

  return { hour, minute };
}

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function getZonedDateLabel(date: Date, timezone: string) {
  const parts = getZonedParts(date, timezone);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");

  return `${parts.year}-${month}-${day}`;
}

function addDaysToDateLabel(dateLabel: string, days: number) {
  const [year, month, day] = dateLabel.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return date.toISOString().slice(0, 10);
}

function getTimezoneOffsetMs(date: Date, timezone: string) {
  const parts = getZonedParts(date, timezone);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return zonedAsUtc - date.getTime();
}

function zonedDateTimeToUtc(dateLabel: string, clockTime: string, timezone: string) {
  const [year, month, day] = dateLabel.split("-").map(Number);
  const { hour, minute } = parseClockTime(clockTime);
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let utcMs = targetUtc;

  for (let index = 0; index < 3; index += 1) {
    const offset = getTimezoneOffsetMs(new Date(utcMs), timezone);
    const nextUtcMs = targetUtc - offset;

    if (Math.abs(nextUtcMs - utcMs) < 1) {
      break;
    }

    utcMs = nextUtcMs;
  }

  return new Date(utcMs);
}

export function getDailyReportWindow(input?: {
  timezone?: string | null;
  sendTime?: string | null;
  now?: Date;
}) {
  const timezone = input?.timezone || DEFAULT_TIMEZONE;
  const sendTime = input?.sendTime || DEFAULT_SEND_TIME;
  const now = input?.now ?? new Date();
  const today = getZonedDateLabel(now, timezone);
  const todaySendAt = zonedDateTimeToUtc(today, sendTime, timezone);
  const endDateLabel =
    now.getTime() >= todaySendAt.getTime() ? today : addDaysToDateLabel(today, -1);
  const startDateLabel = addDaysToDateLabel(endDateLabel, -1);

  return {
    start: zonedDateTimeToUtc(startDateLabel, sendTime, timezone),
    end: zonedDateTimeToUtc(endDateLabel, sendTime, timezone),
    label: endDateLabel,
    timezone,
    sendTime,
  };
}
