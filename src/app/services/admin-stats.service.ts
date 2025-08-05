import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminStatsService {
  private statsUpdateSubject = new Subject<void>();
  public statsUpdate$ = this.statsUpdateSubject.asObservable();

  constructor() { }

  // Method to trigger stats update from any component
  public triggerStatsUpdate(): void {
    this.statsUpdateSubject.next();
  }
} 