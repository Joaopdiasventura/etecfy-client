import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'slider',
  imports: [],
  templateUrl: './slider.html',
  styleUrl: './slider.scss',
})
export class Slider {
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() value = 0;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<number>();

  public get progress(): number {
    if (this.max <= this.min) return 0;
    const clamped = Math.max(this.min, Math.min(this.value, this.max));
    return ((clamped - this.min) / (this.max - this.min)) * 100;
  }

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(Number(target.value));
  }
}
