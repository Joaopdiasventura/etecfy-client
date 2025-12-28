import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateUserDto } from '../../../shared/dto/user/create-user.dto';
import { LoginUserDto } from '../../../shared/dto/user/login-user.dto';
import { User } from '../../models/user';
import { UpdateUserDto } from '../../../shared/dto/user/update-user.dto';
import { MessageResponse } from '../../../shared/interfaces/reponses/message';

declare const API_URL: string;

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = API_URL + '/user';
  private readonly http = inject(HttpClient);

  public create(createUserDto: CreateUserDto): Observable<User> {
    return this.http.post<User>(this.apiUrl, createUserDto);
  }

  public login(loginUserDto: LoginUserDto): Observable<User> {
    return this.http.post<User>(this.apiUrl + '/login', loginUserDto);
  }

  public logout(): Observable<User> {
    return this.http.post<User>(this.apiUrl + '/logout', {});
  }

  public decodeToken(): Observable<User> {
    return this.http.get<User>(this.apiUrl);
  }

  public update(updateUserDto: UpdateUserDto): Observable<MessageResponse> {
    return this.http.patch<MessageResponse>(this.apiUrl, updateUserDto);
  }

  public delete(): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(this.apiUrl);
  }
}
