import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { Candidate, CandidateFormData } from '../../models/candidate';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-registration',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatStepperModule
  ], templateUrl: './registration.component.html',
  styleUrl: './registration.component.css'
})
export class RegistrationComponent {
  registrationForm!: FormGroup;

  private selectedImageSignal = signal<File | null>(null);
  private selectedImagePreviewSignal = signal<string | null>(null);
  private isLoadingSignal = signal(false);
  private isEditModeSignal = signal(false);
  private editingCandidateSignal = signal<Candidate | null>(null);

  readonly selectedImagePreview = this.selectedImagePreviewSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly isEditMode = this.isEditModeSignal.asReadonly();

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.checkForExistingCandidate();
  }

  private initializeForm(): void {
    this.registrationForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9\-\+\s\(\)]+$/)]],
      age: ['', [Validators.required, Validators.min(18), Validators.max(80)]],
      city: ['', [Validators.required]],
      hobbies: ['', [Validators.required]],
      whyPerfectCandidate: ['', [Validators.required, Validators.minLength(50)]]
    });
  }

  private checkForExistingCandidate(): void {
    const existingCandidate = this.dataService.getCurrentUserCandidate();
    if (existingCandidate && existingCandidate.canEdit) {
      this.loadCandidateForEdit(existingCandidate);
    }
  }

  private loadCandidateForEdit(candidate: Candidate): void {
    this.isEditModeSignal.set(true);
    this.editingCandidateSignal.set(candidate);

    this.registrationForm.patchValue({
      fullName: candidate.fullName,
      email: candidate.email,
      phoneNumber: candidate.phoneNumber,
      age: candidate.age,
      city: candidate.city,
      hobbies: candidate.hobbies,
      whyPerfectCandidate: candidate.whyPerfectCandidate
    });

    if (candidate.profileImage) {
      this.selectedImagePreviewSignal.set(candidate.profileImage);
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|png)/)) {
      this.snackBar.open('רק קבצי JPEG או PNG מותרים', 'סגור', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('גודל הקובץ חייב להיות קטן מ-5MB', 'סגור', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
      return;
    }

    this.selectedImageSignal.set(file);

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImagePreviewSignal.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.selectedImageSignal.set(null);
    this.selectedImagePreviewSignal.set(null);
  }

  async onSubmit(): Promise<void> {
    if (!this.registrationForm.valid) return;

    this.isLoadingSignal.set(true);

    try {
      const formData: CandidateFormData = {
        ...this.registrationForm.value,
        profileImage: this.selectedImageSignal()
      };

      if (this.isEditMode()) {
        const candidate = this.editingCandidateSignal();
        if (candidate) {
          this.dataService.updateCandidate(candidate.id, formData).subscribe(success => {
            if (success) {
              this.snackBar.open('הפרטים עודכנו בהצלחה!', 'סגור', {
                duration: 3000,
                horizontalPosition: 'center',
                verticalPosition: 'top'
              });
            } else {
              throw new Error('לא ניתן לעדכן את הפרטים');
            }

          });

        }
      } else {
         this.dataService.addCandidate(formData).subscribe(success => {
          if (success) {
            this.snackBar.open('ההרשמה בוצעה בהצלחה!', 'סגור', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            });
            this.resetForm();
          } else {
            throw new Error('לא ניתן להוסיף את המועמד');
          }
         })
      }
    } catch (error) {
      this.snackBar.open('שגיאה בשמירת הנתונים. נסה שוב.', 'סגור', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
      console.error('Error submitting form:', error);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  cancelEdit(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.registrationForm.reset();
    this.selectedImageSignal.set(null);
    this.selectedImagePreviewSignal.set(null);
    this.isEditModeSignal.set(false);
    this.editingCandidateSignal.set(null);
    this.isLoadingSignal.set(false);
  }
}
