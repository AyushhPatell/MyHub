import { WeatherData } from '../types';

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY || '07216e07f2e6e4ff2bc1009e81b1e9df';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Map OpenWeatherMap condition codes to emoji icons
const getWeatherIcon = (code: number, isDay: boolean = true): string => {
  // Clear sky
  if (code === 800) return isDay ? '☀️' : '🌙';
  // Clear (few clouds)
  if (code === 801) return isDay ? '🌤️' : '☁️';
  // Scattered clouds
  if (code === 802) return '⛅';
  // Broken clouds / Overcast
  if (code === 803 || code === 804) return '☁️';
  // Rain
  if (code >= 500 && code < 600) return '🌧️';
  // Thunderstorm
  if (code >= 200 && code < 300) return '⛈️';
  // Snow
  if (code >= 600 && code < 700) return '❄️';
  // Mist/Fog
  if (code >= 700 && code < 800) return '🌫️';
  // Default
  return '🌤️';
};

// Get condition description from code
const getConditionDescription = (code: number): string => {
  if (code === 800) return 'Clear Sky';
  if (code === 801) return 'Few Clouds';
  if (code === 802) return 'Scattered Clouds';
  if (code === 803) return 'Broken Clouds';
  if (code === 804) return 'Overcast';
  if (code >= 200 && code < 300) return 'Thunderstorm';
  if (code >= 300 && code < 400) return 'Drizzle';
  if (code >= 500 && code < 600) return 'Rain';
  if (code >= 600 && code < 700) return 'Snow';
  if (code >= 700 && code < 800) return 'Mist';
  return 'Unknown';
};

// Check if it's currently day time
const isDayTime = (sunrise: number, sunset: number): boolean => {
  const now = Math.floor(Date.now() / 1000);
  return now >= sunrise && now < sunset;
};

export const weatherService = {
  async getWeatherData(location: string = 'Halifax, NS'): Promise<WeatherData> {
    try {
      // Use coordinates for Halifax, Nova Scotia, Canada for precise location
      // Latitude: 44.6488, Longitude: -63.5752
      // This ensures we get the correct Halifax, not other cities named Halifax
      const HALIFAX_NS_COORDS = { lat: 44.6488, lon: -63.5752 };
      
      // First, try to get current weather using coordinates (most accurate)
      const timestamp = Date.now();
      let geoResponse = await fetch(
        `${BASE_URL}/weather?lat=${HALIFAX_NS_COORDS.lat}&lon=${HALIFAX_NS_COORDS.lon}&appid=${API_KEY}&units=metric&_=${timestamp}`
      );

      // If coordinates fail, try location name
      let triedLocations = ['Coordinates'];
      if (!geoResponse.ok) {
        let searchLocation = location;
        if (location.includes(', NS') || location.includes(', NS,')) {
          searchLocation = location.replace(', NS', ',CA').replace(', NS,', ',CA,');
        } else if (location.includes('Halifax') && !location.includes(',')) {
          searchLocation = 'Halifax,CA';
        }
        triedLocations.push(searchLocation, location, 'Halifax,CA');
        geoResponse = await fetch(
          `${BASE_URL}/weather?q=${encodeURIComponent(searchLocation)}&appid=${API_KEY}&units=metric&_=${timestamp}`
        );
      }

      if (!geoResponse.ok) {
        const errorData = await geoResponse.json().catch(() => ({}));
        console.error('Weather API Error:', {
          status: geoResponse.status,
          statusText: geoResponse.statusText,
          error: errorData,
          triedLocations
        });
        throw new Error(`Failed to fetch weather data: ${geoResponse.status} ${geoResponse.statusText}`);
      }

      const currentData = await geoResponse.json();

      // Get 5-day forecast using coordinates (same as current weather)
      const forecastResponse = await fetch(
        `${BASE_URL}/forecast?lat=${HALIFAX_NS_COORDS.lat}&lon=${HALIFAX_NS_COORDS.lon}&appid=${API_KEY}&units=metric&_=${timestamp}`
      );

      if (!forecastResponse.ok) {
        // If forecast fails, continue with current weather only
        console.warn('Failed to fetch forecast, using current weather only');
      }

      // Process current weather
      const isDay = isDayTime(currentData.sys.sunrise, currentData.sys.sunset);
      const weatherIcon = getWeatherIcon(currentData.weather[0].id, isDay);
      const condition = getConditionDescription(currentData.weather[0].id);

      // Process forecast if available
      let forecast: WeatherData['forecast'] = [];
      
      if (forecastResponse.ok) {
        const forecastData = await forecastResponse.json();
        
        // Process forecast - group by day and get min/max
        const forecastByDay: { [key: string]: { temps: number[]; conditions: { code: number; hour: number }[] } } = {};
        
        forecastData.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toISOString().split('T')[0];
        
        if (!forecastByDay[dateKey]) {
          forecastByDay[dateKey] = {
            temps: [],
            conditions: [],
          };
        }
        
        // Collect all temperatures for the day
        forecastByDay[dateKey].temps.push(item.main.temp);
        // Store condition with hour for later selection
        forecastByDay[dateKey].conditions.push({ 
          code: item.weather[0].id, 
          hour: date.getHours() 
        });
      });

        // Convert to forecast array
        const today = new Date().toISOString().split('T')[0];
        forecast = Object.entries(forecastByDay)
          .filter(([date]) => date !== today) // Exclude today
          .slice(0, 5)
          .map(([date, data]) => {
            // Get condition from closest to noon (12 PM)
            const noonCondition = data.conditions.reduce((closest, current) => {
              const currentDiff = Math.abs(current.hour - 12);
              const closestDiff = Math.abs(closest.hour - 12);
              return currentDiff < closestDiff ? current : closest;
            });
            
            const conditionCode = noonCondition.code;
            const forecastIsDay = true; // Forecast is typically shown for daytime
            
            return {
              date,
              high: Math.round(Math.max(...data.temps)),
              low: Math.round(Math.min(...data.temps)),
              condition: getConditionDescription(conditionCode),
              icon: getWeatherIcon(conditionCode, forecastIsDay),
            };
          });
      }

      // Ensure we're using the most accurate data from the API
      const windSpeedKmh = currentData.wind?.speed ? Math.round(currentData.wind.speed * 3.6) : 0;
      
      return {
        location: `${currentData.name}, ${currentData.sys.country}`,
        temperature: Math.round(currentData.main.temp),
        condition,
        icon: weatherIcon,
        humidity: currentData.main.humidity || 0,
        windSpeed: windSpeedKmh,
        feelsLike: Math.round(currentData.main.feels_like),
        pressure: currentData.main.pressure || 0,
        uvIndex: 0, // Not available in free tier
        visibility: currentData.visibility ? Math.round(currentData.visibility / 1000) : undefined, // Convert to km
        sunrise: new Date(currentData.sys.sunrise * 1000),
        sunset: new Date(currentData.sys.sunset * 1000),
        forecast,
      };
    } catch (error) {
      console.error('Error fetching weather:', error);
      throw error;
    }
  },
};

