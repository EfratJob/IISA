import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-candidate-details',
  standalone: true,
  imports: [CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule],
  templateUrl: './candidate-details.component.html',
  styleUrl: './candidate-details.component.css'
})
export class CandidateDetailsComponent {
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService
  ) { }
  
  candidateId = signal<string>('');
  
   candidate = computed(() => {
    const id = this.candidateId();
    return id ? this.dataService.getCandidateById(id) : undefined;
  });


  readonly currentCandidateIndex = computed(() => {
    const candidates = this.dataService.candidatesList();
    const candidate = this.candidate();
    return candidate ? candidates.findIndex(c => c.id === candidate.id) : -1;
  });

  readonly totalCandidates = computed(() => this.dataService.candidatesList().length);

  readonly hasPreviousCandidate = computed(() => this.currentCandidateIndex() > 0);

  readonly hasNextCandidate = computed(() =>
    this.currentCandidateIndex() < this.totalCandidates() - 1 && this.currentCandidateIndex() >= 0
  );

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.candidateId.set(params['id']);
    });
  }

  navigateToPrevious(): void {
    const currentIndex = this.currentCandidateIndex();
    if (currentIndex > 0) {
      const previousCandidate = this.dataService.candidatesList()[currentIndex - 1];
      this.router.navigate(['/candidate', previousCandidate.id]);
    }
  }

  navigateToNext(): void {
    const currentIndex = this.currentCandidateIndex();
    const totalCandidates = this.totalCandidates();
    if (currentIndex >= 0 && currentIndex < totalCandidates - 1) {
      const nextCandidate = this.dataService.candidatesList()[currentIndex + 1];
      this.router.navigate(['/candidate', nextCandidate.id]);
    }
  };
}
