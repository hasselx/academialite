import { useState, useEffect, useCallback } from 'react';

export interface TimeSettings {
  timeFormat: '12hr' | '24hr';
  countryCode: string;
  timezoneOffset: number;
}

const countries = [
  { name: "India", code: "IN", offset: 5.5 },
  { name: "Germany", code: "DE", offset: 1 },
  { name: "United States (EST)", code: "US-EST", offset: -5 },
  { name: "United States (PST)", code: "US-PST", offset: -8 },
  { name: "United Kingdom", code: "GB", offset: 0 },
  { name: "Japan", code: "JP", offset: 9 },
  { name: "Australia (Sydney)", code: "AU-SYD", offset: 11 },
  { name: "Singapore", code: "SG", offset: 8 },
  { name: "UAE", code: "AE", offset: 4 },
  { name: "Canada (Toronto)", code: "CA-TOR", offset: -5 },
];

export const getTimezoneOffset = (countryCode: string): number => {
  const country = countries.find(c => c.code === countryCode);
  return country?.offset ?? 5.5; // Default to IST
};

export const useTimeSettings = () => {
  const [settings, setSettings] = useState<TimeSettings>(() => {
    if (typeof window !== 'undefined') {
      const timeFormat = (localStorage.getItem('timeFormat') as '12hr' | '24hr') || '12hr';
      const countryCode = localStorage.getItem('userCountry') || 'IN';
      const timezoneOffset = getTimezoneOffset(countryCode);
      return { timeFormat, countryCode, timezoneOffset };
    }
    return { timeFormat: '12hr', countryCode: 'IN', timezoneOffset: 5.5 };
  });

  // Listen for localStorage changes (when settings are updated from sidebar)
  useEffect(() => {
    const handleStorageChange = () => {
      const timeFormat = (localStorage.getItem('timeFormat') as '12hr' | '24hr') || '12hr';
      const countryCode = localStorage.getItem('userCountry') || 'IN';
      const timezoneOffset = getTimezoneOffset(countryCode);
      setSettings({ timeFormat, countryCode, timezoneOffset });
    };

    // Check periodically for changes (since storage events don't fire in same tab)
    const interval = setInterval(handleStorageChange, 1000);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Format time based on user preference
  const formatTime = useCallback((time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    
    if (settings.timeFormat === '24hr') {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }, [settings.timeFormat]);

  // Format time range
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
