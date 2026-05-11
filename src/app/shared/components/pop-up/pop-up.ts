import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pop-up-component',
  imports: [],
  standalone: true,
  templateUrl: './pop-up.html',
  styleUrl: './pop-up.scss',
})
export class PopUpComponent {
  @Input() title: string = '';
  @Input() message: string = '';
  
  @Output() closed = new EventEmitter<void>();

  close() {
    this.closed.emit();
  }
}