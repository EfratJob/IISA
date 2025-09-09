import { Component } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { RouterModule } from '@angular/router';
import { routes } from '../../app.routes';

@Component({
  selector: 'app-register-success',
  imports: [RouterModule],
  templateUrl: './register-success.component.html',
  styleUrl: './register-success.component.css',
  standalone: true,
})
export class RegisterSuccessComponent {

}
