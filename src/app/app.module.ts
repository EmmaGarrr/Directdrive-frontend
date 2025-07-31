import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HomeComponent } from './componet/home/home.component';
import { DownloadComponent } from './componet/download/download.component';
import { LoginComponent } from './componet/login/login.component';
import { RegisterComponent } from './componet/register/register.component';
import { ProfileComponent } from './componet/profile/profile.component';
import { DashboardComponent } from './componet/dashboard/dashboard.component';
import { HeaderComponent } from './shared/component/header/header.component';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { BatchUploadComponent } from './componet/batch-upload.component';
import { BatchDownloadComponent } from './componet/batch-download.component';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';
import { ForgotPasswordComponent } from './componet/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './componet/reset-password/reset-password.component';
import { FilePreviewComponent } from './componet/file-preview/file-preview.component';
import { SafePipe } from './shared/pipes/safe.pipe';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DownloadComponent,
    LoginComponent,
    RegisterComponent,
    ProfileComponent,
    DashboardComponent,
    HeaderComponent,
    BatchUploadComponent,
    BatchDownloadComponent,
    AdminPanelComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    FilePreviewComponent,
    SafePipe
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDialogModule,
    MatMenuModule
  ],
  providers: [
    provideAnimationsAsync(),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
