import { Component, HostBinding, Input } from '@angular/core';

type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'accent'
  | 'icon';

type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './custom-button.html',
  styleUrl: './custom-button.scss',
})
export class CustomButton {
  @Input({ required: false }) public variant: ButtonVariant = 'default';
  @Input({ required: false }) public size: ButtonSize = 'default';
  @Input({ required: false }) public type: 'button' | 'submit' | 'reset' = 'button';
  @Input({ required: false }) public disabled = false;
  @Input({ required: false }) public loading = false;
  @Input({ required: false }) public className = '';
  @Input({ alias: 'aria-label', required: false }) public ariaLabel: string | null = null;
  @HostBinding('attr.aria-label') public hostAriaLabel: string | null = null;
}
