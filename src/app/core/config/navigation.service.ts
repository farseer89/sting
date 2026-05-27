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
            id: 'landing-sites',
            label: 'Landing sites',
            icon: 'pi pi-window-maximize',
            routerLink: '/protopipe/site-builder/sites',
            visible: true,
          },
          {
            id: 'my-plan',
            label: 'My Plan',
            icon: 'pi pi-compass',
            routerLink: '/protopipe',
            visible: true,
          },
          {
            id: 'research',
            label: 'Research',
            icon: 'pi pi-search',
            routerLink: '/protopipe/research',
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
            id: 'keywords-discover',
            label: 'Find keywords',
            icon: 'pi pi-sparkles',
            routerLink: '/protopipe/keywords/discover',
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
          {
            id: 'analytics',
            label: 'Analytics',
            icon: 'pi pi-chart-bar',
            routerLink: '/protopipe/analytics',
            visible: true,
          },
          {
            id: 'leads',
            label: 'Leads',
            icon: 'pi pi-inbox',
            routerLink: '/protopipe/leads',
            visible: true,
          },
          {
            id: 'integrations',
            label: 'Integrations',
            icon: 'pi pi-link',
            routerLink: '/protopipe/settings/integrations',
            visible: true,
          },
        ],
      },
      {
        id: 'site-builder',
        label: 'Site Builder',
        icon: 'pi pi-th-large',
        visible: true,
        items: [
          {
            id: 'sb-components',
            label: 'Components',
            icon: 'pi pi-box',
            routerLink: '/protopipe/site-builder/components',
            visible: true,
          },
          {
            id: 'sb-templates',
            label: 'Templates',
            icon: 'pi pi-clone',
            routerLink: '/protopipe/site-builder/templates',
            visible: true,
          },
          {
            id: 'sb-sites',
            label: 'Sites',
            icon: 'pi pi-globe',
            routerLink: '/protopipe/site-builder/sites',
            visible: true,
          },
          {
            id: 'sb-theme',
            label: 'Theme tokens',
            icon: 'pi pi-palette',
            disabled: true,
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
    return ['my-sites', 'site-builder', 'admin'];
  }
}
