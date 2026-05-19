import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import type { UiPatternId } from './dev-ui-patterns-catalog';

interface EquipmentRow {
  id: string;
  code: string;
  name: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  group: string;
  location: string;
  updated: string;
}

@Component({
  selector: 'app-dev-ui-pattern-preview',
  standalone: true,
  imports: [NgTemplateOutlet, FormsModule, InputText, TableModule, Tag],
  templateUrl: './dev-ui-pattern-preview.component.html',
  styleUrl: './dev-ui-pattern-preview.component.scss',
})
export class DevUiPatternPreviewComponent {
  readonly patternKey = input.required<UiPatternId>();

  activeFilter: 'all' | 'active' | 'inactive' = 'all';
  search = '';

  readonly rows: EquipmentRow[] = [
    {
      id: '1',
      code: 'EX-2401',
      name: 'Cat 336 Excavator',
      status: 'Active',
      group: 'Earthwork',
      location: '30.2672° N, 97.7431° W',
      updated: '2 min ago',
    },
    {
      id: '2',
      code: 'WL-1180',
      name: 'Peterbilt Water Truck',
      status: 'Active',
      group: 'Support',
      location: '30.2710° N, 97.7398° W',
      updated: '8 min ago',
    },
    {
      id: '3',
      code: 'DZ-0092',
      name: 'John Deere 850 Dozer',
      status: 'Maintenance',
      group: 'Earthwork',
      location: '—',
      updated: '1 hr ago',
    },
    {
      id: '4',
      code: 'SS-3300',
      name: 'Skytrak 6042',
      status: 'Inactive',
      group: 'Lifting',
      location: 'Yard B',
      updated: '3 days ago',
    },
  ];

  get filteredRows(): EquipmentRow[] {
    const q = this.search.trim().toLowerCase();
    return this.rows.filter((r) => {
      if (this.activeFilter === 'active' && r.status !== 'Active') return false;
      if (this.activeFilter === 'inactive' && r.status === 'Active') return false;
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.group.toLowerCase().includes(q)
      );
    });
  }

  statusClass(status: EquipmentRow['status']): string {
    if (status === 'Active') return 'status-active';
    if (status === 'Maintenance') return 'status-warn';
    return 'status-inactive';
  }
}
