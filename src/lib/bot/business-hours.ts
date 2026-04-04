import { prisma } from "@/lib/db";

const KEYS = {
  BUSINESS_HOURS_TIMEZONE: "business_hours_timezone",
  BUSINESS_HOURS_SCHEDULE: "business_hours_schedule",
} as const;

export type DaySchedule = {
  dayOfWeek: number;
  start: string;
  end: string;
  enabled: boolean;
};

async function getValue(tenantId: string, key: string): Promise<string | null> {
  const row = await prisma.appConfig.findUnique({
    where: { tenantId_key: { tenantId, key } },
  });
  return row?.value ?? null;
}

export async function getBusinessHoursConfig(tenantId: string): Promise<{
  timezone: string;
  schedule: DaySchedule[];
}> {
  const [tz, scheduleStr] = await Promise.all([
    getValue(tenantId, KEYS.BUSINESS_HOURS_TIMEZONE),
    getValue(tenantId, KEYS.BUSINESS_HOURS_SCHEDULE),
  ]);

  let schedule: DaySchedule[] = [];
  if (scheduleStr) {
    try {
      schedule = JSON.parse(scheduleStr) as DaySchedule[];
    } catch {
      schedule = [1, 2, 3, 4, 5].map((d) => ({
        dayOfWeek: d,
        start: "09:00",
        end: "18:00",
        enabled: true,
      }));
    }
  } else {
    schedule = [1, 2, 3, 4, 5].map((d) => ({
      dayOfWeek: d,
      start: "09:00",
      end: "18:00",
      enabled: true,
    }));
  }

  return {
    timezone: tz ?? "America/Bogota",
    schedule,
  };
}

export async function isWithinBusinessHours(tenantId: string): Promise<boolean> {
  const { timezone, schedule } = await getBusinessHoursConfig(tenantId);
  if (schedule.length === 0) return true;

  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const minuteStr = parts.find((p) => p.type === "minute")?.value ?? "0";
  const currentDay = dayMap[weekday] ?? 1;
  const currentMinutes = parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10);

  const dayConfig = schedule.find((s) => s.dayOfWeek === currentDay && s.enabled);
  if (!dayConfig) return false;

  const [startH, startM] = dayConfig.start.split(":").map(Number);
  const [endH, endM] = dayConfig.end.split(":").map(Number);
  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export async function saveBusinessHours(
  tenantId: string,
  config: {
    timezone?: string;
    schedule?: DaySchedule[];
  }
): Promise<void> {
  if (config.timezone !== undefined) {
    await prisma.appConfig.upsert({
      where: { tenantId_key: { tenantId, key: KEYS.BUSINESS_HOURS_TIMEZONE } },
      create: { tenantId, key: KEYS.BUSINESS_HOURS_TIMEZONE, value: config.timezone },
      update: { value: config.timezone },
    });
  }
  if (config.schedule !== undefined) {
    await prisma.appConfig.upsert({
      where: { tenantId_key: { tenantId, key: KEYS.BUSINESS_HOURS_SCHEDULE } },
      create: {
        tenantId,
        key: KEYS.BUSINESS_HOURS_SCHEDULE,
        value: JSON.stringify(config.schedule),
      },
      update: { value: JSON.stringify(config.schedule) },
    });
  }
}
