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
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../dialog/dialog.component';

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

  isLoading = signal(false);
  isEditMode = signal(false);
  selectedImagePreview = signal<string | null>(null);
  private selectedImage = signal<File | null>(null);
  private editingCandidateSignal = signal<Candidate | null>(null);


  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private snackBar: MatSnackBar,
    private router: Router,
  private dialog: MatDialog) { }


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
      whyPerfectCandidate: ['', [Validators.required, Validators.minLength(20)]]
    });
  }

  private checkForExistingCandidate(): void {
    const existingCandidate = this.dataService.getCurrentUserCandidate();
    if (existingCandidate && existingCandidate.canEdit) {
      this.loadCandidateForEdit(existingCandidate);
    }
  }

  private loadCandidateForEdit(candidate: Candidate): void {
    this.isEditMode.set(true);
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
      this.selectedImagePreview.set(candidate.profileImage);
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

    this.selectedImage.set(file);

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImagePreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.selectedImage.set(null);
    this.selectedImagePreview.set(null);
  }

  deleteItem() {
    const dialogRef = this.dialog.open(DialogComponent, {
      width: '350px',
      data: { message: 'את/ה בטוח/ה שברצונך למחוק?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dataService.removeCurrentUserCandidate();
        this.snackBar.open('המועמד נמחק בהצלחה', 'סגור', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        this.resetForm();
        this.router.navigate(['/']);
      } 
    });
  }

  onSubmit() {
    if (!this.registrationForm.valid) return;

    this.isLoading.set(true);

    try {
      const formData: CandidateFormData = {
        ...this.registrationForm.value,
        profileImage: this.selectedImage()
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
            this.router.navigate(['/register-success']);

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
            this.router.navigate(['/register-success']);
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
      this.isLoading.set(false);
    }
  }

  cancelEdit(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.registrationForm.reset();
    this.selectedImage.set(null);
    this.selectedImagePreview.set(null);
    this.isEditMode.set(false);
    this.editingCandidateSignal.set(null);
    this.isLoading.set(false);
  }
}
