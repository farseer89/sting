import { Injectable } from '@angular/core';

export interface NavItem {
  label: string;
  icon?: string;
  routerLink?: string[];
  separator?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NavigationService {
  getMenuItems(): NavItem[] {
    return [
      { label: 'Home', icon: 'pi pi-home', routerLink: ['/home'] },
      { separator: true, label: '' },
      { label: 'Settings', icon: 'pi pi-cog', routerLink: ['/home'] },
    ];
  }
}
