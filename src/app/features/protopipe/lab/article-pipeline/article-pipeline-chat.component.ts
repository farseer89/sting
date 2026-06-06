import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ArticleGenerationStep } from '@hive/contracts';
import { STEP_LABELS } from '../../article-pipeline-steps';

interface ChatMessage {
  id: string;
  author: 'you' | 'studio';
  text: string;
  ts: number;
}

@Component({
  selector: 'app-article-pipeline-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './article-pipeline-chat.component.html',
  styleUrl: './article-pipeline-chat.component.scss',
})
export class ArticlePipelineChatComponent {
  readonly activeStep = input<ArticleGenerationStep>('infer_type');

  readonly draft = signal('');
  private readonly _messages = signal<ChatMessage[]>([]);
  readonly messages = this._messages.asReadonly();

  readonly activeStepLabel = computed(() => STEP_LABELS[this.activeStep()]);

  readonly suggestions = computed<string[]>(() => {
    switch (this.activeStep()) {
      case 'infer_type':
        return [
          'Why did you pick this type?',
          'Try this as a how-to instead',
        ];
      case 'research':
        return [
          'Pull the latest SERP for this keyword',
          'Add this competitor URL to the research',
        ];
      case 'build_brief':
        return [
          'Pull more competitor outlines',
          'Tighten the voice for couples planning a wedding',
        ];
      case 'outline':
        return [
          'Add a pricing section',
          'Combine sections 2 and 3',
        ];
      case 'draft':
        return [
          'Make section 2 shorter',
          'Add a real example to the intro',
        ];
      case 'review':
        return ['Apply every suggestion that improves specificity'];
      case 'metadata':
        return ['Rewrite the meta description in active voice'];
      case 'assemble':
        return ['Save as a scheduled post for next Tuesday'];
      default:
        return [];
    }
  });

  send(): void {
    const text = this.draft().trim();
    if (!text) return;

    const now = Date.now();
    this._messages.update((list) => [
      ...list,
      { id: `u-${now}`, author: 'you', text, ts: now },
      {
        id: `s-${now + 1}`,
        author: 'studio',
        text: `Chat isn't wired up yet — your message about "${this.activeStepLabel()}" will route to the right step handler in a future chunk.`,
        ts: now + 1,
      },
    ]);
    this.draft.set('');
  }

  applySuggestion(text: string): void {
    this.draft.set(text);
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }
}
