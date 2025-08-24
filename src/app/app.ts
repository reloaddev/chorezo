import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Task } from './task/task';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Task],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly tasks = [
    { name: 'Clean bathroom', assignee: 'Wouter', lastDone: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    { name: 'Clean kitchen', assignee: 'Tomas', lastDone: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    { name: 'Clean floor', assignee: 'Henrik', lastDone: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  ];
}
