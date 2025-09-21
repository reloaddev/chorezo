import { Component, ViewChild, ElementRef, AfterViewInit, OnInit, inject } from '@angular/core';
import { ShoppingListService, ShoppingTodo } from './shopping-list.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-shopping-list',
  templateUrl: './shopping-list.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [``]
})

export class ShoppingList implements OnInit, AfterViewInit {
  @ViewChild('addInput') addInput!: ElementRef<HTMLInputElement>;
  @ViewChild('editInput') editInput!: ElementRef<HTMLInputElement>;

  todos: ShoppingTodo[] = [];
  newTodoText = '';
  editingId: string | null = null;
  editingText = '';

  private shoppingListService = inject(ShoppingListService);

  ngOnInit(): void {
    this.shoppingListService.getTodos().subscribe(todos => {
      this.todos = todos;
    });
  }

  ngAfterViewInit(): void {
    // Autofocus the add input on component load
    if (this.addInput) {
      this.addInput.nativeElement.focus();
    }
  }

  async addTodo() {
    if (this.newTodoText.trim()) {
      await this.shoppingListService.addTodo(this.newTodoText.trim());
      this.newTodoText = '';
      setTimeout(() => {
        if (this.addInput) {
          this.addInput.nativeElement.focus();
        }
      }, 0);
    }
  }

  async toggleTodo(id: string | undefined) {
    const todo = this.todos.find(t => t.id === id);
    if (todo && todo.id) {
      await this.shoppingListService.updateTodo(todo.id, !todo.completed);
    }
  }

  async deleteTodo(id: string | undefined) {
    if (id) {
      await this.shoppingListService.deleteTodo(id);
    }
  }

  async clearAll() {
    await this.shoppingListService.clearAll();
  }

  startEditing(todo: ShoppingTodo): void {
    this.editingId = String(todo.id);
    this.editingText = todo.text;
    // Focus the edit input after view update
    setTimeout(() => {
      if (this.editInput) {
        this.editInput.nativeElement.focus();
        this.editInput.nativeElement.select();
      }
    }, 0);
  }

  async saveEdit() {
    if (this.editingId && this.editingText.trim()) {
      const todo = this.todos.find(t => t.id === this.editingId);
      if (todo && todo.id) {
        await this.shoppingListService.updateTodoText(todo.id, this.editingText.trim());
      }
    }
    this.editingId = null;
    this.editingText = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editingText = '';
  }

  onAddKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.addTodo();
    }
  }

  onEditKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.saveEdit();
    } else if (event.key === 'Escape') {
      this.cancelEdit();
    }
  }
}