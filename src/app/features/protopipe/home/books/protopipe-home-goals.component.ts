import { ChangeDetectionStrategy, Component, OnInit, inject, output } from '@angular/core';
import { Button } from 'primeng/button';
import { ProtopipeStrategyService } from '../../protopipe-strategy.service';

@Component({
  selector: 'app-protopipe-home-goals',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  templateUrl: './protopipe-home-goals.component.html',
  styleUrl: './protopipe-home-goals.component.scss',
})
export class ProtopipeHomeGoalsComponent implements OnInit {
  readonly strategy = inject(ProtopipeStrategyService);

  readonly goStrategy = output<void>();

  readonly summary = () => this.strategy.strategy().summary;
  readonly profile = () => this.strategy.onboardingProfile();

  ngOnInit(): void {
    void this.strategy.ensureLoaded();
  }
}
