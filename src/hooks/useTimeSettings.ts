import { useState, useEffect, useCallback } from 'react';

export interface TimeSettings {
  timeFormat: '12hr' | '24hr';
  countryCode: string;
  timezoneOffset: number;
  timezone: string;
}

export const countries = [
  { name: "India", code: "IN", tz: "Asia/Kolkata" },
  { name: "Germany", code: "DE", tz: "Europe/Berlin" },
  { name: "United States (EST)", code: "US-EST", tz: "America/New_York" },
  { name: "United States (PST)", code: "US-PST", tz: "America/Los_Angeles" },
  { name: "United Kingdom", code: "GB", tz: "Europe/London" },
  { name: "Japan", code: "JP", tz: "Asia/Tokyo" },
  { name: "Australia (Sydney)", code: "AU-SYD", tz: "Australia/Sydney" },
  { name: "Singapore", code: "SG", tz: "Asia/Singapore" },
  { name: "UAE", code: "AE", tz: "Asia/Dubai" },
  { name: "Canada (Toronto)", code: "CA-TOR", tz: "America/Toronto" },
];

// Compute the current UTC offset (in hours, DST-aware) for an IANA timezone.
export const getOffsetForTimezone = (tz: string, date: Date = new Date()): number => {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = dtf.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0';
    const m = tzPart.match(/GMT([+-]?\d+)(?::(\d+))?/);
    if (!m) return 0;
    const h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    return h + (h < 0 ? -min / 60 : min / 60);
  } catch {
    return 0;
  }
};

export const getTimezoneForCountry = (countryCode: string): string => {
  return countries.find(c => c.code === countryCode)?.tz ?? 'Asia/Kolkata';
};

export const getTimezoneOffset = (countryCode: string): number => {
  return getOffsetForTimezone(getTimezoneForCountry(countryCode));
};

export const useTimeSettings = () => {
  const [settings, setSettings] = useState<TimeSettings>(() => {
    if (typeof window !== 'undefined') {
      const timeFormat = (localStorage.getItem('timeFormat') as '12hr' | '24hr') || '12hr';
      const countryCode = localStorage.getItem('userCountry') || 'IN';
      const timezone = getTimezoneForCountry(countryCode);
      const timezoneOffset = getOffsetForTimezone(timezone);
      return { timeFormat, countryCode, timezoneOffset, timezone };
    }
    return { timeFormat: '12hr', countryCode: 'IN', timezoneOffset: 5.5, timezone: 'Asia/Kolkata' };
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const timeFormat = (localStorage.getItem('timeFormat') as '12hr' | '24hr') || '12hr';
      const countryCode = localStorage.getItem('userCountry') || 'IN';
      const timezone = getTimezoneForCountry(countryCode);
      const timezoneOffset = getOffsetForTimezone(timezone);
      setSettings({ timeFormat, countryCode, timezoneOffset, timezone });
    };

    const interval = setInterval(handleStorageChange, 1000);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const formatTime = useCallback((time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);

    if (settings.timeFormat === '24hr') {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }, [settings.timeFormat]);

  const formatTimeRange = useCallback((startTime: string, endTime: string): string => {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }, [formatTime]);

  return {
    ...settings,
    formatTime,
    formatTimeRange,
    countries,
  };
};

export default useTimeSettings;
