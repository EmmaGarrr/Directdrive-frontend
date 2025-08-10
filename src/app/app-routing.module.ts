// In file: src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './componet/home/home.component';
import { LoginComponent } from './componet/login/login.component';
import { RegisterComponent } from './componet/register/register.component';
import { ProfileComponent } from './componet/profile/profile.component';
import { DownloadComponent } from './componet/download/download.component';
import { DashboardComponent } from './componet/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminAuthGuard } from './guards/admin-auth.guard';
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
// import { SecuritySettingsComponent } from './admin-panel/security-settings/security-settings.component'; // TODO: Create component
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

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'batch-upload', component: BatchUploadComponent },
  { path: 'batch-download/:batchId', component: BatchDownloadComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] }, // FIXED: Added missing profile route
  { path: 'download/:id', component: DownloadComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { 
    path: 'admin-panel', 
    component: AdminPanelComponent,
    canActivate: [AdminAuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', redirectTo: '', pathMatch: 'full' },
      { path: 'users', component: UserManagementComponent },
      { path: 'analytics', component: UserAnalyticsComponent },
      { path: 'files', component: FileBrowserComponent },
      { path: 'drive-files', component: DriveFileManagementComponent },
      { path: 'hetzner-files', component: HetznerFileManagementComponent },
      { path: 'storage', component: GoogleDriveManagementComponent },
      { path: 'background-processes', component: BackgroundProcessesComponent },
      { path: 'storage-cleanup', component: StorageCleanupComponent },
      { path: 'backup', component: BackupManagementComponent },
      { path: 'monitoring', component: SystemMonitoringComponent },
      { path: 'security', component: SecuritySettingsComponent },
      { path: 'notifications', component: NotificationSystemComponent },
      { path: 'reports', component: ReportsExportComponent },
      { path: 'logs', component: ActivityLogsComponent },
      { path: 'create-admin', component: CreateAdminComponent }
    ]
  },
  { 
    path: 'admin-auth', 
    loadChildren: () => import('./admin-panel/admin-auth/admin-auth.module').then(m => m.AdminAuthModule)
  },
  { path: 'admin', redirectTo: 'admin-panel', pathMatch: 'full' },
  { path: 'admin-login', redirectTo: 'admin-auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }