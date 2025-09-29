import { CommonModule } from '@angular/common';
import { Component, computed, effect, ElementRef, Signal, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterModule } from '@angular/router';
import { DataService } from '../../services/data.service';
import { Chart, ChartType, registerables } from 'chart.js';
import { DashboardStats } from '../../models/candidate';
import { City } from '../../models/city';
import { AuthService } from '../../services/auth.service';
/// <reference types="google.maps" />

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatPaginatorModule,
    MatGridListModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  standalone: true,

})
export class DashboardComponent {

  ageChart: Chart | null = null;
  editReturnChart: Chart | null = null;
  minAge = signal<number | null>(null);
  maxAge = signal<number | null>(null);

  dashboardStats: Signal<DashboardStats>;

    map!: google.maps.Map;

  constructor(private dataService: DataService, private auth: AuthService, private router: Router) {
    this.dashboardStats = this.dataService.dashboardStats;

    Chart.register(...registerables);
    effect(() => {
      const distribution = this.dashboardStats().ageBreakdown;
      const labels = distribution.map(d => d.age.toString());
      const data = distribution.map(d => d.count);
      this.updateAgeChart(labels, data);
      this.updateEditedWithin3DaysChart();
    });
  }

  ngOnInit(): void {
  }

  searchTerm = signal<string>('');
  selectedCityFilter = signal<string>('');
  viewMode = signal<'grid' | 'list'>('list');

  filteredCandidates = computed(() => {
    const candidates = this.dataService.candidatesList();
    const search = this.searchTerm().toLowerCase();
    const cityFilter = this.selectedCityFilter();
    const min = this.minAge();
    const max = this.maxAge();
    return candidates.filter(candidate => {

      const matchesSearch =
        !search ||
        candidate.fullName.toLowerCase().includes(search) ||
        candidate.email.toLowerCase().includes(search)

      const matchesCity = !cityFilter || candidate.city.name === cityFilter;

      const matchesMin = !min || candidate.age >= min;
      const matchesMax = !max || candidate.age <= max;

      return matchesSearch && matchesCity && matchesMin && matchesMax;
    });
  });

  setMinAge(age: number | null) {
    this.minAge.set(age);
  }

  setMaxAge(age: number | null) {
    this.maxAge.set(age);
  }

  updateSearchTerm(value: string) {
    this.searchTerm.set(value);
  }

  setCityFilter(city: string) {
    this.selectedCityFilter.set(city);
  }

  readonly availableCities = computed(() => {
    const cities = new Set(this.dataService.candidatesList().map(c => c.city));
    return Array.from(cities).sort();
  });

  ngOnDestroy(): void {
    if (this.ageChart) {
      this.ageChart.destroy();
    }
    if (this.editReturnChart) {
      this.editReturnChart.destroy();
    }
  }

  getCandidateSummary(text: string): string {
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  }

  updateAgeChart(labels: string[], data: number[]) {
    const ctx = document.getElementById('ageChart') as HTMLCanvasElement;

    if (this.ageChart) {
      this.ageChart.destroy();
    }

    this.ageChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Number of candidates by age',
          data,
          backgroundColor: '#42A5F5',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#333',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#ffffff' }, title: { display: true, text: 'age', color: '#ffffff' } },
          y: { beginAtZero: true, ticks: { color: '#ffffff' }, title: { display: true, text: 'number of candidates', color: '#ffffff' } }
        }
      }
    });
  }

  private updateEditedWithin3DaysChart() {
    const candidates = this.dataService.candidatesList();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    let editedWithin3Days = 0;
    for (const c of candidates) {
      if (c.lastEditDate) {
        const diff = new Date(c.lastEditDate).getTime() - new Date(c.submissionDate).getTime();
        if (diff <= THREE_DAYS_MS && diff >= 0) {
          editedWithin3Days++;
        }
      }
    }
    const notEditedWithin3Days = Math.max(0, candidates.length - editedWithin3Days);

    const total = candidates.length || 1;
    const editedPct = +(editedWithin3Days / total * 100).toFixed(1);
    const notEditedPct = +(notEditedWithin3Days / total * 100).toFixed(1);

    const ctx = document.getElementById('editReturnChart') as HTMLCanvasElement;

    if (!ctx) { return; }

    if (this.editReturnChart) {
      this.editReturnChart.destroy();
    }

    this.editReturnChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Edited within 3 days', 'Not edited within 3 days'],
        datasets: [{
          label: 'Percent of candidates',
          data: [editedPct, notEditedPct],
          backgroundColor: ['#4caf50', '#ef5350'],
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#333',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx: any) => `${ctx.raw}%`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#ffffff' } },
          y: { beginAtZero: true, max: 100, ticks: { color: '#ffffff', callback: (v: any) => `${v}%` } }
        }
      }
    });
  }

    ngAfterViewInit() {
    this.map = new google.maps.Map(document.getElementById('map') as HTMLElement, {
      zoom: 7,
      center: { lat: 31.5, lng: 34.9 },
      disableDefaultUI: true,
      zoomControl: true,
      fullscreenControl: true,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1b2a' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#a8dadc' }] },
        {
          featureType: 'administrative.locality',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#89c2d9' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'geometry',
          stylers: [{ color: '#1b263b' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#74c69d' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#1b263b' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#1b263b' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{ color: '#1d3557' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#003049' }]
        }
      ]
    });

    this.loadMarkers();
  }

  loadMarkers() {
    const registrations: City[] = JSON.parse(localStorage.getItem('registrations') || '[]');
    registrations.forEach(city => {
      new google.maps.Marker({
        position: { lat: city.latt, lng: city.long },
        map: this.map,
        title: city.name
      });
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
