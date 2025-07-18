// File: src/app/admin-panel/admin-panel.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminSocketService } from '../services/admin-socket.service';

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  public events: string[] = [];
  private readonly adminToken = 'your_super_secret_admin_token'; // Same as in main.py

  constructor(private adminSocketService: AdminSocketService) { }

  ngOnInit(): void {
    this.adminSocketService.connect(this.adminToken);
    this.adminSocketService.messages$.subscribe(
      (message) => {
        this.events.unshift(message); // Add new messages to the top of the list
      }
    );
  }

  ngOnDestroy(): void {
    this.adminSocketService.disconnect();
  }
}