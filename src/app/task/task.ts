import { Component, input } from '@angular/core';

@Component({
  selector: 'app-task',
  imports: [],
  templateUrl: './task.html',
  styleUrl: './task.css'
})
export class Task {
  name = input('');
  assignee = input('');
  // Accept Date | string | number for flexibility
  lastDone = input<Date | string | number | undefined>(undefined);

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
}
