import { Component } from '@angular/core';
import { WeatherService } from '../../services/weather.service';
import { HttpClient } from '@angular/common/http';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faSun,
  faCloud,
  faCloudRain,
  faSnowflake,
  faBolt,
  faSmog,
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-weather',
  templateUrl: './weather.component.html',
  styleUrls: ['./weather.component.css'],
})
export class WeatherComponent {
  city: string = '';
  weatherData: any;
  forecast: any[] = [];
  error: string = '';
  weatherIcon: IconProp = faSun;

  constructor(
    private weatherService: WeatherService,
    private http: HttpClient
  ) {}

  getWeather(): void {
    if (!this.city) {
      this.error = 'Please enter a city name';
      return;
    }

    this.error = '';
    this.weatherService.getWeather(this.city).subscribe({
      next: (data) => {
        this.weatherData = data.currentConditions;

        this.forecast = data.days.slice(1, 6);

        this.weatherIcon = this.getWeatherIcon(this.weatherData.conditions);
      },
      error: () => {
        this.error = 'City not found or API error.';
        this.weatherData = null;
        this.forecast = [];
      },
    });
  }

  async reverseGeocode(lat: number, lon: number): Promise<string | null> {
    try {
      const response: any = await this.http
        .get(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
        )
        .toPromise();
      return (
        response.address.city ||
        response.address.town ||
        response.address.village ||
        null
      );
    } catch {
      return null;
    }
  }

  fetchWeatherByCity(city: string): void {
    this.error = '';
    this.weatherService.getWeather(city).subscribe({
      next: (data) => {
        this.weatherData = data.currentConditions;
        this.forecast = data.days.slice(0, 5);
        this.weatherIcon = this.getWeatherIcon(this.weatherData.conditions);
      },
      error: () => {
        this.error = 'City not found or API error.';
        this.weatherData = null;
        this.forecast = [];
      },
    });
  }

  getWeatherIcon(condition: string): IconProp {
    const lower = condition.toLowerCase();
    if (lower.includes('rain')) return faCloudRain;
    if (lower.includes('cloud')) return faCloud;
    if (lower.includes('snow')) return faSnowflake;
    if (lower.includes('storm') || lower.includes('thunder')) return faBolt;
    if (lower.includes('fog') || lower.includes('smog')) return faSmog;
    return faSun;
  }
}
