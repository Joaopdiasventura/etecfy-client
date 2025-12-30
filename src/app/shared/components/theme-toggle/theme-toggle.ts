import { Component, inject, PLATFORM_ID, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CustomButton } from '../custom-button/custom-button';

@Component({
  selector: 'theme-toggle',
  imports: [CustomButton],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);

  public theme: 'dark' | 'light' = 'light';

  public ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const storedTheme = localStorage.getItem('theme');

    if (storedTheme == 'dark') this.setDark();
    else if (storedTheme == 'light') this.setLight();
    else
      window.matchMedia('(prefers-color-scheme: dark)').matches ? this.setDark() : this.setLight();
  }

  public toggleTheme(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.theme == 'dark' ? this.setLight() : this.setDark();
  }

  private setDark(): void {
    this.theme = 'dark';
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }

  private setLight(): void {
    this.theme = 'light';
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
}
