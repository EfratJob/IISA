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
  imports: [   CommonModule,
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
 private candidateIdSignal = signal<string>('');
  readonly candidateId = this.candidateIdSignal.asReadonly();
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService
  ) {}
  readonly candidate = computed(() => {
    const id = this.candidateId();
    return id ? this.dataService.getCandidateById(id) : undefined;
  });

  allCandidates!: typeof this.dataService.candidatesList;
  
  readonly currentCandidateIndex = computed(() => {
    const candidates = this.allCandidates();
    const candidate = this.candidate();
    return candidate ? candidates.findIndex(c => c.id === candidate.id) : -1;
  });

  readonly totalCandidates = computed(() => this.allCandidates().length);

  readonly hasPreviousCandidate = computed(() => this.currentCandidateIndex() > 0);
  
  readonly hasNextCandidate = computed(() => 
    this.currentCandidateIndex() < this.totalCandidates() - 1 && this.currentCandidateIndex() >= 0
  );



  ngOnInit(): void {
    this.allCandidates = this.dataService.candidatesList;
    this.route.params.subscribe(params => {
      this.candidateIdSignal.set(params['id']);
    });
  }

  navigateToPrevious(): void {
    const currentIndex = this.currentCandidateIndex();
    if (currentIndex > 0) {
      const previousCandidate = this.allCandidates()[currentIndex - 1];
      this.router.navigate(['/candidate', previousCandidate.id]);
    }
  }

  navigateToNext(): void {
    const currentIndex = this.currentCandidateIndex();
    const totalCandidates = this.totalCandidates();
    if (currentIndex >= 0 && currentIndex < totalCandidates - 1) {
      const nextCandidate = this.allCandidates()[currentIndex + 1];
      this.router.navigate(['/candidate', nextCandidate.id]);
    }
  };
  

  printCandidate(): void {
    window.print();
  }
}
