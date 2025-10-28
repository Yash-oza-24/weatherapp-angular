import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  constructor(private http: HttpClient) {}

  getWeather(location: string): Observable<any> {
    const url = `${environment.weatherApiUrl}${encodeURIComponent(
      location
    )}?unitGroup=metric&key=${environment.weatherApiKey}&contentType=json`;
    return this.http.get(url);
  } 
}
