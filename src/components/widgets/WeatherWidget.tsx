import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, Droplets, Wind, Eye, Gauge, Sunrise, Sunset, Thermometer, FlipHorizontal } from 'lucide-react';
import { WeatherData } from '../../types';
import { weatherService } from '../../services/weather';

interface WeatherWidgetProps {
  size: 'small' | 'medium' | 'large';
  location?: string;
}

export default function WeatherWidget({ size, location = 'Halifax, NS' }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const loadWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await weatherService.getWeatherData(location);
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
    // Refresh every 10 minutes for more accurate data
    const interval = setInterval(loadWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 font-semibold">{error || 'No weather data'}</p>
        <button
          onClick={loadWeather}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  // Small size with flip card design
  if (size === 'small') {
    return (
      <div className="w-full">
        <div 
          className={`relative w-full transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front Side - Current Weather */}
          <div 
            className="backface-hidden cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{weather.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlipped(!isFlipped);
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="View forecast"
                  >
                    <FlipHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadWeather();
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
              
              {/* Temperature and Condition */}
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {weather.temperature}°
                  </span>
                  <span className="text-2xl">{weather.icon}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    {weather.condition}
                  </div>
                </div>
              </div>
              
              {/* Details Grid */}
              <div className="grid grid-cols-4 gap-2">
                {weather.feelsLike !== undefined && (
                  <div className="flex flex-col items-center bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 border border-orange-200 dark:border-orange-800/30">
                    <Thermometer className="w-4 h-4 text-orange-600 dark:text-orange-400 mb-1" />
                    <div className="text-[10px] font-semibold text-orange-700 dark:text-orange-300 uppercase mb-0.5">Feels</div>
                    <div className="text-sm font-bold text-orange-900 dark:text-orange-100">{weather.feelsLike}°</div>
                  </div>
                )}
                <div className="flex flex-col items-center bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800/30">
                  <Wind className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1" />
                  <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase mb-0.5">Wind</div>
                  <div className="text-sm font-bold text-blue-900 dark:text-blue-100">{weather.windSpeed}</div>
                </div>
                {weather.sunrise && (
                  <div className="flex flex-col items-center bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 border border-yellow-200 dark:border-yellow-800/30">
                    <Sunrise className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mb-1" />
                    <div className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-300 uppercase mb-0.5">Rise</div>
                    <div className="text-xs font-bold text-yellow-900 dark:text-yellow-100">
                      {weather.sunrise.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                )}
                {weather.sunset && (
                  <div className="flex flex-col items-center bg-pink-50 dark:bg-pink-900/20 rounded-lg p-2 border border-pink-200 dark:border-pink-800/30">
                    <Sunset className="w-4 h-4 text-pink-600 dark:text-pink-400 mb-1" />
                    <div className="text-[10px] font-semibold text-pink-700 dark:text-pink-300 uppercase mb-0.5">Set</div>
                    <div className="text-xs font-bold text-pink-900 dark:text-pink-100">
                      {weather.sunset.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Back Side - Forecast */}
          <div 
            className="absolute inset-0 backface-hidden rotate-y-180 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="space-y-3 h-full flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">5-Day Forecast</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(false);
                  }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Back"
                >
                  <FlipHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              {weather.forecast.length > 0 ? (
                <div className="flex-1 overflow-y-auto space-y-2">
                  {weather.forecast.slice(0, 5).map((day, idx) => {
                    const date = new Date(day.date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs font-semibold text-gray-900 dark:text-white w-12 flex-shrink-0">
                            {isToday ? 'Today' : dayName}
                          </span>
                          <span className="text-xl flex-shrink-0">{day.icon}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                            {day.condition}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0 ml-2">
                          {day.high}°/{day.low}°
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  No forecast available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Medium and Large sizes (unchanged)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-bold text-gray-900 dark:text-white">{weather.location}</span>
        </div>
        <button
          onClick={loadWeather}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className="text-6xl font-bold text-gray-900 dark:text-white leading-none mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-white dark:to-indigo-200 bg-clip-text text-transparent">
            {weather.temperature}°
          </div>
          <div className="text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {weather.condition}
          </div>
        </div>
        <div className="text-7xl">{weather.icon}</div>
      </div>

      <div className="pt-5 border-t border-gray-200 dark:border-white/10">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Humidity
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{weather.humidity}%</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <Wind className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Wind
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{weather.windSpeed} km/h</div>
              </div>
            </div>
            {weather.feelsLike && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                  <Thermometer className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Feels Like
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{weather.feelsLike}°</div>
                </div>
              </div>
            )}
            {weather.pressure && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <Gauge className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Pressure
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{weather.pressure} hPa</div>
                </div>
              </div>
            )}
            {weather.visibility !== undefined && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Visibility
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{weather.visibility} km</div>
                </div>
              </div>
            )}
            {weather.sunrise && weather.sunset && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                  <Sunrise className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Sunrise
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {weather.sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )}
          </div>
          {weather.sunset && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <Sunset className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Sunset
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {weather.sunset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )}
        </div>

      {size === 'large' && weather.forecast.length > 0 && (
        <div className="pt-5 border-t border-gray-200 dark:border-white/10">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            5-Day Forecast
          </div>
          <div className="grid grid-cols-5 gap-3">
            {weather.forecast.slice(0, 5).map((day, idx) => {
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div key={idx} className="text-center">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    {isToday ? 'Today' : dayName}
                  </div>
                  <div className="text-3xl mb-2">{day.icon}</div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white mb-1">
                    {day.high}°/{day.low}°
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {day.condition}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
