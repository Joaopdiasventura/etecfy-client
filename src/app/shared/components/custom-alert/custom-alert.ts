import { Component, EventEmitter, Input, Output } from '@angular/core';

type AlertType = 'error' | 'success' | 'info' | 'warning';

@Component({
  selector: 'custom-alert',
  imports: [],
  templateUrl: './custom-alert.html',
  styleUrl: './custom-alert.scss',
})
export class CustomAlert {
  @Input({ required: false }) public type: AlertType = 'info';
  @Input({ required: false }) public message = '';
  @Input({ required: false }) public className = '';
  @Output() public close = new EventEmitter<void>();

  public get iconName() {
    switch (this.type) {
      case 'error':
        return 'x-circle';
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'alert-circle';
      default:
        return 'info';
    }
  }
}
