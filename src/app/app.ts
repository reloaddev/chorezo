import { Component, Signal, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Task } from './task/task';
import { toSignal } from '@angular/core/rxjs-interop';
import { TasksService, TaskDoc } from '../services/tasks.service';
import { Auth, authState, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { of, switchMap } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, Task],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly auth = inject<Auth>(Auth);
  private readonly tasksService = inject(TasksService);

  protected readonly user = toSignal<User | null | undefined>(authState(this.auth));
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly authError = signal<string | null>(null);

  protected readonly tasks: Signal<TaskDoc[] | undefined>;

  constructor() {
    const tasks$ = authState(this.auth).pipe(
      switchMap((u) => (u ? this.tasksService.openWithLastDoneByType$() : of([] as TaskDoc[])))
    );
    this.tasks = toSignal<TaskDoc[]>(tasks$);
  }

  async login(event?: Event) {
    event?.preventDefault();
    this.authError.set(null);
    try {
      await signInWithEmailAndPassword(this.auth, this.email(), this.password());
      this.password.set('');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Login failed';
      this.authError.set(message);
    }
  }

  async logout() {
    await signOut(this.auth);
  }
}
