export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  age: number;
  city: string;
  hobbies: string;
  whyPerfectCandidate: string;
  profileImage?: string;
  submissionDate: Date;
  lastEditDate?: Date;
  canEdit: boolean; // Based on 3-day rule
}

export interface CandidateFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  age: number;
  city: string;
  hobbies: string;
  whyPerfectCandidate: string;
  profileImage?: File;
}

export interface DashboardStats {
  totalCandidates: number;
  totalVisits: number;
  registrationRate: number;
   ageBreakdown:any[];
}


export interface VisitStats {
  totalVisits: number;
  registrations: number;
}