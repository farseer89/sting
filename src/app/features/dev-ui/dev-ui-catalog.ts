/** PrimeNG playground catalog — data only (no Angular imports). */

export type DevUiCategory =
  | 'form'
  | 'button'
  | 'data'
  | 'panel'
  | 'overlay'
  | 'menu'
  | 'messages'
  | 'media'
  | 'file'
  | 'misc'
  | 'hive';

export interface DevUiCategoryMeta {
  id: DevUiCategory;
  label: string;
  icon: string;
}

export const DEV_UI_CATEGORIES: DevUiCategoryMeta[] = [
  { id: 'hive', label: 'Hive / Contracts', icon: 'pi pi-box' },
  { id: 'form', label: 'Form', icon: 'pi pi-pencil' },
  { id: 'button', label: 'Button', icon: 'pi pi-circle' },
  { id: 'data', label: 'Data', icon: 'pi pi-table' },
  { id: 'panel', label: 'Panel', icon: 'pi pi-window-maximize' },
  { id: 'overlay', label: 'Overlay', icon: 'pi pi-external-link' },
  { id: 'menu', label: 'Menu', icon: 'pi pi-bars' },
  { id: 'messages', label: 'Messages', icon: 'pi pi-comment' },
  { id: 'media', label: 'Media', icon: 'pi pi-image' },
  { id: 'file', label: 'File', icon: 'pi pi-upload' },
  { id: 'misc', label: 'Misc', icon: 'pi pi-th-large' },
];

export interface DevUiExample {
  id: string;
  name: string;
  category: DevUiCategory;
  module: string;
  description: string;
  snippet: string;
  /** When set, dev-ui-preview renders a live demo; otherwise snippet-only. */
  demoKey?: string;
  keywords?: string[];
}

const primengDoc = (module: string) => `https://primeng.org/${module}`;

function snippetOnly(name: string, module: string, usage: string): Pick<DevUiExample, 'snippet' | 'description'> {
  return {
    description: `Import from primeng/${module}. Docs: ${primengDoc(module)}`,
    snippet: `import { ${name} } from 'primeng/${module}';

${usage}`,
  };
}

const HAND_CRAFTED: DevUiExample[] = [
  {
    id: 'calendar-pipeline',
    name: 'Calendar (content pipeline)',
    category: 'hive',
    module: 'shared/ui/calendar',
    description:
      'Reusable <app-calendar> showing the Protopipe content lifecycle: ghost suggestions, drafts, scheduled, published with GA metric badges, failed-to-publish, and a projected wins banner.',
    demoKey: 'calendar-pipeline',
    keywords: ['calendar', 'pipeline', 'protopipe', 'content', 'schedule'],
    snippet: `import { CalendarComponent } from 'src/app/shared/ui/calendar/calendar.component';
import type { CalendarItem } from 'src/app/shared/ui/calendar/calendar.types';

// Map your domain objects into CalendarItem<T>
const items: CalendarItem<MyPost>[] = posts.map((p) => ({
  id: p.id,
  date: p.publishAt ?? p.updatedAt,
  title: p.title,
  status: p.status,                // 'suggested' | 'draft' | 'scheduled' | 'published' | 'failed'
  source: 'human',                 // 'agent' | 'human' | 'hybrid'
  metric: p.metrics                // optional GA badge
    ? { label: 'visits', value: '+' + p.metrics.weeklyDelta, trend: 'up' }
    : undefined,
  actions: [{ id: 'edit', label: 'Edit', icon: 'pi pi-pencil', kind: 'primary' }],
  data: p,
}));

// Drop into a template — defaults give you a full calendar
<app-calendar [items]="items()" (itemClick)="open($event)" (itemAction)="handle($event)">
  <ng-template #toolbar>...wins banner / filters...</ng-template>
  <ng-template #chip let-item>...custom chip override (optional)...</ng-template>
  <ng-template #dialog let-item>...custom dialog override (optional)...</ng-template>
</app-calendar>`,
  },
  {
    id: 'hive-user-card',
    name: 'UserPublic card',
    category: 'hive',
    module: 'hive-contracts',
    description: 'Presentational component bound to @hive/contracts UserPublic.',
    demoKey: 'hive-user-card',
    keywords: ['contracts', 'user', 'dto'],
    snippet: `import type { UserPublic } from '@hive/contracts';

// shared/ui/user-card/user-card.component.ts
@Component({
  selector: 'app-user-card',
  standalone: true,
  template: \`
    <div class="flex align-items-center gap-2">
      <p-avatar [image]="user().userPhoto" shape="circle" />
      <p-card>
        <p class="m-0 font-medium">{{ user().firstName }} {{ user().lastName }}</p>
        <p class="m-0 text-sm text-600">{{ user().email }}</p>
      </p-card>
    </div>
  \`,
})
export class UserCardComponent {
  user = input.required<UserPublic>();
}`,
  },
  {
    id: 'hive-sign-in-flow',
    name: 'Sign-in response',
    category: 'hive',
    module: 'hive-contracts',
    description: 'HTTP + session typing for bagend login.',
    demoKey: 'hive-sign-in-flow',
    keywords: ['auth', 'SignInResponse', 'session'],
    snippet: `import type { SignInResponse, StoredUserSession } from '@hive/contracts';

this.http.post<SignInResponse>(signInUrl, body).subscribe((data) => {
  const session: StoredUserSession = data;
  localStorage.setItem('currentUserData', JSON.stringify(session));
});`,
  },
  {
    id: 'button',
    name: 'Button',
    category: 'button',
    module: 'button',
    description: 'Primary actions, icons, severities.',
    demoKey: 'button',
    snippet: `import { Button } from 'primeng/button';

<p-button label="Save" icon="pi pi-check" />
<p-button label="Outlined" [outlined]="true" />
<p-button icon="pi pi-trash" severity="danger" [rounded]="true" />`,
  },
  {
    id: 'buttongroup',
    name: 'ButtonGroup',
    category: 'button',
    module: 'buttongroup',
    description: 'Grouped buttons.',
    demoKey: 'buttongroup',
    snippet: `import { Button } from 'primeng/button';
import { ButtonGroup } from 'primeng/buttongroup';

<p-buttonGroup>
  <p-button label="Left" />
  <p-button label="Right" />
</p-buttonGroup>`,
  },
  {
    id: 'splitbutton',
    name: 'SplitButton',
    category: 'button',
    module: 'splitbutton',
    description: 'Button with dropdown menu.',
    demoKey: 'splitbutton',
    snippet: `import { SplitButton } from 'primeng/splitbutton';

<p-splitButton label="Save" [model]="items" />`,
  },
  {
    id: 'inputtext',
    name: 'InputText',
    category: 'form',
    module: 'inputtext',
    description: 'Text input with forms.',
    demoKey: 'inputtext',
    snippet: `import { InputText } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';

<input pInputText [(ngModel)]="value" placeholder="Search" />`,
  },
  {
    id: 'textarea',
    name: 'Textarea',
    category: 'form',
    module: 'textarea',
    description: 'Multi-line text.',
    demoKey: 'textarea',
    snippet: `import { Textarea } from 'primeng/textarea';

<textarea pTextarea [(ngModel)]="notes" rows="3" class="w-full"></textarea>`,
  },
  {
    id: 'inputnumber',
    name: 'InputNumber',
    category: 'form',
    module: 'inputnumber',
    description: 'Numeric input with steppers.',
    demoKey: 'inputnumber',
    snippet: `import { InputNumber } from 'primeng/inputnumber';

<p-inputNumber [(ngModel)]="qty" [min]="0" [max]="100" />`,
  },
  {
    id: 'password',
    name: 'Password',
    category: 'form',
    module: 'password',
    description: 'Masked password field.',
    demoKey: 'password',
    snippet: `import { Password } from 'primeng/password';

<p-password [(ngModel)]="pwd" [toggleMask]="true" [feedback]="false" />`,
  },
  {
    id: 'select',
    name: 'Select',
    category: 'form',
    module: 'select',
    description: 'Single selection dropdown.',
    demoKey: 'select',
    snippet: `import { Select } from 'primeng/select';

<p-select [options]="cities" [(ngModel)]="selected" optionLabel="name" placeholder="Choose" />`,
  },
  {
    id: 'multiselect',
    name: 'MultiSelect',
    category: 'form',
    module: 'multiselect',
    description: 'Multiple selection.',
    demoKey: 'multiselect',
    snippet: `import { MultiSelect } from 'primeng/multiselect';

<p-multiselect [options]="items" [(ngModel)]="selected" optionLabel="name" display="chip" />`,
  },
  {
    id: 'checkbox',
    name: 'Checkbox',
    category: 'form',
    module: 'checkbox',
    description: 'Boolean checkbox.',
    demoKey: 'checkbox',
    snippet: `import { Checkbox } from 'primeng/checkbox';

<p-checkbox [(ngModel)]="checked" [binary]="true" label="Accept terms" />`,
  },
  {
    id: 'toggleswitch',
    name: 'ToggleSwitch',
    category: 'form',
    module: 'toggleswitch',
    description: 'On/off switch.',
    demoKey: 'toggleswitch',
    snippet: `import { ToggleSwitch } from 'primeng/toggleswitch';

<p-toggleswitch [(ngModel)]="enabled" />`,
  },
  {
    id: 'radiobutton',
    name: 'RadioButton',
    category: 'form',
    module: 'radiobutton',
    description: 'Exclusive choice.',
    demoKey: 'radiobutton',
    snippet: `import { RadioButton } from 'primeng/radiobutton';

@for (opt of options; track opt) {
  <p-radiobutton [value]="opt" [(ngModel)]="selected" [inputId]="opt" />
  <label [for]="opt">{{ opt }}</label>
}`,
  },
  {
    id: 'datepicker',
    name: 'DatePicker',
    category: 'form',
    module: 'datepicker',
    description: 'Date selection.',
    demoKey: 'datepicker',
    snippet: `import { DatePicker } from 'primeng/datepicker';

<p-datepicker [(ngModel)]="date" [showIcon]="true" />`,
  },
  {
    id: 'iconfield',
    name: 'IconField',
    category: 'form',
    module: 'iconfield',
    description: 'Input with icon — great for search bars.',
    demoKey: 'iconfield',
    snippet: `import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';

<p-iconfield>
  <p-inputicon class="pi pi-search" />
  <input pInputText placeholder="Search components" />
</p-iconfield>`,
  },
  {
    id: 'floatlabel',
    name: 'FloatLabel',
    category: 'form',
    module: 'floatlabel',
    description: 'Floating label inputs.',
    demoKey: 'floatlabel',
    snippet: `import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';

<p-floatlabel>
  <input pInputText id="email" [(ngModel)]="email" />
  <label for="email">Email</label>
</p-floatlabel>`,
  },
  {
    id: 'table',
    name: 'Table',
    category: 'data',
    module: 'table',
    description: 'Data table with sorting.',
    demoKey: 'table',
    snippet: `import { TableModule } from 'primeng/table';

<p-table [value]="rows" [paginator]="true" [rows]="5">
  <ng-template pTemplate="header">
    <tr><th>Name</th><th>Status</th></tr>
  </ng-template>
  <ng-template pTemplate="body" let-row>
    <tr><td>{{ row.name }}</td><td>{{ row.status }}</td></tr>
  </ng-template>
</p-table>`,
  },
  {
    id: 'dataview',
    name: 'DataView',
    category: 'data',
    module: 'dataview',
    description: 'List/grid data view.',
    snippet: `import { DataView } from 'primeng/dataview';

<p-dataView [value]="items">
  <ng-template #list let-items>
    @for (item of items; track item.id) {
      <div>{{ item.name }}</div>
    }
  </ng-template>
</p-dataView>`,
  },
  {
    id: 'paginator',
    name: 'Paginator',
    category: 'data',
    module: 'paginator',
    description: 'Pagination control.',
    demoKey: 'paginator',
    snippet: `import { Paginator } from 'primeng/paginator';

<p-paginator [rows]="10" [totalRecords]="120" (onPageChange)="onPage($event)" />`,
  },
  {
    id: 'card',
    name: 'Card',
    category: 'panel',
    module: 'card',
    description: 'Content container.',
    demoKey: 'card',
    snippet: `import { Card } from 'primeng/card';

<p-card header="Title" subheader="Subtitle">
  <p class="m-0">Body</p>
</p-card>`,
  },
  {
    id: 'panel',
    name: 'Panel',
    category: 'panel',
    module: 'panel',
    description: 'Collapsible panel with header.',
    demoKey: 'panel',
    snippet: `import { Panel } from 'primeng/panel';

<p-panel header="Filters" [toggleable]="true">Content</p-panel>`,
  },
  {
    id: 'fieldset',
    name: 'Fieldset',
    category: 'panel',
    module: 'fieldset',
    description: 'Grouped form sections.',
    demoKey: 'fieldset',
    snippet: `import { Fieldset } from 'primeng/fieldset';

<p-fieldset legend="Address">
  <p class="m-0">Fields here</p>
</p-fieldset>`,
  },
  {
    id: 'divider',
    name: 'Divider',
    category: 'panel',
    module: 'divider',
    description: 'Visual separator.',
    demoKey: 'divider',
    snippet: `import { Divider } from 'primeng/divider';

<p>Above</p>
<p-divider />
<p>Below</p>`,
  },
  {
    id: 'tabs',
    name: 'Tabs',
    category: 'panel',
    module: 'tabs',
    description: 'Tabbed content.',
    demoKey: 'tabs',
    snippet: `import { TabsModule } from 'primeng/tabs';

<p-tabs value="0">
  <p-tablist>
    <p-tab value="0">One</p-tab>
    <p-tab value="1">Two</p-tab>
  </p-tablist>
  <p-tabpanels>
    <p-tabpanel value="0">Tab 1</p-tabpanel>
    <p-tabpanel value="1">Tab 2</p-tabpanel>
  </p-tabpanels>
</p-tabs>`,
  },
  {
    id: 'accordion',
    name: 'Accordion',
    category: 'panel',
    module: 'accordion',
    description: 'Expandable sections.',
    demoKey: 'accordion',
    snippet: `import { AccordionModule } from 'primeng/accordion';

<p-accordion value="0">
  <p-accordion-panel value="0">
    <p-accordion-header>Section</p-accordion-header>
    <p-accordion-content>Content</p-accordion-content>
  </p-accordion-panel>
</p-accordion>`,
  },
  {
    id: 'toolbar',
    name: 'Toolbar',
    category: 'panel',
    module: 'toolbar',
    description: 'Action bar layout.',
    demoKey: 'toolbar',
    snippet: `import { Toolbar } from 'primeng/toolbar';
import { Button } from 'primeng/button';

<p-toolbar>
  <ng-template #start><p-button label="New" /></ng-template>
  <ng-template #end><p-button label="Export" [outlined]="true" /></ng-template>
</p-toolbar>`,
  },
  {
    id: 'dialog',
    name: 'Dialog',
    category: 'overlay',
    module: 'dialog',
    description: 'Modal dialog.',
    demoKey: 'dialog',
    snippet: `import { Dialog } from 'primeng/dialog';

<p-dialog header="Title" [(visible)]="visible" [modal]="true">
  <p>Dialog body</p>
</p-dialog>`,
  },
  {
    id: 'drawer',
    name: 'Drawer',
    category: 'overlay',
    module: 'drawer',
    description: 'Slide-in panel.',
    demoKey: 'drawer',
    snippet: `import { Drawer } from 'primeng/drawer';

<p-drawer [(visible)]="visible" header="Drawer">Content</p-drawer>`,
  },
  {
    id: 'popover',
    name: 'Popover',
    category: 'overlay',
    module: 'popover',
    description: 'Anchored overlay.',
    demoKey: 'popover',
    snippet: `import { Popover } from 'primeng/popover';

<p-button (onClick)="pop.toggle($event)" label="Show" />
<p-popover #pop>Popover content</p-popover>`,
  },
  {
    id: 'tooltip',
    name: 'Tooltip',
    category: 'overlay',
    module: 'tooltip',
    description: 'Hover hint.',
    demoKey: 'tooltip',
    snippet: `import { Tooltip } from 'primeng/tooltip';

<p-button label="Hover me" pTooltip="Help text" tooltipPosition="top" />`,
  },
  {
    id: 'breadcrumb',
    name: 'Breadcrumb',
    category: 'menu',
    module: 'breadcrumb',
    description: 'Navigation trail.',
    demoKey: 'breadcrumb',
    snippet: `import { Breadcrumb } from 'primeng/breadcrumb';

<p-breadcrumb [model]="items" [home]="home" />`,
  },
  {
    id: 'menu',
    name: 'Menu',
    category: 'menu',
    module: 'menu',
    description: 'Popup menu.',
    demoKey: 'menu',
    snippet: `import { Menu } from 'primeng/menu';

<p-menu #m [model]="items" [popup]="true" />
<p-button (onClick)="m.toggle($event)" label="Menu" />`,
  },
  {
    id: 'menubar',
    name: 'Menubar',
    category: 'menu',
    module: 'menubar',
    description: 'Horizontal menu bar.',
    demoKey: 'menubar',
    snippet: `import { Menubar } from 'primeng/menubar';

<p-menubar [model]="items" />`,
  },
  {
    id: 'toast',
    name: 'Toast',
    category: 'messages',
    module: 'toast',
    description: 'Growl notifications.',
    demoKey: 'toast',
    snippet: `import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

<p-toast />
this.messageService.add({ severity: 'success', summary: 'Saved' });`,
  },
  {
    id: 'message',
    name: 'Message',
    category: 'messages',
    module: 'message',
    description: 'Inline alert.',
    demoKey: 'message',
    snippet: `import { Message } from 'primeng/message';

<p-message severity="info">Informational text</p-message>`,
  },
  {
    id: 'tag',
    name: 'Tag',
    category: 'messages',
    module: 'tag',
    description: 'Status label.',
    demoKey: 'tag',
    snippet: `import { Tag } from 'primeng/tag';

<p-tag value="Active" severity="success" />`,
  },
  {
    id: 'badge',
    name: 'Badge',
    category: 'messages',
    module: 'badge',
    description: 'Count indicator.',
    demoKey: 'badge',
    snippet: `import { Badge } from 'primeng/badge';
import { Button } from 'primeng/button';

<p-button label="Inbox" badge="3" badgeSeverity="danger" />`,
  },
  {
    id: 'chip',
    name: 'Chip',
    category: 'messages',
    module: 'chip',
    description: 'Compact token.',
    demoKey: 'chip',
    snippet: `import { Chip } from 'primeng/chip';

<p-chip label="Equipment" icon="pi pi-cog" [removable]="true" />`,
  },
  {
    id: 'progressbar',
    name: 'ProgressBar',
    category: 'misc',
    module: 'progressbar',
    description: 'Progress indicator.',
    demoKey: 'progressbar',
    snippet: `import { ProgressBar } from 'primeng/progressbar';

<p-progressBar [value]="65" />`,
  },
  {
    id: 'progressspinner',
    name: 'ProgressSpinner',
    category: 'misc',
    module: 'progressspinner',
    description: 'Loading spinner.',
    demoKey: 'progressspinner',
    snippet: `import { ProgressSpinner } from 'primeng/progressspinner';

<p-progressSpinner ariaLabel="Loading" />`,
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    category: 'misc',
    module: 'skeleton',
    description: 'Loading placeholder.',
    demoKey: 'skeleton',
    snippet: `import { Skeleton } from 'primeng/skeleton';

<p-skeleton width="100%" height="2rem" />
<p-skeleton width="75%" height="1rem" class="mt-2" />`,
  },
  {
    id: 'avatar',
    name: 'Avatar',
    category: 'media',
    module: 'avatar',
    description: 'User avatar.',
    demoKey: 'avatar',
    snippet: `import { Avatar } from 'primeng/avatar';

<p-avatar label="MS" shape="circle" />
<p-avatar image="/assets/avatar.png" shape="circle" />`,
  },
  {
    id: 'rating',
    name: 'Rating',
    category: 'form',
    module: 'rating',
    description: 'Star rating.',
    demoKey: 'rating',
    snippet: `import { Rating } from 'primeng/rating';

<p-rating [(ngModel)]="stars" />`,
  },
  {
    id: 'slider',
    name: 'Slider',
    category: 'form',
    module: 'slider',
    description: 'Range slider.',
    demoKey: 'slider',
    snippet: `import { Slider } from 'primeng/slider';

<p-slider [(ngModel)]="range" [min]="0" [max]="100" />`,
  },
  {
    id: 'selectbutton',
    name: 'SelectButton',
    category: 'button',
    module: 'selectbutton',
    description: 'Toggle button group — use for category filters.',
    demoKey: 'selectbutton',
    snippet: `import { SelectButton } from 'primeng/selectbutton';

<p-selectbutton [options]="options" [(ngModel)]="value" optionLabel="label" />`,
  },
  {
    id: 'fileupload',
    name: 'FileUpload',
    category: 'file',
    module: 'fileupload',
    description: 'File upload widget.',
    demoKey: 'fileupload',
    snippet: `import { FileUpload } from 'primeng/fileupload';

<p-fileUpload mode="basic" chooseLabel="Upload" name="file" />`,
  },
];

/** Auto-generated catalog entries (snippet-only) for remaining PrimeNG modules. */
const AUTO_MODULES: { module: string; name: string; category: DevUiCategory; importName: string }[] = [
  { module: 'autocomplete', name: 'AutoComplete', category: 'form', importName: 'AutoComplete' },
  { module: 'cascadeselect', name: 'CascadeSelect', category: 'form', importName: 'CascadeSelect' },
  { module: 'colorpicker', name: 'ColorPicker', category: 'form', importName: 'ColorPicker' },
  { module: 'inputmask', name: 'InputMask', category: 'form', importName: 'InputMask' },
  { module: 'inputotp', name: 'InputOtp', category: 'form', importName: 'InputOtp' },
  { module: 'knob', name: 'Knob', category: 'form', importName: 'Knob' },
  { module: 'listbox', name: 'Listbox', category: 'form', importName: 'Listbox' },
  { module: 'togglebutton', name: 'ToggleButton', category: 'form', importName: 'ToggleButton' },
  { module: 'treeselect', name: 'TreeSelect', category: 'form', importName: 'TreeSelect' },
  { module: 'carousel', name: 'Carousel', category: 'media', importName: 'Carousel' },
  { module: 'galleria', name: 'Galleria', category: 'media', importName: 'Galleria' },
  { module: 'image', name: 'Image', category: 'media', importName: 'Image' },
  { module: 'tree', name: 'Tree', category: 'data', importName: 'Tree' },
  { module: 'treetable', name: 'TreeTable', category: 'data', importName: 'TreeTable' },
  { module: 'orderlist', name: 'OrderList', category: 'data', importName: 'OrderList' },
  { module: 'picklist', name: 'PickList', category: 'data', importName: 'PickList' },
  { module: 'timeline', name: 'Timeline', category: 'data', importName: 'Timeline' },
  { module: 'organizationchart', name: 'OrganizationChart', category: 'data', importName: 'OrganizationChart' },
  { module: 'confirmdialog', name: 'ConfirmDialog', category: 'overlay', importName: 'ConfirmDialog' },
  { module: 'confirmpopup', name: 'ConfirmPopup', category: 'overlay', importName: 'ConfirmPopup' },
  { module: 'dynamicdialog', name: 'DynamicDialog', category: 'overlay', importName: 'DialogService' },
  { module: 'contextmenu', name: 'ContextMenu', category: 'menu', importName: 'ContextMenu' },
  { module: 'megamenu', name: 'MegaMenu', category: 'menu', importName: 'MegaMenu' },
  { module: 'panelmenu', name: 'PanelMenu', category: 'menu', importName: 'PanelMenu' },
  { module: 'tieredmenu', name: 'TieredMenu', category: 'menu', importName: 'TieredMenu' },
  { module: 'dock', name: 'Dock', category: 'menu', importName: 'Dock' },
  { module: 'speeddial', name: 'SpeedDial', category: 'button', importName: 'SpeedDial' },
  { module: 'splitter', name: 'Splitter', category: 'panel', importName: 'Splitter' },
  { module: 'stepper', name: 'Stepper', category: 'panel', importName: 'Stepper' },
  { module: 'scrollpanel', name: 'ScrollPanel', category: 'panel', importName: 'ScrollPanel' },
  { module: 'metergroup', name: 'MeterGroup', category: 'misc', importName: 'MeterGroup' },
  { module: 'terminal', name: 'Terminal', category: 'misc', importName: 'Terminal' },
  { module: 'blockui', name: 'BlockUI', category: 'misc', importName: 'BlockUI' },
  { module: 'chart', name: 'Chart', category: 'misc', importName: 'UIChart' },
  { module: 'editor', name: 'Editor', category: 'form', importName: 'Editor' },
  { module: 'inplace', name: 'Inplace', category: 'misc', importName: 'Inplace' },
  { module: 'scroller', name: 'Scroller', category: 'misc', importName: 'Scroller' },
];

const autoExamples: DevUiExample[] = AUTO_MODULES.filter(
  (a) => !HAND_CRAFTED.some((h) => h.module === a.module),
).map((a) => ({
  id: a.module,
  name: a.name,
  category: a.category,
  module: a.module,
  ...snippetOnly(a.importName, a.module, `<!-- See ${primengDoc(a.module)} for full API -->`),
  keywords: [a.module, a.name.toLowerCase()],
}));

export const DEV_UI_CATALOG: DevUiExample[] = [...HAND_CRAFTED, ...autoExamples];

export const DEV_UI_WORKFLOW_STEPS = [
  {
    step: 1,
    title: 'Define the contract',
    body: 'Add or extend types in @hive/contracts (e.g. UserPublic, JobSummary).',
  },
  {
    step: 2,
    title: 'Map bagend responses',
    body: 'Use allowlist mappers (toUserPublic) — never spread Mongoose toJSON().',
  },
  {
    step: 3,
    title: 'Create shared UI',
    body: 'Add presentational component under src/app/shared/ui/ with input() typed from contracts.',
  },
  {
    step: 4,
    title: 'Wire the feature',
    body: 'Feature services fetch typed data; smart components compose shared/ui pieces.',
  },
  {
    step: 5,
    title: 'Register in playground',
    body: 'Add a hive category entry in dev-ui-catalog.ts for discoverability.',
  },
] as const;
