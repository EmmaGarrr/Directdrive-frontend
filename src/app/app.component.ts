import { Component, OnInit } from '@angular/core';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'frontend-test';

  ngOnInit() {
    // Initialize stagewise toolbar only in development mode
    if (environment.production === false) {
      import('@stagewise/toolbar').then(({ initToolbar }) => {
        initToolbar();
      });
    }
  }
}
