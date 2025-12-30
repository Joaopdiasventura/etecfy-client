import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'slider',
  imports: [],
  templateUrl: './slider.html',
  styleUrl: './slider.scss',
})
export class Slider {
  @Input({ required: false }) public min = 0;
  @Input({ required: false }) public max = 100;
  @Input({ required: false }) public step = 1;
  @Input({ required: false }) public value = 0;
  @Input({ required: false }) public disabled = false;
  @Output() public valueChange = new EventEmitter<number>();

  public get progress(): number {
    if (this.max <= this.min) return 0;
    const clamped = Math.max(this.min, Math.min(this.value, this.max));
    return ((clamped - this.min) / (this.max - this.min)) * 100;
  }

  public onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(Number(target.value));
  }
}
