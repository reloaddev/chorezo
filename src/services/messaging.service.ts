import {inject, Injectable} from '@angular/core';
import {getMessaging, getToken, onMessage} from 'firebase/messaging';
import {addDoc, collection, Firestore} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private readonly firestore = inject(Firestore);
  messaging = getMessaging();

  async requestPermission(): Promise<string | null> {
    try {
      // First, explicitly request notification permission
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);

      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      // Only after permission is granted, get the FCM token
      console.log('Getting FCM token...');
      const currentToken = await getToken(this.messaging, {
        vapidKey: 'BKk1GEeCN_7HYQ_iKRBciMWetBbmAtbUAWWiirLJrRYirzzu7qEAa2gfahYhf2AfukFqfYb8oJtJL-WfkZvC3kE'
      });

      if (currentToken) {
        console.log('Registration token:', currentToken);
        return currentToken;
      } else {
        console.log('No registration token available.');
        return null;
      }
    } catch (err) {
      console.error('Error requesting permission or getting token:', err);
      return null;
    }
  }

  // Check if notifications are supported and PWA is installed
  isNotificationSupported(): boolean {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInstalled = (window.navigator as any).standalone === true;
    const hasNotificationAPI = 'Notification' in window;

    console.log('Notification support check:', {
      isStandalone,
      isInstalled,
      hasNotificationAPI,
      userAgent: navigator.userAgent
    });

    return hasNotificationAPI && (isStandalone || isInstalled);
  }

  receiveMessage() {
    onMessage(this.messaging, (payload) => {
      console.log('Message received. ', payload);
      this.showNotification(payload);
    });
  }

  async recordFCMToken(token: string) {
    const ref = collection(this.firestore, 'fcm-tokens');
    await addDoc(ref, { value: token });
  }

  private showNotification(payload: any) {
    console.log('Attempting to show notification:', payload);

    if (Notification.permission !== 'granted') {
        console.log('No notification permission');
        return;
    }

    // For iOS PWA, prefer service worker notifications
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(payload.notification.title, {
            body: payload.notification.body,
            icon: payload.notification.icon || '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            tag: 'sw-notification',
            requireInteraction: true,
            silent: false,
          });
        }).catch(err => {
          console.log('Service worker notification failed:', err);
          // Fallback to direct notification for non-PWA
          this.showDirectNotification(payload);
        });
    } else {
      this.showDirectNotification(payload);
    }
  }

  private showDirectNotification(payload: any) {
    if ('Notification' in window) {
      const notification = new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: payload.notification.icon || '/icons/icon-192x192.png',
        tag: 'fcm-notification',
        requireInteraction: true,
      });

      notification.onclick = () => {
        console.log('Notification clicked');
        window.focus();
        notification.close();
      };
    }
  }
}
