import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import type { KeywordIntent, KeywordPriority } from '../protopipe.models';
import { intentSeverity, prioritySeverity } from '../protopipe-keyword-display';
import { ProtopipeStrategyService } from '../protopipe-strategy.service';

@Component({
  selector: 'app-protopipe-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Button, Tag, TableModule, ProgressSpinner, Tooltip],
  templateUrl: './protopipe-dashboard.component.html',
  styleUrl: './protopipe-dashboard.component.scss',
})
export class ProtopipeDashboardComponent implements OnInit {
  private readonly strategy = inject(ProtopipeStrategyService);

  readonly strategySummary = this.strategy.strategy;
  readonly loading = this.strategy.loading;
  readonly keywordCount = this.strategy.keywordCount;
  readonly highPriorityCount = this.strategy.highPriorityCount;

  ngOnInit(): void {
    void this.strategy.ensureLoaded();
  }

  intentSeverity(intent: KeywordIntent): 'success' | 'info' | 'warn' {
    return intentSeverity(intent);
  }

  prioritySeverity(priority: KeywordPriority): 'danger' | 'warn' | 'secondary' {
    return prioritySeverity(priority);
  }
}
