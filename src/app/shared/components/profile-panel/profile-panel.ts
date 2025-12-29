import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { validateName, validateEmail } from '../../utils/validators';
import { User } from '../../../core/models/user';
import { UserService } from '../../../core/services/user/user.service';
import { Router } from '@angular/router';
import { CustomButton } from '../custom-button/custom-button';
import { CustomInput } from '../custom-input/custom-input';
import { CustomAlert } from '../custom-alert/custom-alert';
import { form } from '@angular/forms/signals';
import { CreateUserDto } from '../../dto/user/create-user.dto';
import { UpdateUserDto } from '../../dto/user/update-user.dto';

@Component({
  selector: 'profile-panel',
  imports: [CustomButton, CustomInput, CustomAlert],
  templateUrl: './profile-panel.html',
  styleUrl: './profile-panel.scss',
})
export class ProfilePanel implements OnInit {
  @Input({ required: true }) public currentUser!: User;

  public readonly isLoading = signal(false);

  private readonly isOpenSignal = signal(false);

  @Input() set isOpen(value: boolean) {
    this.isOpenSignal.set(value);
  }

  get isOpen() {
    return this.isOpenSignal();
  }

  @Output() close = new EventEmitter<void>();

  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly showDeleteConfirm = signal(false);

  private readonly updateUserDto = signal<UpdateUserDto>({
    name: '',
    email: '',
    password: '',
  });

  public readonly updateUserDorm = form(this.updateUserDto);

  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    this.updateUserDto.update((prev) => ({ ...prev, ...this.currentUser }));
  }

  public updateProfile(event: Event) {
    event.preventDefault();
    this.error.set(null);
    this.success.set(null);

    const dto = { ...this.updateUserDto() };
    const trimmedPassword = dto.password?.trim();
    if (!trimmedPassword) delete dto.password;
    else dto.password = trimmedPassword;

    if (!validateName(dto.name!)) return this.error.set('Nome deve ter pelo menos 2 caracteres');

    if (!validateEmail(dto.email!)) return this.error.set('E-mail inválido');

    if (dto.password) {
      const message = this.getStrongPasswordErrorMessage(dto.password);
      if (message) this.error.set(message);
    }

    this.isLoading.set(true);

    this.userService.update(dto).subscribe({
      next: () => {
        this.updateUserDto.update((value) => ({ ...value, password: '' }));
        this.success.set('Conta atualizada com sucesso!');
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Erro ao atualizar conta');
        this.isLoading.set(false);
      },
    });
  }

  confirmDelete() {
    this.userService.delete().subscribe({
      next: () => this.router.navigateByUrl('/user/access'),
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Erro ao excluir conta');
        this.isLoading.set(false);
      },
    });
  }

  logout() {
    this.router.navigateByUrl('/user/access');
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
