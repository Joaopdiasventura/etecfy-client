import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-input',
  imports: [],
  templateUrl: './custom-input.html',
  styleUrl: './custom-input.scss',
})
export class CustomInput {
  @Input({ required: false }) public id?: string;
  @Input({ required: false }) public type = 'text';
  @Input({ required: false }) public placeholder = '';
  @Input({ required: false }) public value = '';
  @Input({ required: false }) public icon?: string;
  @Input({ required: false }) public iconPosition: 'left' | 'right' = 'left';
  @Input({ required: false }) public error = false;
  @Input({ required: false }) public disabled = false;
  @Input({ required: false }) public autocomplete?: string;
  @Input({ required: false }) public className = '';
  @Output() public valueChange = new EventEmitter<string>();

  public onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}
