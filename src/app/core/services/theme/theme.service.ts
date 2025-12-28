import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, effect, signal } from '@angular/core';

type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly theme = signal<Theme>('light');

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.theme.set(this.getInitialTheme());

    effect(() => {
      const current = this.theme();
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      const root = this.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(current);
      localStorage.setItem('etecfy_theme', current);
    });
  }

  toggleTheme() {
    this.theme.update((prev) => (prev === 'light' ? 'dark' : 'light'));
  }

  setTheme(theme: Theme) {
    this.theme.set(theme);
  }

  private getInitialTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) {
      return 'light';
    }

    const stored = localStorage.getItem('etecfy_theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
