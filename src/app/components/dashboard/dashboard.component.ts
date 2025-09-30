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
  interestChart: Chart | null = null;
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
      this.updateInterestChartFromCandidates();
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

      const matchesCity = !cityFilter || candidate.city === cityFilter;

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
    if (this.interestChart) {
      this.interestChart.destroy();
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

  private updateInterestChartFromCandidates() {
    const candidates = this.dataService.candidatesList();
    const distribution = this.computeInterestDistribution(candidates);

    const ctx = document.getElementById('interestChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.interestChart) {
      this.interestChart.destroy();
    }

    this.interestChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Not interested (0–20)', 'Low interest (21–50)', 'High interest (51–70)', 'Super interested (71–100)'],
        datasets: [{
          data: [distribution.notInterestedPct, distribution.lowInterestPct, distribution.highInterestPct, distribution.superInterestedPct],
          backgroundColor: ['#9e9e9e', '#ffb74d', '#42a5f5', '#66bb6a'],
          borderColor: '#0d1b2a',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#ffffff' } },
          tooltip: {
            callbacks: {
              label: (ctx: any) => `${ctx.label}: ${ctx.raw}%`
            }
          }
        }
      }
    });
  }

  private computeInterestDistribution(candidates: any[]) {
    const caps = { hobbies: 20, reasons: 50 };
    const weights = { hobbies: 0.3, reasons: 0.7 };

    const tokenize = (text: string | undefined): string[] =>
      (text || '')
        .toLowerCase()
        .split(/[^a-zA-Z\u0590-\u05FF0-9]+/)
        .filter(w => w.length >= 3);

    let notInterested = 0, lowInterest = 0, highInterest = 0, superInterested = 0;

    for (const c of candidates) {
      const hobbiesWords = tokenize(c.hobbies);
      const reasonsWords = tokenize(c.whyPerfectCandidate);

      const hobbiesScore = Math.min(1, hobbiesWords.length / caps.hobbies) * 100;
      const reasonsScore = Math.min(1, reasonsWords.length / caps.reasons) * 100;

      const totalScore = Math.round(hobbiesScore * weights.hobbies + reasonsScore * weights.reasons);

      if (totalScore <= 20) notInterested++;
      else if (totalScore <= 50) lowInterest++;
      else if (totalScore <= 70) highInterest++;
      else superInterested++;
    }

    const total = candidates.length || 1;

    return {
      notInterestedPct: +((notInterested / total) * 100).toFixed(1),
      lowInterestPct: +((lowInterest / total) * 100).toFixed(1),
      highInterestPct: +((highInterest / total) * 100).toFixed(1),
      superInterestedPct: +((superInterested / total) * 100).toFixed(1)
    };
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
