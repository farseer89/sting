import { Injectable } from '@angular/core';

/** Mirrors probe NavigationService menu shape for alpha-layout. */
export interface NavMenuItem {
  id: string;
  label: string;
  icon: string;
  routerLink?: string;
  items?: NavMenuItem[];
  badge?: string;
  badgeClass?: string;
  visible?: boolean;
  disabled?: boolean;
  separator?: boolean;
  styleClass?: string;
  target?: string;
  url?: string;
}

@Injectable({ providedIn: 'root' })
export class NavigationService {
  getMenuItems(): NavMenuItem[] {
    return [
      {
        id: 'home',
        label: 'Home',
        icon: 'pi pi-home',
        routerLink: '/home',
        visible: true,
      },
      {
        id: 'incentivize',
        label: 'Incentivize',
        icon: 'pi pi-star',
        visible: true,
        items: [
          { id: 'rewards-home', label: 'Rewards', icon: 'pi pi-gift', disabled: true, visible: true },
          { id: 'lottery', label: 'Lottery', icon: 'pi pi-ticket', disabled: true, visible: true },
        ],
      },
      {
        id: 'equipment',
        label: 'Equipment',
        icon: 'pi pi-cog',
        visible: true,
        items: [
          { id: 'equipment-dispatch', label: 'Dispatch', icon: 'pi pi-th-large', disabled: true, visible: true },
          { id: 'equipment-logistics', label: 'Logistics', icon: 'pi pi-compass', disabled: true, visible: true },
          {
            id: 'equipment-hours',
            label: 'Equipment Hours',
            icon: 'pi pi-clock',
            disabled: true,
            visible: true,
          },
          { id: 'equipment-telematics', label: 'Telematics', icon: 'pi pi-map-marker', disabled: true, visible: true },
          { id: 'equipment-scheduler', label: 'Scheduler', icon: 'pi pi-calendar', disabled: true, visible: true },
          { id: 'pm-board', label: 'PM Board', icon: 'pi pi-users', disabled: true, visible: true },
          {
            id: 'data-manager',
            label: 'Admin',
            icon: 'pi pi-database',
            visible: true,
            items: [
              {
                id: 'data-manager-home',
                label: 'Equipment List',
                icon: 'pi pi-list',
                disabled: true,
                visible: true,
              },
              { id: 'data-manager-jobs', label: 'Jobs', icon: 'pi pi-briefcase', disabled: true, visible: true },
              { id: 'data-manager-imports', label: 'Imports', icon: 'pi pi-upload', disabled: true, visible: true },
              {
                id: 'data-manager-users',
                label: 'User Management',
                icon: 'pi pi-users',
                disabled: true,
                visible: true,
              },
              { id: 'equipment-settings', label: 'Settings', icon: 'pi pi-cog', disabled: true, visible: true },
            ],
          },
        ],
      },
      {
        id: 'admin',
        label: 'Admin',
        icon: 'pi pi-shield',
        visible: true,
        items: [
          { id: 'admin-users', label: 'Users', icon: 'pi pi-users', disabled: true, visible: true },
          { id: 'admin-tenants', label: 'Tenants', icon: 'pi pi-building', disabled: true, visible: true },
        ],
      },
      {
        id: 'invoicing',
        label: 'Invoicing',
        icon: 'pi pi-file',
        visible: true,
        items: [
          { id: 'invoicing-home', label: 'Invoices', icon: 'pi pi-file', disabled: true, visible: true },
        ],
      },
    ];
  }

  /** Default expanded submenu ids (matches probe: groups open on load). */
  getDefaultOpenMenuIds(): string[] {
    return ['incentivize', 'equipment', 'data-manager', 'admin', 'invoicing'];
  }
}
