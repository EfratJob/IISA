import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  username = signal('');
  password = signal('');
  error = signal<string | null>(null);
  hide = signal(true);

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute, private snackBar: MatSnackBar) {}

  onSubmit(): void {
    const ok = this.auth.login(this.username(), this.password());
    if (ok) {
      this.error.set(null);
      const redirectUrl = this.route.snapshot.queryParamMap.get('redirectUrl');
      if (redirectUrl) {
        this.router.navigateByUrl(redirectUrl);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } else {
      this.snackBar.open('Invalid username or password', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
    }
  }
}


