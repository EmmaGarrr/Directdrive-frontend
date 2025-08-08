import { Component, OnInit } from '@angular/core';
import { AdminAuthService } from '../../services/admin-auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface SecurityConfig {
  session_timeout_minutes: number;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  require_strong_passwords: boolean;
  enable_two_factor_auth: boolean;
  allowed_cors_origins: string[];
  enable_api_rate_limiting: boolean;
}

interface AccessRule {
  rule_name: string;
  ip_pattern: string;
  action: 'allow' | 'deny' | 'rate_limit';
  description: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  last_modified: string;
}

interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  password_history_count: number;
  password_expiry_days: number;
}

interface SessionManagement {
  active_sessions: Array<{
    admin_email: string;
    ip_address: string;
    user_agent: string;
    login_time: string;
    last_activity: string;
    session_id: string;
  }>;
  total_active: number;
}

@Component({
  selector: 'app-security-settings',
  templateUrl: './security-settings.component.html',
  styleUrls: ['./security-settings.component.css']
})
export class SecuritySettingsComponent implements OnInit {
  loading = false;
  error = '';
  activeTab = 'general'; // general, access-rules, password-policy, sessions

  // Security Configuration
  securityConfig: SecurityConfig | null = null;
  originalSecurityConfig: SecurityConfig | null = null;
  
  // Access Rules
  accessRules: AccessRule[] = [];
  showAddRuleModal = false;
  editingRule: AccessRule | null = null;
  newRule: Partial<AccessRule> = {};

  // Password Policy
  passwordPolicy: PasswordPolicy | null = null;
  originalPasswordPolicy: PasswordPolicy | null = null;

  // Session Management
  sessionManagement: SessionManagement | null = null;

  constructor(
    private adminAuthService: AdminAuthService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadSecurityConfig();
    this.loadAccessRules();
    this.loadPasswordPolicy();
    this.loadSessionManagement();
  }

  private getHeaders(): HttpHeaders {
    const token = this.adminAuthService.getAdminToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  async loadSecurityConfig(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      const response = await this.http.get<SecurityConfig>(
        `${environment.apiUrl}/api/v1/admin/config/security`,
        { headers: this.getHeaders() }
      ).toPromise();

      if (response) {
        this.securityConfig = response;
        this.originalSecurityConfig = { ...response };
      }
    } catch (error: any) {
      console.error('Error loading security config:', error);
      this.error = error.error?.detail || 'Failed to load security configuration';
    } finally {
      this.loading = false;
    }
  }

  async saveSecurityConfig(): Promise<void> {
    if (!this.securityConfig) return;

    this.loading = true;
    this.error = '';

    try {
      await this.http.put(
        `${environment.apiUrl}/api/v1/admin/config/security`,
        this.securityConfig,
        { headers: this.getHeaders() }
      ).toPromise();

      this.originalSecurityConfig = { ...this.securityConfig };
      this.addSuccessMessage('Security configuration updated successfully');
    } catch (error: any) {
      console.error('Error saving security config:', error);
      this.error = error.error?.detail || 'Failed to save security configuration';
    } finally {
      this.loading = false;
    }
  }

  async loadAccessRules(): Promise<void> {
    try {
      const response = await this.http.get<any>(
        `${environment.apiUrl}/api/v1/admin/security/access-rules`,
        { headers: this.getHeaders() }
      ).toPromise();

      if (response) {
        this.accessRules = response.rules || [];
      }
    } catch (error: any) {
      console.error('Error loading access rules:', error);
    }
  }

  async saveAccessRule(): Promise<void> {
    if (!this.newRule.rule_name || !this.newRule.ip_pattern || !this.newRule.action) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      if (this.editingRule) {
        // Update existing rule
        await this.http.put(
          `${environment.apiUrl}/api/v1/admin/security/access-rules/${this.editingRule.rule_name}`,
          this.newRule,
          { headers: this.getHeaders() }
        ).toPromise();
      } else {
        // Create new rule
        await this.http.post(
          `${environment.apiUrl}/api/v1/admin/security/access-rules`,
          this.newRule,
          { headers: this.getHeaders() }
        ).toPromise();
      }

      await this.loadAccessRules();
      this.closeRuleModal();
      this.addSuccessMessage('Access rule saved successfully');
    } catch (error: any) {
      console.error('Error saving access rule:', error);
      this.error = error.error?.detail || 'Failed to save access rule';
    } finally {
      this.loading = false;
    }
  }

  async deleteAccessRule(ruleName: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this access rule?')) {
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      await this.http.delete(
        `${environment.apiUrl}/api/v1/admin/security/access-rules/${ruleName}`,
        { headers: this.getHeaders() }
      ).toPromise();

      await this.loadAccessRules();
      this.addSuccessMessage('Access rule deleted successfully');
    } catch (error: any) {
      console.error('Error deleting access rule:', error);
      this.error = error.error?.detail || 'Failed to delete access rule';
    } finally {
      this.loading = false;
    }
  }

  async loadPasswordPolicy(): Promise<void> {
    try {
      const response = await this.http.get<PasswordPolicy>(
        `${environment.apiUrl}/api/v1/admin/security/password-policy`,
        { headers: this.getHeaders() }
      ).toPromise();

      if (response) {
        this.passwordPolicy = response;
        this.originalPasswordPolicy = { ...response };
      }
    } catch (error: any) {
      console.error('Error loading password policy:', error);
    }
  }

  async savePasswordPolicy(): Promise<void> {
    if (!this.passwordPolicy) return;

    this.loading = true;
    this.error = '';

    try {
      await this.http.put(
        `${environment.apiUrl}/api/v1/admin/security/password-policy`,
        this.passwordPolicy,
        { headers: this.getHeaders() }
      ).toPromise();

      this.originalPasswordPolicy = { ...this.passwordPolicy };
      this.addSuccessMessage('Password policy updated successfully');
    } catch (error: any) {
      console.error('Error saving password policy:', error);
      this.error = error.error?.detail || 'Failed to save password policy';
    } finally {
      this.loading = false;
    }
  }

  async loadSessionManagement(): Promise<void> {
    try {
      const response = await this.http.get<SessionManagement>(
        `${environment.apiUrl}/api/v1/admin/security/session-management`,
        { headers: this.getHeaders() }
      ).toPromise();

      if (response) {
        this.sessionManagement = response;
      }
    } catch (error: any) {
      console.error('Error loading session management:', error);
    }
  }

  // UI Helper Methods
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  openAddRuleModal(): void {
    this.newRule = {
      action: 'allow',
      priority: 1,
      is_active: true
    };
    this.editingRule = null;
    this.showAddRuleModal = true;
    this.error = '';
  }

  editAccessRule(rule: AccessRule): void {
    this.newRule = { ...rule };
    this.editingRule = rule;
    this.showAddRuleModal = true;
    this.error = '';
  }

  closeRuleModal(): void {
    this.showAddRuleModal = false;
    this.editingRule = null;
    this.newRule = {};
    this.error = '';
  }

  resetSecurityConfig(): void {
    if (this.originalSecurityConfig) {
      this.securityConfig = { ...this.originalSecurityConfig };
    }
  }

  resetPasswordPolicy(): void {
    if (this.originalPasswordPolicy) {
      this.passwordPolicy = { ...this.originalPasswordPolicy };
    }
  }

  hasSecurityChanges(): boolean {
    return JSON.stringify(this.securityConfig) !== JSON.stringify(this.originalSecurityConfig);
  }

  hasPasswordPolicyChanges(): boolean {
    return JSON.stringify(this.passwordPolicy) !== JSON.stringify(this.originalPasswordPolicy);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getActionBadgeClass(action: string): string {
    switch (action) {
      case 'allow': return 'badge-success';
      case 'deny': return 'badge-danger';
      case 'rate_limit': return 'badge-warning';
      default: return 'badge-secondary';
    }
  }

  private addSuccessMessage(message: string): void {
    // You could integrate with a toast notification system here
    console.log('Success:', message);
    // For now, just clear any existing error
    this.error = '';
  }
}