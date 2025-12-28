import { Component, inject } from '@angular/core';
import { ThemeService } from '../../../core/services/theme/theme.service';
import { CustomButton } from '../custom-button/custom-button';

@Component({
  selector: 'theme-toggle',
  imports: [CustomButton],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle {
  private readonly themeService = inject(ThemeService);

  public get theme(): string {
    return this.themeService.theme();
  }

  public toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
