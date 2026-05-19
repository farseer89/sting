import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

interface UiExample {
  title: string;
  snippet: string;
}

@Component({
  selector: 'app-dev-ui',
  standalone: true,
  imports: [FormsModule, Button, InputText, Tag, Toast],
  providers: [MessageService],
  templateUrl: './dev-ui.component.html',
  styleUrl: './dev-ui.component.scss',
})
export class DevUiComponent {
  demoInput = 'FieldWave';

  readonly examples: UiExample[] = [
    {
      title: 'Button (outlined)',
      snippet: "import { Button } from 'primeng/button';\n\n<p-button label=\"Save\" icon=\"pi pi-check\" [outlined]=\"true\" />",
    },
    {
      title: 'InputText',
      snippet: "import { InputText } from 'primeng/inputtext';\nimport { FormsModule } from '@angular/forms';\n\n<input pInputText [(ngModel)]=\"value\" />",
    },
    {
      title: 'Tag',
      snippet: "import { Tag } from 'primeng/tag';\n\n<p-tag value=\"MVP\" severity=\"info\" />",
    },
  ];

  constructor(private readonly messages: MessageService) {}

  showToast(): void {
    this.messages.add({ severity: 'success', summary: 'Toast', detail: 'PrimeNG toast works.' });
  }
}
