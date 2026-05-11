import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../layout/header/header';
import { FooterComponent } from '../../layout/footer/footer';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss'
})
export class HomeComponent {
  readonly techStack = [
    { name: 'Spring Boot', icon: '🍃', desc: 'Core Microservices' },
    { name: 'RabbitMQ', icon: '🐇', desc: 'Event Broker' },
    { name: 'PostgreSQL', icon: '🐘', desc: 'Relational Data' },
    { name: 'MongoDB', icon: '🍃', desc: 'Chat History' },
    { name: 'Redis', icon: '⚡', desc: 'Presence & Cache' },
    { name: 'MinIO', icon: '🧊', desc: 'S3 Media Storage' }
  ];

  readonly services = [
    { name: 'Messaging', port: '8082', task: 'WebSockets, WebRTC & Persistence' },
    { name: 'Auth', port: '8081', task: 'JWT Identity & Authorization' },
    { name: 'Notification', port: '8083', task: 'Real-time Event Consumer' },
    { name: 'API Gateway', port: '8080', task: 'Routing & Global Rate Limiting' }
  ];
}