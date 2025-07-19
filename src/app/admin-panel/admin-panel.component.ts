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
  // private readonly adminToken = 'your_super_secret_admin_token'; // Same as in main.py
  private readonly adminToken = 'some_very_secret_and_long_random_string_12345';

  constructor(private adminSocketService: AdminSocketService) { }

  ngOnInit(): void {
    this.adminSocketService.connect(this.adminToken);
    this.adminSocketService.messages$.subscribe(
    (data: any) => { // 'data' is our JSON object, e.g., { type: '...', message: '...' }
      
      // Check if the object and the message property exist
      if (data && data.message) {
        // Add ONLY the message string to our events array
        this.events.unshift(data.message); 
      }
    }
  );
  }

  ngOnDestroy(): void {
    this.adminSocketService.disconnect();
  }
}