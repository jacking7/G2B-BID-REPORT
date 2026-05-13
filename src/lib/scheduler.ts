import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { collectBidNotices } from "@/lib/bid-collector";
import { sendPendingReport } from "@/lib/mail";

const globalForScheduler = globalThis as typeof globalThis & {
  g2bSchedulerStarted?: boolean;
  g2bSchedulerMinuteKeys?: Set<string>;
};

function getCurrentTimeParts(timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${lookup.year}-${lookup.month}-${lookup.day}`,
    time: `${lookup.hour}:${lookup.minute}`,
  };
}

async function runScheduledJobs() {
  const settings = await prisma.scheduleSetting.findMany({
    where: {
      active: true,
    },
    select: {
      userId: true,
      collectTime: true,
      sendTime: true,
      timezone: true,
    },
  });

  const minuteKeys = globalForScheduler.g2bSchedulerMinuteKeys ?? new Set<string>();
  globalForScheduler.g2bSchedulerMinuteKeys = minuteKeys;

  for (const setting of settings) {
    const { date, time } = getCurrentTimeParts(setting.timezone);

    if (time === setting.collectTime) {
      const key = `${setting.userId}:collect:${date}:${time}`;
      if (!minuteKeys.has(key)) {
        minuteKeys.add(key);
        await collectBidNotices(setting.userId);
      }
    }

    if (time === setting.sendTime) {
      const key = `${setting.userId}:send:${date}:${time}`;
      if (!minuteKeys.has(key)) {
        minuteKeys.add(key);
        await sendPendingReport(setting.userId);
      }
    }
  }

  if (minuteKeys.size > 500) {
    const recent = Array.from(minuteKeys).slice(-200);
    globalForScheduler.g2bSchedulerMinuteKeys = new Set(recent);
  }
}

export function ensureSchedulerStarted() {
  if (process.env.ENABLE_INTERNAL_SCHEDULER !== "true") {
    return;
  }

  if (globalForScheduler.g2bSchedulerStarted) {
    return;
  }

  globalForScheduler.g2bSchedulerStarted = true;
  globalForScheduler.g2bSchedulerMinuteKeys = globalForScheduler.g2bSchedulerMinuteKeys ?? new Set();

  cron.schedule("* * * * *", () => {
    void runScheduledJobs();
  });
}
