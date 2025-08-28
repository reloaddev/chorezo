import { Component, inject, input } from '@angular/core';
import { TasksService } from '../../services/tasks.service';

@Component({
  selector: 'app-task',
  imports: [],
  templateUrl: './task.html',
  styleUrl: './task.css'
})
export class Task {
  private readonly tasks = inject(TasksService);

  type = input('');
  assignee = input('');
  // Accept Date | string | number for flexibility
  lastDone = input<Date | string | number | undefined>(undefined);

  // Color thresholds (days) — tuned for maintainability
  private static readonly GREEN_MAX_EXCLUSIVE = 5; // < 5 days
  private static readonly ORANGE_RANGE: [number, number] = [5, 6]; // 5-6 days inclusive
  private static readonly RED_MIN_EXCLUSIVE = 7; // > 7 days (note: exactly 7 is default)

  displayType(): string {
    const t = (this.type() || '').toLowerCase();
    switch (t) {
      case 'kitchen':
        return 'Rengøring køkken';
      case 'floor':
        return 'Rengøring stue og trappe';
      case 'bathroom':
        return 'Rengøring badeværelse';
      default:
        return this.type() || '';
    }
  }

  daysAgo(): number {
    const v = this.lastDone();
    if (!v) return 0;
    const d = v instanceof Date ? v : new Date(v);
    const now = new Date();
    if (isNaN(d.getTime())) return 0;
    const ms = now.getTime() - d.getTime();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    return days < 0 ? 0 : days;
  }

  // Returns one of: 'green' | 'orange' | 'red' | 'default'
  private colorStatus(): 'green' | 'orange' | 'red' | 'default' {
    const days = this.daysAgo();
    if (days < Task.GREEN_MAX_EXCLUSIVE) return 'green';
    if (days >= Task.ORANGE_RANGE[0] && days <= Task.ORANGE_RANGE[1]) return 'orange';
    if (days > Task.RED_MIN_EXCLUSIVE) return 'red';
    return 'default';
  }

  // Compose the card class string so we don't need NgClass import
  cardClass(): string {
    const base = 'w-full rounded-xl border shadow-md p-4 mb-4 cursor-pointer select-none';
    const layout = 'bg-white'; // default bg for contrast with dynamic ones
    const interaction = '';

    const color = this.colorClassForStatus(this.colorStatus());

    return [base, color, interaction].filter(Boolean).join(' ');
  }

  private colorClassForStatus(status: 'green' | 'orange' | 'red' | 'default'): string {
    switch (status) {
      case 'green':
        return 'border-green-300 bg-green-50';
      case 'orange':
        return 'border-orange-300 bg-orange-50';
      case 'red':
        return 'border-red-300 bg-red-50';
      default:
        return 'border-slate-200 bg-white';
    }
  }

  async confirmDone() {
    const type = this.type();
    if (!type) return;
    const ok = window.confirm("Har du gjort dine roommates glade?");
    if (!ok) return;
    try {
      await this.tasks.completeOpenTask(type);
    } catch (e) {
      console.error('Failed to complete task', e);
      alert('Kunne ikke markere opgaven som færdig. Prøv igen.');
    }
  }
}
