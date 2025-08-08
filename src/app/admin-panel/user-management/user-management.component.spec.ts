import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';

import { UserManagementComponent } from './user-management.component';
import { AdminAuthService } from '../../services/admin-auth.service';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UserManagementComponent ],
      imports: [ HttpClientTestingModule, FormsModule ],
      providers: [ AdminAuthService ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.currentPage).toBe(1);
    expect(component.pageSize).toBe(20);
    expect(component.searchTerm).toBe('');
    expect(component.selectedUsers.size).toBe(0);
  });

  it('should toggle user selection', () => {
    const userEmail = 'test@example.com';
    
    component.toggleUserSelection(userEmail);
    expect(component.selectedUsers.has(userEmail)).toBeTruthy();
    
    component.toggleUserSelection(userEmail);
    expect(component.selectedUsers.has(userEmail)).toBeFalsy();
  });

  it('should format bytes correctly', () => {
    expect(component.formatBytes(0)).toBe('0 Bytes');
    expect(component.formatBytes(1024)).toBe('1 KB');
    expect(component.formatBytes(1048576)).toBe('1 MB');
  });

  it('should get correct status class', () => {
    expect(component.getStatusClass('active')).toBe('status-active');
    expect(component.getStatusClass('suspended')).toBe('status-suspended');
    expect(component.getStatusClass('banned')).toBe('status-banned');
  });

  it('should get correct role class', () => {
    expect(component.getRoleClass('regular')).toBe('role-regular');
    expect(component.getRoleClass('admin')).toBe('role-admin');
    expect(component.getRoleClass('superadmin')).toBe('role-superadmin');
  });
});