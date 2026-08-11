import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ThoughtRunSession } from '../../runs/thought-run-session.service';
import { ProtopipeMarketMapStore } from './protopipe-market-map.store';
import { labelize } from './protopipe-market-map.model';

@Component({
  selector: 'app-protopipe-home-market-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProtopipeMarketMapStore, ThoughtRunSession],
  templateUrl: './protopipe-home-market-map.component.html',
  styleUrl: './protopipe-home-market-map.component.scss',
})
export class ProtopipeHomeMarketMapComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(ProtopipeMarketMapStore);
  readonly labelize = labelize;

  ngOnInit(): void {
    const topologyRunId = this.route.snapshot.queryParamMap.get('topologyRunId') ?? undefined;
    void this.store.load(topologyRunId);
  }

  refresh(): void {
    void this.store.load();
  }

  rebuild(): void {
    void this.store.rebuild();
  }
}
