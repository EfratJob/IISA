import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { City } from '../models/city';

@Injectable({
  providedIn: 'root'
})
export class CityService {

 constructor(private http: HttpClient) {}

   getCities(): Observable<City[]> {
    return this.http.get<any[]>('assets/cities.json').pipe(
      map(cities => cities.map(c => ({
        name: c.english_name.trim(),
        long: c.long,
        latt: c.latt
       
      })))
    );
  }
  
}
