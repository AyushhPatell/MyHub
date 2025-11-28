import { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, MapPin, RefreshCw } from 'lucide-react';
import { WeatherData } from '../../types';

interface WeatherWidgetProps {
  size: 'small' | 'medium' | 'large';
  location?: string;
}

// Mock weather data - Replace with actual API call
const getWeatherData = async (location: string = 'Halifax, NS'): Promise<WeatherData> => {
  // TODO: Replace with actual weather API (OpenWeatherMap, WeatherAPI, etc.)
  // For now, return mock data
  return {
    location,
    temperature: 15,
    condition: 'Partly Cloudy',
    icon: '⛅',
    humidity: 65,
    windSpeed: 12,
    forecast: [
      { date: '2025-11-29', high: 18, low: 10, condition: 'Sunny', icon: '☀️' },
      { date: '2025-11-30', high: 16, low: 8, condition: 'Cloudy', icon: '☁️' },
      { date: '2025-12-01', high: 14, low: 6, condition: 'Rainy', icon: '🌧️' },
      { date: '2025-12-02', high: 17, low: 9, condition: 'Partly Cloudy', icon: '⛅' },
      { date: '2025-12-03', high: 19, low: 11, condition: 'Sunny', icon: '☀️' },
    ],
  };
};

export default function WeatherWidget({ size, location = 'Halifax, NS' }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWeatherData(location);
      setWeather(data);
    } catch (err) {
      setError('Failed to load weather');
      console.error('Weather error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
    // Refresh every 30 minutes
    const interval = setInterval(loadWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{error || 'No weather data'}</p>
        <button
          onClick={loadWeather}
          className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (size === 'small') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{weather.location}</span>
          </div>
          <button
            onClick={loadWeather}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{weather.temperature}°</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{weather.condition}</div>
          </div>
          <div className="text-4xl">{weather.icon}</div>
        </div>
      </div>
    );
  }

  if (size === 'medium') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{weather.location}</span>
          </div>
          <button
            onClick={loadWeather}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">{weather.temperature}°</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{weather.condition}</div>
          </div>
          <div className="text-5xl">{weather.icon}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{weather.windSpeed} km/h</span>
          </div>
        </div>
      </div>
    );
  }

  // Large size
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{weather.location}</span>
        </div>
        <button
          onClick={loadWeather}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-5xl font-bold text-gray-900 dark:text-white">{weather.temperature}°</div>
          <div className="text-base text-gray-500 dark:text-gray-400 mt-1">{weather.condition}</div>
        </div>
        <div className="text-6xl">{weather.icon}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Humidity: {weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Wind: {weather.windSpeed} km/h</span>
        </div>
      </div>
      {weather.forecast.length > 0 && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">5-Day Forecast</div>
          <div className="grid grid-cols-5 gap-2">
            {weather.forecast.slice(0, 5).map((day, idx) => (
              <div key={idx} className="text-center">
                <div className="text-lg mb-1">{day.icon}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{day.high}°/{day.low}°</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

