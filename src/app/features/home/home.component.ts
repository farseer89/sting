import { Component } from '@angular/core';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Card],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
