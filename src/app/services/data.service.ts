import { computed, Injectable, signal } from '@angular/core';
import { BehaviorSubject, from, map, Observable, of } from 'rxjs';
import { Candidate, CandidateFormData, VisitStats } from '../models/candidate';

@Injectable({
  providedIn: 'root'
})

export class DataService {
  private readonly STORAGE_KEY = 'iisa_candidates';
  private readonly VISITS_KEY = 'iisa_visits';
  private readonly CURRENT_USER_KEY = 'iisa_current_user';

  private candidatesSignal = signal<Candidate[]>([]);
  private visitStatsSignal = signal<VisitStats>({ totalVisits: 0, registrations: 0, lastVisit: new Date() });

  readonly candidates = this.candidatesSignal.asReadonly();
  readonly visitStats = this.visitStatsSignal.asReadonly();

 
  private candidatesSubject = new BehaviorSubject<Candidate[]>([]);
  public candidates$ = this.candidatesSubject.asObservable();

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

      this.candidatesSignal.set(processedCandidates);
      this.candidatesSubject.next(processedCandidates);

      const visitStats = localStorage.getItem(this.VISITS_KEY);
      if (visitStats) {
        const stats = JSON.parse(visitStats);
        this.visitStatsSignal.set({
          ...stats,
          lastVisit: new Date(stats.lastVisit)
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.candidatesSignal()));
      localStorage.setItem(this.VISITS_KEY, JSON.stringify(this.visitStatsSignal()));
      this.candidatesSubject.next(this.candidatesSignal());
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  private trackVisit(): void {
    const stats = this.visitStatsSignal();
    this.visitStatsSignal.set({
      ...stats,
      totalVisits: stats.totalVisits + 1,
      lastVisit: new Date()
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

        const currentCandidates = this.candidatesSignal();
        this.candidatesSignal.set([...currentCandidates, candidate]);
        
        const stats = this.visitStatsSignal();
        this.visitStatsSignal.set({
          ...stats,
          registrations: stats.registrations + 1
        });

        localStorage.setItem(this.CURRENT_USER_KEY, id);
        
        this.saveData();
        return id;
      })
    );
  }

updateCandidate(id: string, formData: CandidateFormData): Observable<boolean> {
  const candidates = this.candidatesSignal();
  const candidateIndex = candidates.findIndex(c => c.id === id);

  if (candidateIndex === -1) return of(false);

  const candidate = candidates[candidateIndex];
  if (!this.canEditCandidate(candidate.submissionDate)) return of(false);

  let profileImage$: Observable<string | undefined>;
  if (formData.profileImage) {
    profileImage$ = from(this.fileToBase64(formData.profileImage));
  } else {
    profileImage$ = of(candidate.profileImage);
  }

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
      this.candidatesSignal.set(updatedCandidates);
      this.saveData();
      return true;
    })
  );
}

  getCurrentUserCandidate(): Candidate | null {
    const currentUserId = localStorage.getItem(this.CURRENT_USER_KEY);
    if (!currentUserId) return null;

    return this.candidatesSignal().find(c => c.id === currentUserId) || null;
  }

  getCandidateById(id: string): Candidate | undefined {
    return this.candidatesSignal().find(c => c.id === id);
  }

  searchCandidates(searchTerm: string, cityFilter?: string, ageRange?: [number, number]): Candidate[] {
    const candidates = this.candidatesSignal();
    
    return candidates.filter(candidate => {
      const matchesSearch = !searchTerm || 
        candidate.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCity = !cityFilter || candidate.city === cityFilter;
      
      const matchesAge = !ageRange || 
        (candidate.age >= ageRange[0] && candidate.age <= ageRange[1]);

      return matchesSearch && matchesCity && matchesAge;
    });
  }

  private canEditCandidate(submissionDate: Date): boolean {
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return (Date.now() - submissionDate.getTime()) < threeDaysMs;
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

  private setupLiveUpdates(): void {
    setInterval(() => {
      this.loadData();
    }, 5000);
  }}
