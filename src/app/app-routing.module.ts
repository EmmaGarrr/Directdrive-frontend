// import { NgModule } from '@angular/core';
// import { RouterModule, Routes } from '@angular/router';
// import { HomeComponent } from './componet/home/home.component';
// import { LoginComponent } from './componet/login/login.component';
// import { RegisterComponent } from './componet/register/register.component';
// import { DownloadComponent } from './componet/download/download.component';
// import { DashboardComponent } from './componet/dashboard/dashboard.component';
// import { AuthGuard } from './guards/auth.guard';

// const routes: Routes = [
//   { path: '', component: HomeComponent },
//   { path: 'login', component: LoginComponent },
//   { path: 'register', component: RegisterComponent },
//   { path: 'download/:id', component: DownloadComponent },
//   { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
//   { path: '**', redirectTo: '' } // Wildcard route
// ];

// @NgModule({
//   imports: [RouterModule.forRoot(routes)],
//   exports: [RouterModule]
// })
// export class AppRoutingModule { }

// // src/app/app-routing.module.ts
// import { NgModule } from '@angular/core';
// import { RouterModule, Routes } from '@angular/router';
// import { HomeComponent } from './componet/home/home.component';
// import { LoginComponent } from './componet/login/login.component';
// import { RegisterComponent } from './componet/register/register.component';
// import { DownloadComponent } from './componet/download/download.component';
// import { DashboardComponent } from './componet/dashboard/dashboard.component';
// import { AuthGuard } from './guards/auth.guard';

// const routes: Routes = [
//   { path: '', component: HomeComponent },
//   { path: 'login', component: LoginComponent },
//   { path: 'register', component: RegisterComponent },
//   { path: 'download/:id', component: DownloadComponent },
//   { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
//   { path: '**', redirectTo: '' } // Wildcard route
// ];

// @NgModule({
//   imports: [RouterModule.forRoot(routes)],
//   exports: [RouterModule]
// })
// export class AppRoutingModule { }



// In file: src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './componet/home/home.component';
import { LoginComponent } from './componet/login/login.component';
import { RegisterComponent } from './componet/register/register.component';
import { DownloadComponent } from './componet/download/download.component';
import { DashboardComponent } from './componet/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { BatchUploadComponent } from './componet/batch-upload.component'; // <--- ADD THIS IMPORT
import { BatchDownloadComponent } from './componet/batch-download.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'batch-upload', component: BatchUploadComponent }, // <--- ADD THIS LINE
  { path: 'batch-download/:batchId', component: BatchDownloadComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'download/:id', component: DownloadComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' } // Wildcard route
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }