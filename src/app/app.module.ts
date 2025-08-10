import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

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
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { BatchUploadComponent } from './componet/batch-upload.component';
import { BatchDownloadComponent } from './componet/batch-download.component';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';
import { UserManagementComponent } from './admin-panel/user-management/user-management.component';
import { UserAnalyticsComponent } from './admin-panel/user-analytics/user-analytics.component';
import { FileBrowserComponent } from './admin-panel/file-browser/file-browser.component';
import { DriveFileManagementComponent } from './admin-panel/drive-file-management/drive-file-management.component';
import { HetznerFileManagementComponent } from './admin-panel/hetzner-file-management/hetzner-file-management.component';
import { BackupManagementComponent } from './admin-panel/backup-management/backup-management.component';
import { SystemMonitoringComponent } from './admin-panel/system-monitoring/system-monitoring.component';
// import { SecuritySettingsComponent } from './admin-panel/security-settings/security-settings.component'; // TODO: Create this component
import { NotificationSystemComponent } from './admin-panel/notification-system/notification-system.component';
import { ReportsExportComponent } from './admin-panel/reports-export/reports-export.component';
import { ActivityLogsComponent } from './admin-panel/activity-logs/activity-logs.component';
import { CreateAdminComponent } from './admin-panel/create-admin/create-admin.component';
import { GoogleDriveManagementComponent } from './admin-panel/google-drive-management/google-drive-management.component';
import { BackgroundProcessesComponent } from './admin-panel/background-processes/background-processes.component';
import { SecuritySettingsComponent } from './admin-panel/security-settings/security-settings.component';
import { StorageCleanupComponent } from './admin-panel/storage-cleanup/storage-cleanup.component';
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
    UserManagementComponent,
    UserAnalyticsComponent,
    FileBrowserComponent,
    DriveFileManagementComponent,
    HetznerFileManagementComponent,
    BackupManagementComponent,
    SystemMonitoringComponent,
    // SecuritySettingsComponent, // TODO: Create this component
    NotificationSystemComponent,
    ReportsExportComponent,
    ActivityLogsComponent,
    CreateAdminComponent,
    GoogleDriveManagementComponent,
    BackgroundProcessesComponent,
    SecuritySettingsComponent,
    StorageCleanupComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    FilePreviewComponent,
    SafePipe
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    RouterModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
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
    MatMenuModule,
    MatTabsModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatChipsModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatExpansionModule,
    MatBadgeModule,
    MatTooltipModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  providers: [
    provideAnimationsAsync(),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
