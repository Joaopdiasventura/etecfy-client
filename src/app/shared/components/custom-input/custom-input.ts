import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-input',
  imports: [],
  templateUrl: './custom-input.html',
  styleUrl: './custom-input.scss',
})
export class CustomInput {
  @Input() public id?: string;
  @Input() public type = 'text';
  @Input() public placeholder = '';
  @Input() public value = '';
  @Input() public icon?: string;
  @Input() public iconPosition: 'left' | 'right' = 'left';
  @Input() public error = false;
  @Input() public disabled = false;
  @Input() public autocomplete?: string;
  @Input() public className = '';
  @Output() public valueChange = new EventEmitter<string>();

  public onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}
