import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// Components
import { AdminLoginComponent } from './admin-login.component';



// Guards
import { AdminAuthGuard } from '../../guards/admin-auth.guard';
import { SuperAdminGuard } from '../../guards/super-admin.guard';

const routes: Routes = [
  {
    path: 'login',
    component: AdminLoginComponent
  },


  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];

@NgModule({
  declarations: [
    AdminLoginComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    AdminLoginComponent
  ]
})
export class AdminAuthModule { }