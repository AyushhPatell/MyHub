/**
 * Dark Mode Scheduler Utility
 * Handles automatic theme switching based on time or sunset/sunrise
 */

export type ScheduleType = "time" | "sunset" | "sunrise";

export interface DarkModeScheduleConfig {
  enabled: boolean;
  type: ScheduleType;
  timeFrom?: string; // "18:00" - when to switch to dark mode
  timeTo?: string; // "07:00" - when to switch back to light mode
  location?: {
    lat: number;
    lng: number;
  };
  timezone?: string;
}

/**
 * Calculate sunrise and sunset times for a given date and location
 * Uses a simplified algorithm (not as accurate as full astronomical calculations)
 */
function calculateSunTimes(date: Date, lat: number, lng: number): { sunrise: Date; sunset: Date } {
  // Convert latitude to radians
  const latRad = (lat * Math.PI) / 180;

  // Calculate day of year
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Solar declination (simplified)
  const declination = 23.45 * Math.sin((360 / 365) * (284 + dayOfYear) * (Math.PI / 180)) * (Math.PI / 180);

  // Hour angle
  const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(declination));

  // Solar noon (in hours from midnight UTC)
  const solarNoon = 12 + (lng * 4) / 60; // Adjust for longitude

  // Sunrise and sunset times (in hours from midnight UTC)
  const sunriseHours = solarNoon - (hourAngle * 12) / Math.PI;
  const sunsetHours = solarNoon + (hourAngle * 12) / Math.PI;

  // Create Date objects
  const sunrise = new Date(date);
  sunrise.setUTCHours(Math.floor(sunriseHours), Math.round((sunriseHours % 1) * 60), 0, 0);

  const sunset = new Date(date);
  sunset.setUTCHours(Math.floor(sunsetHours), Math.round((sunsetHours % 1) * 60), 0, 0);

  // Convert to local time
  const localSunrise = new Date(sunrise.getTime() - (date.getTimezoneOffset() * 60 * 1000));
  const localSunset = new Date(sunset.getTime() - (date.getTimezoneOffset() * 60 * 1000));

  return {
    sunrise: localSunrise,
    sunset: localSunset,
  };
}

/**
 * Parse time string (HH:MM) and return hours and minutes
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
}

/**
 * Check if current time should be dark mode based on schedule
 */
export function shouldBeDarkMode(config: DarkModeScheduleConfig): boolean {
  if (!config.enabled) {
    return false; // Scheduling disabled, use manual theme
  }

  const now = new Date();

  switch (config.type) {
    case "time": {
      if (!config.timeFrom || !config.timeTo) {
        return false;
      }

      const from = parseTime(config.timeFrom);
      const to = parseTime(config.timeTo);

      const fromTime = new Date(now);
      fromTime.setHours(from.hours, from.minutes, 0, 0);

      const toTime = new Date(now);
      toTime.setHours(to.hours, to.minutes, 0, 0);

      // Handle overnight schedule (e.g., 18:00 to 07:00)
      if (from.hours > to.hours || (from.hours === to.hours && from.minutes > to.minutes)) {
        // Overnight: dark mode from timeFrom to midnight, and from midnight to timeTo
        return now >= fromTime || now < toTime;
      } else {
        // Same day: dark mode between timeFrom and timeTo
        return now >= fromTime && now < toTime;
      }
    }

    case "sunset": {
      if (!config.location) {
        return false;
      }

      const { sunset } = calculateSunTimes(now, config.location.lat, config.location.lng);
      return now >= sunset;
    }

    case "sunrise": {
      if (!config.location) {
        return false;
      }

      const { sunrise, sunset } = calculateSunTimes(now, config.location.lat, config.location.lng);
      // Dark mode from sunset to sunrise
      return now >= sunset || now < sunrise;
    }

    default:
      return false;
  }
}

/**
 * Get the next time the theme should switch
 * Useful for scheduling the next check
 */
export function getNextSwitchTime(config: DarkModeScheduleConfig): Date | null {
  if (!config.enabled) {
    return null;
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  switch (config.type) {
    case "time": {
      if (!config.timeFrom || !config.timeTo) {
        return null;
      }

      const from = parseTime(config.timeFrom);
      const to = parseTime(config.timeTo);

      const fromTime = new Date(now);
      fromTime.setHours(from.hours, from.minutes, 0, 0);

      const toTime = new Date(now);
      toTime.setHours(to.hours, to.minutes, 0, 0);

      const isCurrentlyDark = shouldBeDarkMode(config);

      if (isCurrentlyDark) {
        // Next switch is at timeTo (switch to light)
        if (toTime > now) {
          return toTime;
        } else {
          // timeTo is tomorrow
          const nextToTime = new Date(tomorrow);
          nextToTime.setHours(to.hours, to.minutes, 0, 0);
          return nextToTime;
        }
      } else {
        // Next switch is at timeFrom (switch to dark)
        if (fromTime > now) {
          return fromTime;
        } else {
          // timeFrom is tomorrow
          const nextFromTime = new Date(tomorrow);
          nextFromTime.setHours(from.hours, from.minutes, 0, 0);
          return nextFromTime;
        }
      }
    }

    case "sunset": {
      if (!config.location) {
        return null;
      }

      const { sunset } = calculateSunTimes(now, config.location.lat, config.location.lng);
      if (sunset > now) {
        return sunset;
      } else {
        // Sunset is tomorrow
        const { sunset: nextSunset } = calculateSunTimes(tomorrow, config.location.lat, config.location.lng);
        return nextSunset;
      }
    }

    case "sunrise": {
      if (!config.location) {
        return null;
      }

      const { sunrise, sunset } = calculateSunTimes(now, config.location.lat, config.location.lng);
      const isCurrentlyDark = now >= sunset || now < sunrise;

      if (isCurrentlyDark) {
        // Next switch is at sunrise
        if (sunrise > now) {
          return sunrise;
        } else {
          // Sunrise is tomorrow
          const { sunrise: nextSunrise } = calculateSunTimes(tomorrow, config.location.lat, config.location.lng);
          return nextSunrise;
        }
      } else {
        // Next switch is at sunset
        if (sunset > now) {
          return sunset;
        } else {
          // Sunset is tomorrow
          const { sunset: nextSunset } = calculateSunTimes(tomorrow, config.location.lat, config.location.lng);
          return nextSunset;
        }
      }
    }

    default:
      return null;
  }
}

