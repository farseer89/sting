import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';

interface PathwayCard {
  id: 'diy' | 'agency' | 'autopilot';
  audience: string;
  title: string;
  pitch: string;
  body: string;
  icon: string;
  cta: string;
  link?: string;
  disabled?: boolean;
  badge?: string;
}

const PATHWAYS: PathwayCard[] = [
  {
    id: 'diy',
    audience: 'Solo & small business',
    title: 'Suggest keywords from my site',
    pitch: 'You write your own articles; we pick the topics.',
    body: 'We scan what your site already ranks for, what Google is already showing you for, and what Keyword Planner thinks your industry searches for. You check the boxes you like.',
    icon: 'pi pi-sparkles',
    cta: 'Find keywords for me',
    link: '/protopipe/keywords/discover/diy',
  },
  {
    id: 'agency',
    audience: 'SEO operators',
    title: "I'll manage my keywords",
    pitch: 'Full control. Research, paste, edit.',
    body: 'Jump straight to the editable keyword table or the per-phrase research tool. No suggestions in the way of your strategy.',
    icon: 'pi pi-sliders-h',
    cta: 'Open keyword table',
    link: '/protopipe/keywords',
  },
  {
    id: 'autopilot',
    audience: 'Set & forget',
    title: 'Let the agent decide',
    pitch: 'The agent picks targets and writes drafts.',
    body: 'A scheduled run reviews your site, your competition, and your tracked performance, then proposes new keywords with rationale you can accept in bulk.',
    icon: 'pi pi-bolt',
    cta: 'Coming soon',
    disabled: true,
    badge: 'Soon',
  },
];

@Component({
  selector: 'app-protopipe-discovery-hub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Button, Tag],
  templateUrl: './protopipe-discovery-hub.component.html',
  styleUrl: './protopipe-discovery-hub.component.scss',
})
export class ProtopipeDiscoveryHubComponent {
  readonly pathways = PATHWAYS;
}
