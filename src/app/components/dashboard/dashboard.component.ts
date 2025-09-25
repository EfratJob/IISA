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
import { RouterModule } from '@angular/router';
import { DataService } from '../../services/data.service';
import { Chart, ChartType, registerables } from 'chart.js';
import { DashboardStats } from '../../models/candidate';

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
  minAge = signal<number | null>(null);
  maxAge = signal<number | null>(null);

  dashboardStats: Signal<DashboardStats>;

  constructor(private dataService: DataService) {
    this.dashboardStats = this.dataService.dashboardStats;

    Chart.register(...registerables);
    effect(() => {
      const distribution = this.dashboardStats().ageBreakdown;
      const labels = distribution.map(d => d.age.toString());
      const data = distribution.map(d => d.count);
      this.updateAgeChart(labels, data);
    });
  }

  ngOnInit(): void {
  }

  searchTerm = signal<string>('');
  selectedCityFilter = signal<string>('');

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
}
