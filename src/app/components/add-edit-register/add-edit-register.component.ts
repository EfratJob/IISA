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
import { Router, RouterModule } from '@angular/router';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-add-edit-register',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ], templateUrl: './add-edit-register.component.html',
  styleUrl: './add-edit-register.component.css',
    standalone: true,
})
export class AddEditRegisterComponent {
  loginForm!: FormGroup;

  isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dataService: DataService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.loginForm.get('email')?.valueChanges.subscribe(() => {
    });
  }





  onSubmit(): void {
    if (!this.loginForm.valid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading.set(true);

    try {
      const email = this.loginForm.get('email')?.value.trim().toLowerCase();


      const candidate = this.dataService.findCandidateByEmail(email);

      if (!candidate) {
        this.snackBar.open('כתובת המייל לא נמצאה במערכת', 'סגור', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        return;
      }

      if (!candidate.canEdit) {
        this.snackBar.open('לא ניתן לערוך את ההרשמה - עברו יותר מ-3 ימים', 'סגור', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        return;
      }

      this.snackBar.open('מועמד נמצא! מעבר לעריכת פרטים...', 'סגור', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });

      this.dataService.saveId(candidate.id);
        this.router.navigate(['/registration']);

    } catch (error) {
      console.error('Error during login:', error);
      this.snackBar.open('שגיאה במערכת. נסה שוב.', 'סגור', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
}
