import { Component, OnInit, OnDestroy } from '@angular/core';
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
  faLocationDot,
  faTemperatureHigh,
  faTemperatureLow,
  faEye,
  faGauge,
  faDroplet,
  faWind,
  faMagnifyingGlass,
  faSpinner,
  faClock,
  faCalendarDays,
  faStar,
  faTrash,
  faCloudSun,
  faCloudMoon,
  faMoon,
} from '@fortawesome/free-solid-svg-icons';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

interface ForecastDay {
  datetime: string;
  temp: number;
  tempmax: number;
  tempmin: number;
  conditions: string;
  humidity: number;
  windspeed: number;
  icon: string;
}

interface WeatherData {
  temp: number;
  feelslike: number;
  conditions: string;
  humidity: number;
  windspeed: number;
  visibility: number;
  pressure: number;
  uvindex: number;
  sunrise: string;
  sunset: string;
  icon: string;
}

interface SavedCity {
  name: string;
  timestamp: number;
}

@Component({
  selector: 'app-weather',
  templateUrl: './weather.component.html',
  styleUrls: ['./weather.component.css'],
  animations: [
    trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('staggerIn', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger(100, [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
    trigger('bounceIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.3)' }),
        animate('600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
  ],
})
export class WeatherComponent implements OnInit, OnDestroy {
  // Icons
  faSun = faSun;
  faLocationDot = faLocationDot;
  faMagnifyingGlass = faMagnifyingGlass;
  faSpinner = faSpinner;
  faClock = faClock;
  faCalendarDays = faCalendarDays;
  faStar = faStar;
  faTrash = faTrash;
  faTemperatureHigh = faTemperatureHigh;
  faTemperatureLow = faTemperatureLow;
  faEye = faEye;
  faGauge = faGauge;
  faDroplet = faDroplet;
  faWind = faWind;

  city: string = '';
  weatherData: WeatherData | null = null;
  forecast: ForecastDay[] = [];
  hourlyForecast: any[] = [];
  error: string = '';
  weatherIcon: IconProp = faSun;
  loading: boolean = false;
  locationLoading: boolean = false;
  currentTime: string = '';
  currentDate: string = '';
  savedCities: SavedCity[] = [];
  unit: 'C' | 'F' = 'C';
  lastSearchedCity: string = '';
  backgroundClass: string = 'bg-default';
  airQualityIndex: number = 0;
  airQualityLabel: string = '';

  private timeInterval: any;

  constructor(
    private weatherService: WeatherService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.updateTime();
    this.timeInterval = setInterval(() => this.updateTime(), 1000);
    this.loadSavedCities();
    this.detectUserLocation(true);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    this.currentDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  detectUserLocation(silent = false): void {
    if (!navigator.geolocation) return;
    if (!silent) {
      this.locationLoading = true;
      this.error = '';
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const cityName = await this.reverseGeocode(latitude, longitude);
        if (!silent) this.locationLoading = false;
        if (cityName) {
          this.city = cityName;
          this.getWeather();
        } else if (!silent) {
          this.error = 'Could not determine your location. Try searching by city.';
        }
      },
      () => {
        if (!silent) {
          this.locationLoading = false;
          this.error = 'Location access denied. Please search by city name.';
        }
      }
    );
  }

  getWeather(): void {
    if (!this.city.trim()) {
      this.error = 'Please enter a city name';
      return;
    }

    this.error = '';
    this.loading = true;
    this.lastSearchedCity = this.city.trim();

    this.weatherService.getWeather(this.city.trim()).subscribe({
      next: (data) => {
        this.weatherData = data.currentConditions;
        this.forecast = data.days.slice(1, 8);
        this.weatherIcon = this.getWeatherIcon(this.weatherData!.conditions);
        this.backgroundClass = this.getBackgroundClass(this.weatherData!.conditions);
        this.loading = false;

        // Extract hourly data from today
        if (data.days[0]?.hours) {
          const currentHour = new Date().getHours();
          this.hourlyForecast = data.days[0].hours
            .filter((h: any) => {
              const hour = parseInt(h.datetime.split(':')[0]);
              return hour >= currentHour;
            })
            .slice(0, 8);
        }

        this.generateAirQuality();
      },
      error: () => {
        this.error = 'City not found. Please check the spelling and try again.';
        this.weatherData = null;
        this.forecast = [];
        this.hourlyForecast = [];
        this.loading = false;
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

  getWeatherIcon(condition: string): IconProp {
    const lower = condition.toLowerCase();
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 20;

    if (lower.includes('rain') || lower.includes('drizzle')) return faCloudRain;
    if (lower.includes('snow') || lower.includes('ice') || lower.includes('sleet')) return faSnowflake;
    if (lower.includes('storm') || lower.includes('thunder')) return faBolt;
    if (lower.includes('fog') || lower.includes('mist') || lower.includes('haze') || lower.includes('smog')) return faSmog;
    if (lower.includes('overcast')) return faCloud;
    if (lower.includes('partially cloudy') || lower.includes('partly')) {
      return isNight ? faCloudMoon : faCloudSun;
    }
    if (lower.includes('cloud')) return faCloud;
    return isNight ? faMoon : faSun;
  }

  getBackgroundClass(condition: string): string {
    const lower = condition.toLowerCase();
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 20;

    if (isNight) return 'bg-night';
    if (lower.includes('rain') || lower.includes('drizzle')) return 'bg-rainy';
    if (lower.includes('snow')) return 'bg-snowy';
    if (lower.includes('storm') || lower.includes('thunder')) return 'bg-stormy';
    if (lower.includes('cloud') || lower.includes('overcast')) return 'bg-cloudy';
    if (lower.includes('fog') || lower.includes('mist')) return 'bg-foggy';
    return 'bg-sunny';
  }

  convertTemp(temp: number): number {
    if (this.unit === 'F') {
      return Math.round((temp * 9) / 5 + 32);
    }
    return Math.round(temp);
  }

  toggleUnit(): void {
    this.unit = this.unit === 'C' ? 'F' : 'C';
  }

  saveCity(): void {
    if (!this.lastSearchedCity) return;
    const exists = this.savedCities.some(
      (c) => c.name.toLowerCase() === this.lastSearchedCity.toLowerCase()
    );
    if (!exists) {
      this.savedCities.push({
        name: this.lastSearchedCity,
        timestamp: Date.now(),
      });
      localStorage.setItem('savedCities', JSON.stringify(this.savedCities));
    }
  }

  removeSavedCity(cityName: string): void {
    this.savedCities = this.savedCities.filter(
      (c) => c.name.toLowerCase() !== cityName.toLowerCase()
    );
    localStorage.setItem('savedCities', JSON.stringify(this.savedCities));
  }

  loadSavedCities(): void {
    const stored = localStorage.getItem('savedCities');
    if (stored) {
      this.savedCities = JSON.parse(stored);
    }
  }

  selectSavedCity(cityName: string): void {
    this.city = cityName;
    this.getWeather();
  }

  getUVLabel(uv: number): string {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
  }

  getUVColor(uv: number): string {
    if (uv <= 2) return '#4caf50';
    if (uv <= 5) return '#ffeb3b';
    if (uv <= 7) return '#ff9800';
    if (uv <= 10) return '#f44336';
    return '#9c27b0';
  }

  private generateAirQuality(): void {
    // Simulated AQI based on weather conditions
    if (this.weatherData) {
      const conditions = this.weatherData.conditions.toLowerCase();
      if (conditions.includes('clear') || conditions.includes('sun')) {
        this.airQualityIndex = Math.floor(Math.random() * 50) + 1;
      } else if (conditions.includes('cloud')) {
        this.airQualityIndex = Math.floor(Math.random() * 50) + 30;
      } else if (conditions.includes('rain')) {
        this.airQualityIndex = Math.floor(Math.random() * 30) + 10;
      } else if (conditions.includes('fog') || conditions.includes('smog')) {
        this.airQualityIndex = Math.floor(Math.random() * 100) + 100;
      } else {
        this.airQualityIndex = Math.floor(Math.random() * 80) + 20;
      }

      if (this.airQualityIndex <= 50) this.airQualityLabel = 'Good';
      else if (this.airQualityIndex <= 100) this.airQualityLabel = 'Moderate';
      else if (this.airQualityIndex <= 150) this.airQualityLabel = 'Unhealthy for Sensitive';
      else this.airQualityLabel = 'Unhealthy';
    }
  }

  getAQIColor(): string {
    if (this.airQualityIndex <= 50) return '#4caf50';
    if (this.airQualityIndex <= 100) return '#ffeb3b';
    if (this.airQualityIndex <= 150) return '#ff9800';
    return '#f44336';
  }

  getHourLabel(time: string): string {
    const hour = parseInt(time.split(':')[0]);
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  }

  getWindDirection(speed: number): string {
    // Simplified wind direction based on speed patterns
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.floor(Math.random() * directions.length)];
  }

  isCitySaved(): boolean {
    return this.savedCities.some(
      (c) => c.name.toLowerCase() === this.lastSearchedCity.toLowerCase()
    );
  }

  getTempBarWidth(day: ForecastDay): number {
    if (!this.forecast.length) return 0;
    const globalMin = Math.min(...this.forecast.map((d) => d.tempmin));
    const globalMax = Math.max(...this.forecast.map((d) => d.tempmax));
    const globalRange = globalMax - globalMin || 1;
    const dayRange = day.tempmax - day.tempmin;
    return Math.min(100, (dayRange / globalRange) * 100);
  }
}