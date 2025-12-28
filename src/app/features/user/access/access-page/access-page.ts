import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  Field,
  type FieldState,
  type FieldTree,
  type ValidationError,
  disabled,
  customError,
  email,
  form,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { LoginUserDto } from '../../../../shared/dto/user/login-user.dto';
import { CreateUserDto } from '../../../../shared/dto/user/create-user.dto';
import { UserService } from '../../../../core/services/user/user.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { User } from '../../../../core/models/user';

type AuthTab = 'login' | 'signup';

@Component({
  selector: 'app-access-page',
  imports: [Field],
  templateUrl: './access-page.html',
  styleUrl: './access-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessPage implements OnInit {
  public readonly activeTab = signal<AuthTab>('login');
  public readonly isLoading = signal(false);
  public readonly errorMessage = signal<string | null>(null);

  public readonly loginUserDto = signal<LoginUserDto>({
    email: '',
    password: '',
  });

  public readonly createUserDto = signal<CreateUserDto>({
    email: '',
    name: '',
    password: '',
  });

  public readonly loginUserForm = form(this.loginUserDto, (s) => {
    required(s.email, { message: 'E-mail e obrigatorio' });
    email(s.email, { message: 'E-mail invalido' });
    disabled(s.email, () => this.isLoading());

    required(s.password, { message: 'Senha e obrigatoria' });
    disabled(s.password, () => this.isLoading());
    validate(s.password, ({ value }) => {
      const message = this.getStrongPasswordErrorMessage(value());
      return message ? customError({ kind: 'strong-password', message }) : undefined;
    });
  });

  public readonly createUserForm = form(this.createUserDto, (s) => {
    required(s.name, { message: 'Nome e obrigatorio' });
    minLength(s.name, 2, { message: 'Nome deve ter no minimo 2 caracteres' });
    disabled(s.name, () => this.isLoading());

    required(s.email, { message: 'E-mail e obrigatorio' });
    email(s.email, { message: 'E-mail invalido' });
    disabled(s.email, () => this.isLoading());

    required(s.password, { message: 'Senha e obrigatoria' });
    disabled(s.password, () => this.isLoading());
    validate(s.password, ({ value }) => {
      const message = this.getStrongPasswordErrorMessage(value());
      return message ? customError({ kind: 'strong-password', message }) : undefined;
    });
  });

  public readonly canSubmitLogin = computed(
    () => !this.isLoading() && this.loginUserForm().valid()
  );
  public readonly canSubmitSignup = computed(
    () => !this.isLoading() && this.createUserForm().valid()
  );

  public readonly showLoginPassword = signal(false);
  public readonly showSignupPassword = signal(false);

  public readonly mobileTitle = computed(() =>
    this.activeTab() == 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'
  );

  public readonly mobileSubtitle = computed(() =>
    this.activeTab() == 'login' ? 'Entre para continuar' : 'Comece sua jornada'
  );

  public readonly desktopTitle = computed(() =>
    this.activeTab() == 'login' ? 'Entrar na sua conta' : 'Criar nova conta'
  );

  public readonly desktopSubtitle = computed(() =>
    this.activeTab() == 'login'
      ? 'Digite suas credenciais para acessar'
      : 'Preencha os dados abaixo para comecar'
  );

  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    this.userService.logout().subscribe();
  }

  public setActiveTab(tab: AuthTab): void {
    if (this.activeTab() == tab) return;
    this.activeTab.set(tab);
    this.errorMessage.set(null);
  }

  public toggleLoginPassword(): void {
    this.showLoginPassword.update((value) => !value);
  }

  public toggleSignupPassword(): void {
    this.showSignupPassword.update((value) => !value);
  }

  public onSubmit(event: Event, isLogin: boolean): void {
    event.preventDefault();
    this.errorMessage.set(null);

    this.isLoading.set(true);
    const $action = isLogin ? this.login() : this.create();
    $action.subscribe({
      next: (result) => {
        this.isLoading.set(false);
        this.authService.updateUserData(result);
        this.router.navigate(['/']);
      },
      error: ({ error }) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message);
      },
    });
  }

  public getFieldErrors(
    field: FieldTree<string>,
    submitted: boolean
  ): readonly ValidationError.WithField[] {
    const state = field() as FieldState<string>;
    const errors = state.errors();
    if (!errors.length) return [];
    const touched = state.touched?.() ?? false;
    if (!submitted && !touched) return [];
    return errors;
  }

  public hasVisibleErrors(field: FieldTree<string>, submitted: boolean): boolean {
    return this.getFieldErrors(field, submitted).length > 0;
  }

  private create(): Observable<User> {
    return this.userService.create(this.createUserDto());
  }

  private login(): Observable<User> {
    return this.userService.login(this.loginUserDto());
  }

  private getStrongPasswordErrorMessage(value: string): string | null {
    if (!value) return null;
    if (value.length < 8) return 'Senha deve ter no minimo 8 caracteres';
    if (!/[a-z]/.test(value)) return 'Inclua ao menos uma letra minuscula';
    if (!/[A-Z]/.test(value)) return 'Inclua ao menos uma letra maiuscula';
    if (!/\d/.test(value)) return 'Inclua ao menos um numero';
    if (!/[^\da-zA-Z]/.test(value)) return 'Inclua ao menos um simbolo';
    return null;
  }
}
