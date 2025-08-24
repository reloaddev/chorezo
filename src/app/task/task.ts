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

  async confirmDone() {
    const type = this.type();
    const who = this.assignee();
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
