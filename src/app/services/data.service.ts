import { computed, Injectable, signal } from '@angular/core';
import { from, map, Observable, of } from 'rxjs';
import { Candidate, VisitStats, DashboardStats, CandidateFormData } from '../models/candidate';

@Injectable({
  providedIn: 'root'
})

export class DataService {
  private readonly STORAGE_KEY = 'iisa_candidates';
  private readonly VISITS_KEY = 'iisa_visits';

  candidatesList = signal<Candidate[]>([]);
  visitStats = signal<VisitStats>({ totalVisits: 0, registrations: 0 });

  readonly dashboardStats = computed((): DashboardStats => {
    const candidates = this.candidatesList();
    const visits = this.visitStats();

    return {
      totalCandidates: candidates.length,
      totalVisits: visits.totalVisits,
      registrationRate: visits.totalVisits > 0 ? (visits.registrations / visits.totalVisits) * 100 : 0,
      ageBreakdown: this.calculateAgeBreakdown(candidates),
    };
  });

  constructor() {
    this.loadData();
    this.trackVisit();
    this.setupLiveUpdates();
  }

  private loadData(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const candidates = stored ? JSON.parse(stored) : [];
      const processedCandidates = candidates.map((c: any) => ({
        ...c,
        submissionDate: new Date(c.submissionDate),
        lastEditDate: c.lastEditDate ? new Date(c.lastEditDate) : undefined,
        canEdit: this.canEditCandidate(new Date(c.submissionDate))
      }));

      this.candidatesList.set(processedCandidates);
      const visitStats = localStorage.getItem(this.VISITS_KEY);
      if (visitStats) {
        const stats = JSON.parse(visitStats);
        this.visitStats.set({
          ...stats,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.candidatesList()));
      localStorage.setItem(this.VISITS_KEY, JSON.stringify(this.visitStats()));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  private trackVisit(): void {
    const stats = this.visitStats();
    this.visitStats.set({
      ...stats,
      totalVisits: stats.totalVisits + 1,
    });
    this.saveData();
  }

  addCandidate(formData: CandidateFormData): Observable<string> {

    const id = this.generateId();

    let profileImage$: Observable<string | undefined>;
    if (formData.profileImage) {
      profileImage$ = from(this.fileToBase64(formData.profileImage));
    } else {
      profileImage$ = of(undefined);
    }

    return profileImage$.pipe(
      map(profileImageBase64 => {
        const candidate: Candidate = {
          id,
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          age: formData.age,
          city: formData.city,
          hobbies: formData.hobbies,
          whyPerfectCandidate: formData.whyPerfectCandidate,
          profileImage: profileImageBase64,
          submissionDate: new Date(),
          canEdit: true
        };

        const currentCandidates = this.candidatesList();
        this.candidatesList.set([...currentCandidates, candidate]);

        const stats = this.visitStats();
        this.visitStats.set({
          ...stats,
          registrations: stats.registrations + 1
        });

        this.saveData();
        return id;
      })
    );
  }

  updateCandidate(id: string, formData: CandidateFormData): Observable<boolean> {

    const candidates = this.candidatesList();
    const candidateIndex = candidates.findIndex(c => c.id === id);

    if (candidateIndex === -1) return of(false);

    const candidate = candidates[candidateIndex];
    if (!this.canEditCandidate(candidate.submissionDate)) return of(false);

    const profileImage$ = formData.profileImage
      ? new Observable<string>(observer => {
        const reader = new FileReader();
        reader.onload = () => {
          observer.next(reader.result as string);
          observer.complete();
        };
        reader.onerror = err => observer.error(err);
        reader.readAsDataURL(formData.profileImage!);
      })
      : of(candidate.profileImage);

    return profileImage$.pipe(
      map(profileImageBase64 => {
        const updatedCandidate: Candidate = {
          ...candidate,
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          age: formData.age,
          city: formData.city,
          hobbies: formData.hobbies,
          whyPerfectCandidate: formData.whyPerfectCandidate,
          profileImage: profileImageBase64,
          lastEditDate: new Date(),
          canEdit: this.canEditCandidate(candidate.submissionDate)
        };

        const updatedCandidates = [...candidates];
        updatedCandidates[candidateIndex] = updatedCandidate;
        this.candidatesList.set(updatedCandidates);
        this.saveData();

        return true;
      })
    );
  }



  removeCurrentUserCandidate(currentUserId: string | null): void {
    if (!currentUserId) return;
    const candidates = this.candidatesList();
    const updatedCandidates = candidates.filter(c => c.id !== currentUserId);
    if (updatedCandidates.length !== candidates.length) {
      this.candidatesList.set(updatedCandidates);
      const stats = this.visitStats();
      this.visitStats.set({
        ...stats,
        registrations: Math.max(0, stats.registrations - 1)
      });
      this.saveData();
    }
  }

  getCurrentUserCandidate(currentUserId: string | null): Candidate | null {
    if (!currentUserId) return null;

    return this.candidatesList().find(c => c.id === currentUserId) || null;
  }

  getCandidateById(id: string): Candidate | undefined {
    return this.candidatesList().find(c => c.id === id);
  }

  private canEditCandidate(submissionDate: Date): boolean {
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    return (Date.now() - submissionDate.getTime()) < threeDays;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  private calculateAgeBreakdown(candidates: Candidate[]) {
    const counts: Record<number, number> = {};

    this.candidatesList().forEach(c => {
      if (c.age != null) {
        counts[c.age] = (counts[c.age] || 0) + 1;
      }
    });

    return Object.keys(counts)
      .map(age => ({ age: +age, count: counts[+age] }))
      .sort((a, b) => a.age - b.age);
  }

  private setupLiveUpdates(): void {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === this.STORAGE_KEY || event.key === this.VISITS_KEY) {
        this.loadData();
      }
    });
  }

  findCandidateByEmail(email: string): Candidate | undefined {
    return this.candidatesList().find(c => c.email.toLowerCase() === email.toLowerCase());
  }
}
