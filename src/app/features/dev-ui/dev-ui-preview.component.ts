import { Component, input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem, MessageService } from 'primeng/api';
import type { UserPublic } from '@hive/contracts';
import { AccordionModule } from 'primeng/accordion';
import { Avatar } from 'primeng/avatar';
import { Breadcrumb } from 'primeng/breadcrumb';
import { Button } from 'primeng/button';
import { ButtonGroup } from 'primeng/buttongroup';
import { Card } from 'primeng/card';
import { Checkbox } from 'primeng/checkbox';
import { Chip } from 'primeng/chip';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { Divider } from 'primeng/divider';
import { Drawer } from 'primeng/drawer';
import { Fieldset } from 'primeng/fieldset';
import { FileUpload } from 'primeng/fileupload';
import { FloatLabel } from 'primeng/floatlabel';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Menu } from 'primeng/menu';
import { Menubar } from 'primeng/menubar';
import { Message } from 'primeng/message';
import { MultiSelect } from 'primeng/multiselect';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { Panel } from 'primeng/panel';
import { Password } from 'primeng/password';
import { Popover } from 'primeng/popover';
import { ProgressBar } from 'primeng/progressbar';
import { ProgressSpinner } from 'primeng/progressspinner';
import { RadioButton } from 'primeng/radiobutton';
import { Rating } from 'primeng/rating';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { Skeleton } from 'primeng/skeleton';
import { Slider } from 'primeng/slider';
import { SplitButton } from 'primeng/splitbutton';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { Toast } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Toolbar } from 'primeng/toolbar';
import { Tooltip } from 'primeng/tooltip';
import { JsonPipe } from '@angular/common';
import { CalendarPipelineDemoComponent } from './calendar-pipeline-demo.component';

@Component({
  selector: 'app-dev-ui-preview',
  standalone: true,
  imports: [
    FormsModule,
    JsonPipe,
    AccordionModule,
    Avatar,
    Breadcrumb,
    Button,
    ButtonGroup,
    Card,
    Checkbox,
    Chip,
    DatePicker,
    Dialog,
    Divider,
    Drawer,
    Fieldset,
    FileUpload,
    FloatLabel,
    IconField,
    InputIcon,
    InputNumber,
    InputText,
    Menu,
    Menubar,
    Message,
    MultiSelect,
    Paginator,
    Panel,
    Password,
    Popover,
    ProgressBar,
    ProgressSpinner,
    RadioButton,
    Rating,
    Select,
    SelectButton,
    Skeleton,
    Slider,
    SplitButton,
    TableModule,
    TabsModule,
    Tag,
    Textarea,
    Toast,
    ToggleSwitch,
    Toolbar,
    Tooltip,
    CalendarPipelineDemoComponent,
  ],
  providers: [MessageService],
  templateUrl: './dev-ui-preview.component.html',
  styleUrl: './dev-ui-preview.component.scss',
})
export class DevUiPreviewComponent {
  readonly demoKey = input.required<string>();
  private readonly messages = inject(MessageService);

  demoText = 'FieldWave';
  demoEmail = '';
  demoQty = 12;
  demoPwd = '';
  demoChecked = true;
  demoEnabled = true;
  demoRadio = 'A';
  demoCategoryFilter = 'all';
  demoDate: Date | null = new Date();
  demoStars = 4;
  demoRange = 40;
  demoCity: { name: string; code: string } | null = null;
  demoCities = [
    { name: 'Austin', code: 'ATX' },
    { name: 'Dallas', code: 'DAL' },
    { name: 'Houston', code: 'HOU' },
  ];
  demoMulti: typeof this.demoCities = [];
  dialogVisible = false;
  drawerVisible = false;
  pageFirst = 0;

  readonly demoUser: UserPublic = {
    id: 'demo-user-1',
    email: 'mike@fieldwave.dev',
    firstName: 'Mike',
    lastName: 'Developer',
    userPhoto: '',
    userAccountType: 'admin',
    isVerified: true,
  };

  readonly signInFixture = {
    id: this.demoUser.id,
    email: this.demoUser.email,
    firstName: this.demoUser.firstName,
    lastName: this.demoUser.lastName,
    userPhoto: this.demoUser.userPhoto,
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo',
    refreshToken: 'refresh-demo-token',
  };

  readonly tableRows = [
    { name: 'Pump A', status: 'Active' },
    { name: 'Valve B', status: 'Idle' },
    { name: 'Tank C', status: 'Maintenance' },
  ];

  readonly categoryOptions = [
    { label: 'All', value: 'all' },
    { label: 'Form', value: 'form' },
  ];

  readonly splitItems: MenuItem[] = [
    { label: 'Export CSV', icon: 'pi pi-file' },
    { label: 'Export PDF', icon: 'pi pi-file-pdf' },
  ];

  readonly menuItems: MenuItem[] = [
    { label: 'New', icon: 'pi pi-plus' },
    { label: 'Open', icon: 'pi pi-folder-open' },
    { separator: true },
    { label: 'Quit', icon: 'pi pi-power-off' },
  ];

  readonly menubarItems: MenuItem[] = [
    {
      label: 'File',
      items: [
        { label: 'New', icon: 'pi pi-plus' },
        { label: 'Open', icon: 'pi pi-folder-open' },
      ],
    },
    { label: 'Help', icon: 'pi pi-question-circle' },
  ];

  readonly breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'Dev' },
    { label: 'UI Playground' },
  ];

  showToast(): void {
    this.messages.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'PrimeNG toast from playground.',
    });
  }

  onPage(event: PaginatorState): void {
    this.pageFirst = event.first ?? 0;
  }
}
