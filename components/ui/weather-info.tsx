"use client"

import { useEffect, useState } from 'react';
import { Cloud, CloudRain, CloudSnow, Sun, Loader2 } from 'lucide-react';

interface WeatherInfoProps {
  lat: number;
  lng: number;
  compact?: boolean;
}

interface WeatherData {
  temp: number;
  condition: string;
}

export const WeatherInfo = ({ lat, lng, compact = false }: WeatherInfoProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      setIsLoading(true);
      setError(null);
      
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
      
      console.log('API Key available:', !!apiKey, 'First few chars:', apiKey?.slice(0, 4));

      if (!apiKey) {
        console.error('OpenWeather API key is missing');
        setError('API key not configured');
        setIsLoading(false);
        return;
      }

      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=imperial`;
        
        console.log('Fetching weather from:', url.replace(apiKey, 'API_KEY'));

        const response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Weather API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        setWeather({
          temp: Math.round(data.main.temp),
          condition: data.weather[0].main.toLowerCase()
        });
      } catch (error) {
        console.error('Error fetching weather:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch weather');
      } finally {
        setIsLoading(false);
      }
    };

    if (lat && lng) {
      fetchWeather();
    }
  }, [lat, lng]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">--°</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Cloud className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">--°</span>
      </div>
    );
  }

  const WeatherIcon = () => {
    switch (weather.condition) {
      case 'clear':
        return <Sun className="h-5 w-5 text-yellow-500" />;
      case 'clouds':
        return <Cloud className="h-5 w-5 text-gray-400" />;
      case 'rain':
      case 'drizzle':
        return <CloudRain className="h-5 w-5 text-blue-400" />;
      case 'snow':
        return <CloudSnow className="h-5 w-5 text-blue-200" />;
      default:
        return <Cloud className="h-5 w-5 text-gray-400" />;
    }
  };

  return compact ? (
    <span>{weather.temp}°C</span>
  ) : (
    <div className="flex flex-col items-center gap-1">
      <WeatherIcon />
      <span className="text-sm font-medium text-white font-[Oxanium]">{weather.temp}°</span>
    </div>
  );
}; 