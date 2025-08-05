import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'frontend-test';

  constructor(private router: Router) {}

  isAdminRoute(): boolean {
    return this.router.url.includes('/admin');
  }

  ngOnInit() {
    // Component initialization
  }
}
