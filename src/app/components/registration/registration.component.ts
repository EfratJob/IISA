import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../dialog/dialog.component';
import { City } from '../../models/city';
import { CityService } from '../../services/city.service';
import { debounceTime, map, startWith } from 'rxjs';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

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
    MatStepperModule,
    RouterModule,
      MatSelectModule,
    MatIconModule,
    MatAutocompleteModule,
  ], templateUrl: './registration.component.html',
  styleUrl: './registration.component.css',
  standalone: true,
})
export class RegistrationComponent {
  registrationForm!: FormGroup;

  isLoading = signal(false);
  isEditMode = signal(false);
  selectedImagePreview = signal<string | null>(null);
  candidateId = signal<string | null>(null);
  private selectedImage = signal<File | null>(null);
  private editingCandidateSignal = signal<Candidate | null>(null);

  allCities = signal<City[]>([]);
  filteredCities = signal<City[]>([]);

  private cityNameSet: Set<string> = new Set<string>();


  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private dataService: DataService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
    private citiesService: CityService) {

  }


  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.candidateId.set(params['id']);
    });
    this.initializeForm();
    this.checkForExistingCandidate();

      this.citiesService.getCities().subscribe(cities => {
      this.allCities.set(cities);
      this.filteredCities.set(cities);
      this.cityNameSet = new Set(cities.map(c => c.name.toLowerCase()));
      const cityCtrl = this.registrationForm.get('city');
      cityCtrl?.addValidators(this.cityInListValidator);
      cityCtrl?.updateValueAndValidity({ emitEvent: false });
    });

    // סינון בזמן אמת
     this.registrationForm.get('city')?.valueChanges
      .pipe(
        startWith(''),
        debounceTime(200),
        map(value => this.filterCities(value))
      )
      .subscribe(filtered => this.filteredCities.set(filtered));
  }

  private filterCities(value: string): City[] {
    const filterValue = value?.toLowerCase() || '';
    return this.allCities().filter(city =>
      city.name.toLowerCase().includes(filterValue)
    );
  }

  private initializeForm(): void {
    this.registrationForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9\-\+\s\(\)]+$/)]],
      age: ['', [Validators.required, Validators.min(18), Validators.max(80)]],
      city: ['', [Validators.required]],
      hobbies: ['', [Validators.required]],
      whyPerfectCandidate: ['', [Validators.required, Validators.minLength(20)]]
    });
  }

  private checkForExistingCandidate(): void {
    const existingCandidate = this.dataService.getCurrentUserCandidate(this.candidateId());
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
      this.snackBar.open('Only JPEG or PNG files allowed', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('File size must be less than 5MB', 'Close', {
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

  deleteCandidate() {
    const dialogRef = this.dialog.open(DialogComponent, {
      width: '350px',
      data: { message: 'Are you sure you want to delete?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dataService.removeCurrentUserCandidate(this.candidateId());
        this.snackBar.open('Candidate successfully deleted', 'Close', {
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
    if (!this.registrationForm.valid) {
      if (this.registrationForm.get('city')?.hasError('cityNotInList')) {
        this.snackBar.open('Please select a city from the list', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      }
      return;
    }

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
              this.snackBar.open('Details updated successfully!', 'Close', {
                duration: 3000,
                horizontalPosition: 'center',
                verticalPosition: 'top'
              });
              this.persistCityForMap();
              this.router.navigate(['/register-success']);

            } else {
              throw new Error('The details cannot be updated');
            }

          });

        }
      } else {
        this.dataService.addCandidate(formData).subscribe(success => {
          if (success) {
            this.snackBar.open('Registration successful!', 'Close', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            });
            this.persistCityForMap();
            this.router.navigate(['/register-success']);
            this.resetForm();
          } else {
            throw new Error('Cannot add candidate');
          }
        })
      }
    } catch (error) {
      this.snackBar.open('Error saving data. Try again.', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
      console.error('Error submitting form:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  cancel(): void {
    this.resetForm();
    this.router.navigate(['/']);
  }

  resetForm(): void {
    this.registrationForm.reset();
    this.selectedImage.set(null);
    this.selectedImagePreview.set(null);
    this.isEditMode.set(false);
    this.editingCandidateSignal.set(null);
    this.isLoading.set(false);
  }

  private persistCityForMap(): void {
    const cityName: string = this.registrationForm.get('city')?.value;
    if (!cityName) return;
    const found = this.allCities().find(c => c.name.toLowerCase() === cityName.toLowerCase());
    if (!found) return;
    const registrations: City[] = JSON.parse(localStorage.getItem('registrations') || '[]');
    const exists = registrations.some(c => c.name.toLowerCase() === found.name.toLowerCase());
    if (!exists) {
      registrations.push({ name: found.name, latt: found.latt, long: found.long });
      localStorage.setItem('registrations', JSON.stringify(registrations));
    }
  }

  private cityInListValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    const isValid = this.cityNameSet.has(String(value).toLowerCase());
    return isValid ? null : { cityNotInList: true };
  }

  capitalize(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
