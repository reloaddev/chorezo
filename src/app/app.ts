import { Component, Signal, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Task } from './task/task';
import { toSignal } from '@angular/core/rxjs-interop';
import { TasksService, TaskDoc } from '../services/tasks.service';
import { Auth, authState, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { of, switchMap } from 'rxjs';
import { MessagingService } from '../services/messaging.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, Task],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly auth = inject<Auth>(Auth);
  private readonly tasksService = inject(TasksService);
  private messagingService = inject(MessagingService);

  protected readonly user = toSignal<User | null | undefined>(authState(this.auth));
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly authError = signal<string | null>(null);

  // NEW: Add notification-related signals
  protected readonly isNotificationsEnabled = signal(false);
  protected readonly showInstallPrompt = signal(false);
  protected readonly showNotificationButton = signal(false);

  protected readonly tasks: Signal<TaskDoc[] | undefined>;

  constructor() {
    const tasks$ = authState(this.auth).pipe(
      switchMap((u) => (u ? this.tasksService.openWithLastDoneByType$() : of([] as TaskDoc[])))
    );
    this.tasks = toSignal<TaskDoc[]>(tasks$);

    // Register service worker early
    this.registerServiceWorker();
  }

  ngOnInit() {
    // REMOVED: Automatic permission request
    // this.requestPermission();
    // this.messagingService.receiveMessage();

    // NEW: Check notification status and show button if needed
    this.checkNotificationStatus();
  }

  // NEW: Method to check notification status
  private checkNotificationStatus() {
    if (Notification.permission === 'granted') {
      this.isNotificationsEnabled.set(true);
      this.messagingService.receiveMessage();
    } else if (Notification.permission === 'default') {
      // Check if iOS and not installed
      if (this.isIOS() && !this.isPWAInstalled()) {
        this.showInstallPrompt.set(true);
      } else {
        this.showNotificationButton.set(true);
      }
    }
  }

  // NEW: Enable notifications with user gesture
  async enableNotifications() {
    try {
      // Check if PWA is properly installed on iOS
      if (!this.messagingService.isNotificationSupported()) {
        if (this.isIOS()) {
          this.showInstallPrompt.set(true);
          return;
        }
      }

      const token = await this.messagingService.requestPermission();
      
      if (token) {
        this.isNotificationsEnabled.set(true);
        this.showInstallPrompt.set(false);
        this.showNotificationButton.set(false);
        
        // Send token to your backend here if needed
        console.log('Notification token obtained:', token);
        
        // Start listening for messages
        this.messagingService.receiveMessage();
        
        console.log('Notifications enabled successfully');
      } else {
        console.log('Failed to get notification token');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    }
  }

  // MODIFIED: Remove alert, make it optional
  requestPermission() {
    this.messagingService.requestPermission().then(token => {
      if (token) {
        console.log('Token received:', token);
        // Send token to your backend or store it
        // Removed alert for better UX
      }
    });
  }

  // NEW: Helper methods
  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  private isPWAInstalled(): boolean {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInstalled = (window.navigator as any).standalone === true;
    return isStandalone || isInstalled;
  }

  private registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
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