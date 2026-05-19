import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';
import { Ripple } from 'primeng/ripple';
import { AuthService } from '../../core/auth/auth.service';
import { NavigationService, NavItem } from '../../core/config/navigation.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Button, Menu, Avatar, Ripple, Toast],
  providers: [MessageService],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly nav = inject(NavigationService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private sessionSub?: Subscription;

  readonly appName = environment.appName;
  readonly navItems: NavItem[] = this.nav.getMenuItems();

  readonly userMenuItems: MenuItem[] = [
    { label: 'Logout', icon: 'pi pi-sign-out', command: () => this.logout() },
  ];

  ngOnInit(): void {
    this.sessionSub = this.auth.sessionExpired$.subscribe((expired) => {
      if (expired) {
        this.messages.add({
          severity: 'warn',
          summary: 'Session expired',
          detail: 'Please sign in again.',
          life: 5000,
        });
        this.auth.dismissSessionExpired();
        this.auth.logout();
      }
    });
  }

  ngOnDestroy(): void {
    this.sessionSub?.unsubscribe();
  }

  userName(): string {
    return this.auth.getCurrentUserFullName();
  }

  logout(): void {
    this.auth.logout();
  }
}
