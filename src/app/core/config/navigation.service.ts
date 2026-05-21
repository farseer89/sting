import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

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
    const items: NavMenuItem[] = [
      {
        id: 'my-sites',
        label: 'My Sites',
        icon: 'pi pi-globe',
        visible: true,
        items: [
          {
            id: 'my-plan',
            label: 'My Plan',
            icon: 'pi pi-compass',
            routerLink: '/protopipe',
            visible: true,
          },
          {
            id: 'keywords',
            label: 'Keywords',
            icon: 'pi pi-list',
            routerLink: '/protopipe/keywords',
            visible: true,
          },
          {
            id: 'content',
            label: 'Content',
            icon: 'pi pi-file-edit',
            routerLink: '/protopipe/content',
            visible: true,
          },
          {
            id: 'content-helper',
            label: 'Content Helper',
            icon: 'pi pi-user-edit',
            routerLink: '/protopipe/settings',
            visible: true,
          },
        ],
      },
      {
        id: 'admin',
        label: 'Admin',
        icon: 'pi pi-shield',
        visible: true,
        items: [
          {
            id: 'admin-agent',
            label: 'Agent Control',
            icon: 'pi pi-sparkles',
            routerLink: '/protopipe/admin/agent',
            visible: true,
          },
          {
            id: 'admin-integrations',
            label: 'Integrations',
            icon: 'pi pi-link',
            disabled: true,
            visible: true,
          },
        ],
      },
    ];

    if (environment.enableDevRoutes) {
      items.push({ id: 'dev-separator', label: '', icon: '', separator: true, visible: true });
      items.push(
        {
          id: 'dev-docs',
          label: 'Dev Docs',
          icon: 'pi pi-book',
          routerLink: '/dev/docs',
          visible: true,
        },
        {
          id: 'dev-ui',
          label: 'UI Playground',
          icon: 'pi pi-palette',
          routerLink: '/dev/ui',
          visible: true,
        },
        {
          id: 'home',
          label: 'Alpha Home',
          icon: 'pi pi-home',
          routerLink: '/home',
          visible: true,
        },
      );
    }

    return items;
  }

  getDefaultOpenMenuIds(): string[] {
    return ['my-sites', 'admin'];
  }
}
