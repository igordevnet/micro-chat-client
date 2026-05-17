import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  brandName = 'Igor Souza de Almeida';
  email = 'igorsouzaalmeida2404@gmail.com';
  linkedinUrl = 'https://www.linkedin.com/in/igor-souza-de-almeida-1857b02b8/?locale=en';
}