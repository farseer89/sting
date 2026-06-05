import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  CONTENT_SPOKE_ACCOUNT,
  CONTENT_SPOKE_CLUSTERS,
  CONTENT_SPOKE_LEGEND,
  type ContentSpokeAccount,
  type SpokeCluster,
  type SpokeNode,
} from './void-content-spoke.mock';

export interface PlacedNode {
  node: SpokeNode;
  cluster: SpokeCluster;
  order: number;
  x: number;
  y: number;
  angle: number;
  path: string;
}

interface BaseNode3D {
  node: SpokeNode;
  cluster: SpokeCluster;
  order: number;
  bx: number;
  by: number;
  bz: number;
}

interface Edge3D {
  a: number;
  b: number;
  cluster: SpokeCluster;
  hub: boolean;
}

export interface ProjectedNode3D extends BaseNode3D {
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
}

export interface ProjectedEdge3D {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  opacity: number;
  width: number;
  hub: boolean;
  z: number;
}

type Vec3 = [number, number, number];

interface CubeSticker {
  p: Vec3;
  n: Vec3;
  color: string;
}

interface CubeMove {
  axis: 0 | 1 | 2 | null;
  layer: number;
  dir: 1 | -1;
  duration: number;
}

export interface ProjectedSticker {
  points: string;
  color: string;
  opacity: number;
  z: number;
}

type SpokeView = 'radial' | 'neural';

interface SpokeGeo {
  viewSize: number;
  hubRadius: number;
  innerRadius: number;
  outerRadius: number;
  sphereRadius: number;
  focal: number;
  orbitPillar: number;
  orbitArticle: number;
  orbitKeyword: number;
  sunGlowRadius: number;
  wedgeOuterPad: number;
}

const FULL_GEO: SpokeGeo = {
  viewSize: 720,
  hubRadius: 58,
  innerRadius: 118,
  outerRadius: 268,
  sphereRadius: 268,
  focal: 720,
  orbitPillar: 118,
  orbitArticle: 190,
  orbitKeyword: 262,
  sunGlowRadius: 150,
  wedgeOuterPad: 18,
};

/** Home embed: slightly inset orbits for labels, but near full lab scale. */
const EMBEDDED_GEO: SpokeGeo = {
  viewSize: 600,
  hubRadius: 48,
  innerRadius: 98,
  outerRadius: 218,
  sphereRadius: 218,
  focal: 600,
  orbitPillar: 98,
  orbitArticle: 158,
  orbitKeyword: 210,
  sunGlowRadius: 125,
  wedgeOuterPad: 10,
};

const SECTION_GAP = 18;

const DEG2RAD = Math.PI / 180;

const CUBE_FACES: { n: Vec3; color: string }[] = [
  { n: [1, 0, 0], color: '#d1495b' },
  { n: [-1, 0, 0], color: '#ed9b40' },
  { n: [0, 1, 0], color: '#f4f4f5' },
  { n: [0, -1, 0], color: '#ffd23f' },
  { n: [0, 0, 1], color: '#43aa8b' },
  { n: [0, 0, -1], color: '#277da1' },
];

@Component({
  selector: 'app-void-content-spoke',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './void-content-spoke.component.html',
  styleUrl: './void-content-spoke.component.scss',
})
export class VoidContentSpokeComponent {
  private readonly destroyRef = inject(DestroyRef);

  /** When set, overrides lab fixture account metadata. */
  readonly accountOverride = input<ContentSpokeAccount | null>(null, { alias: 'account' });
  /** When set, overrides lab fixture clusters (e.g. from content plan). */
  readonly clustersOverride = input<SpokeCluster[] | null>(null, { alias: 'clusters' });
  /** Compact layout for home strategy embed — hides chrome and detail panel. */
  readonly embedded = input(false);
  readonly showViewToggle = input(true);
  /** Radial / replay bar above the graph in embedded mode. Off in strategy home embed. */
  readonly showToolbar = input(true);
  readonly initialView = input<SpokeView>('radial');
  /** Fired when a graph node is clicked (always emitted in embedded mode). */
  readonly nodeSelected = output<SpokeNode>();

  readonly account = computed(() => this.accountOverride() ?? CONTENT_SPOKE_ACCOUNT);
  readonly clusters = computed(() => this.clustersOverride() ?? CONTENT_SPOKE_CLUSTERS);
  readonly legend = CONTENT_SPOKE_LEGEND;

  readonly geo = computed(() => (this.embedded() ? EMBEDDED_GEO : FULL_GEO));

  readonly view = signal<SpokeView>('radial');
  readonly mounted = signal(true);

  readonly selectedNodeId = signal<string | null>(null);
  readonly activeClusterId = signal<string | null>(null);

  readonly rotY = signal(0.6);
  readonly rotX = signal(-0.32);
  private dragging = false;
  private autoRotate = true;
  private lastPointer: { x: number; y: number } | null = null;
  private rafId: number | null = null;

  // --- Rubik's cube state ---
  readonly cubeClock = signal(0);
  private readonly cubeUnit = 13;
  private readonly cubeStickerHalf = 5.4;
  private cubeStickers: CubeSticker[] = [];
  private cubeMoves: CubeMove[] = [];
  private cubeMoveIdx = 0;
  private cubeMoveStart = 0;
  private cubeStarted = false;
  private turnAxis: 0 | 1 | 2 | null = null;
  private turnLayer = 0;
  private turnDir: 1 | -1 = 1;
  private turnAngle = 0;

  readonly hub = computed(() => {
    const { viewSize } = this.geo();
    return {
      cx: viewSize / 2,
      cy: viewSize / 2,
    };
  });

  readonly placedNodes = computed(() => this.layoutNodes());
  readonly nodeBox = computed(() => {
    const articleCount =
      this.clusters().find((cluster) => cluster.id === 'articles')?.nodes.length ?? 0;
    const denseArticles = this.embedded() && articleCount > 6;
    const w = this.embedded() ? (denseArticles ? 98 : 112) : 152;
    const h = this.embedded() ? (denseArticles ? 44 : 48) : 56;
    return { w, h, halfW: w / 2, halfH: h / 2 };
  });
  readonly clusterArcs = computed(() => this.layoutClusterArcs());

  private readonly neuralBase = computed(() => this.buildNeural());

  readonly projectedNodes = computed<ProjectedNode3D[]>(() => {
    const { focal, sphereRadius } = this.geo();
    const rotY = this.rotY();
    const rotX = this.rotX();
    const { cx, cy } = this.hub();
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const f = focal;
    const r = sphereRadius;

    return this.neuralBase()
      .nodes.map((n) => {
        const rx = n.bx * cosY - n.bz * sinY;
        const rz = n.bx * sinY + n.bz * cosY;
        const ry = n.by * cosX - rz * sinX;
        const z = n.by * sinX + rz * cosX;
        const scale = f / (f - z);
        const depth = (z + r) / (2 * r);
        return {
          ...n,
          x: cx + rx * scale,
          y: cy + ry * scale,
          z,
          scale,
          opacity: 0.32 + depth * 0.68,
        };
      })
      .sort((a, b) => a.z - b.z);
  });

  readonly projectedEdges = computed<ProjectedEdge3D[]>(() => {
    const { sphereRadius } = this.geo();
    const projected = this.projectedNodes();
    const { cx, cy } = this.hub();
    const byOrder = new Map<number, ProjectedNode3D>();
    for (const p of projected) {
      byOrder.set(p.order, p);
    }

    const edges: ProjectedEdge3D[] = [];
    for (const edge of this.neuralBase().edges) {
      const to = byOrder.get(edge.b);
      if (!to) {
        continue;
      }
      const from = edge.hub ? null : byOrder.get(edge.a);
      if (!edge.hub && !from) {
        continue;
      }
      const x1 = from ? from.x : cx;
      const y1 = from ? from.y : cy;
      const z = from ? (from.z + to.z) / 2 : to.z;
      const depth = (z + sphereRadius) / (2 * sphereRadius);
      edges.push({
        x1,
        y1,
        x2: to.x,
        y2: to.y,
        color: edge.cluster.color,
        opacity: (edge.hub ? 0.16 : 0.3) + depth * 0.35,
        width: (edge.hub ? 0.8 : 1.2) * (0.6 + depth * 0.8),
        hub: edge.hub,
        z,
      });
    }
    return edges.sort((a, b) => a.z - b.z);
  });

  readonly hubProjected = computed(() => {
    const { cx, cy } = this.hub();
    return { x: cx, y: cy };
  });

  readonly cubeFaces = computed<ProjectedSticker[]>(() => {
    this.cubeClock();
    const { focal } = this.geo();
    const rotY = this.rotY();
    const rotX = this.rotX();
    const { cx, cy } = this.hub();
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const f = focal;
    const unit = this.cubeUnit;
    const half = unit / 2;
    const hs = this.cubeStickerHalf;

    const project = (v: Vec3): { sx: number; sy: number; z: number } => {
      const rx = v[0] * cosY - v[2] * sinY;
      const rz = v[0] * sinY + v[2] * cosY;
      const ry = v[1] * cosX - rz * sinX;
      const z = v[1] * sinX + rz * cosX;
      const scale = f / (f - z);
      return { sx: cx + rx * scale, sy: cy + ry * scale, z };
    };

    const out: ProjectedSticker[] = [];

    for (const sticker of this.cubeStickers) {
      const inTurn = this.turnAxis !== null && sticker.p[this.turnAxis] === this.turnLayer;
      const ang = inTurn ? this.turnAngle : 0;

      let normal: Vec3 = sticker.n;
      if (inTurn) {
        normal = this.rotateAxis(normal, this.turnAxis as number, ang);
      }
      const rn = this.rotateGlobal(normal, cosY, sinY, cosX, sinX);
      if (rn[2] <= 0.02) {
        continue;
      }

      const center: Vec3 = [
        sticker.p[0] * unit + sticker.n[0] * half,
        sticker.p[1] * unit + sticker.n[1] * half,
        sticker.p[2] * unit + sticker.n[2] * half,
      ];
      const [u, v] = this.planeBasis(sticker.n);

      const corners: Vec3[] = [
        [center[0] + u[0] * hs + v[0] * hs, center[1] + u[1] * hs + v[1] * hs, center[2] + u[2] * hs + v[2] * hs],
        [center[0] + u[0] * hs - v[0] * hs, center[1] + u[1] * hs - v[1] * hs, center[2] + u[2] * hs - v[2] * hs],
        [center[0] - u[0] * hs - v[0] * hs, center[1] - u[1] * hs - v[1] * hs, center[2] - u[2] * hs - v[2] * hs],
        [center[0] - u[0] * hs + v[0] * hs, center[1] - u[1] * hs + v[1] * hs, center[2] - u[2] * hs + v[2] * hs],
      ];

      let zSum = 0;
      const pts = corners
        .map((corner) => {
          const turned = inTurn ? this.rotateAxis(corner, this.turnAxis as number, ang) : corner;
          const pr = project(turned);
          zSum += pr.z;
          return `${pr.sx.toFixed(1)},${pr.sy.toFixed(1)}`;
        })
        .join(' ');

      const z = zSum / 4;
      const depth = (z + 70) / 140;
      out.push({
        points: pts,
        color: sticker.color,
        opacity: 0.55 + Math.max(0, Math.min(1, depth)) * 0.45,
        z,
      });
    }

    return out.sort((a, b) => a.z - b.z);
  });

  readonly selectedNode = computed(() => {
    const id = this.selectedNodeId();
    if (!id) {
      return null;
    }
    return this.placedNodes().find((p) => p.node.id === id) ?? null;
  });

  constructor() {
    this.initCube();
    this.cubeMoves = this.buildPlaylist();

    effect(() => {
      this.view.set(this.initialView());
    });

    effect((onCleanup) => {
      const isNeural = this.view() === 'neural';
      if (!isNeural) {
        this.stopLoop();
        return;
      }
      this.startLoop();
      onCleanup(() => this.stopLoop());
    });

    this.destroyRef.onDestroy(() => this.stopLoop());
  }

  setView(view: SpokeView): void {
    if (this.view() === view) {
      return;
    }
    this.view.set(view);
    this.replay();
  }

  replay(): void {
    if (this.embedded()) {
      return;
    }
    this.mounted.set(false);
    setTimeout(() => this.mounted.set(true), 40);
  }

  isRadialNodeInteractive(placed: PlacedNode): boolean {
    return !this.embedded() || placed.node.kind === 'article';
  }

  nodeTransform(placed: PlacedNode): string {
    return `translate(${placed.x}, ${placed.y})`;
  }

  truncatedLabel(label: string, max: number): string {
    const trimmed = label.trim();
    return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
  }

  onNodeClick(event: MouseEvent, node: SpokeNode): void {
    event.stopPropagation();
    this.selectNode(node.id, node);
  }

  selectNode(id: string, nodeHint?: SpokeNode): void {
    const placed = this.placedNodes().find((entry) => entry.node.id === id);
    const node =
      nodeHint ??
      placed?.node ??
      this.clusters()
        .flatMap((cluster) => cluster.nodes)
        .find((entry) => entry.id === id);
    if (!node) {
      return;
    }

    if (this.embedded()) {
      this.selectedNodeId.set(id);
      this.nodeSelected.emit(node);
      return;
    }

    this.selectedNodeId.update((current) => (current === id ? null : id));
  }

  hoverCluster(id: string | null): void {
    this.activeClusterId.set(id);
  }

  isNodeSelected(id: string): boolean {
    return this.selectedNodeId() === id;
  }

  isClusterActive(id: string): boolean {
    const active = this.activeClusterId();
    return active === null || active === id;
  }

  nodeClass(node: SpokeNode): string {
    return `spoke-node--${node.status ?? 'gap'}`;
  }

  statusLabel(status?: SpokeNode['status']): string {
    if (!status) return 'Gap';
    if (status === 'ranking') return 'Ranking';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  // --- pointer drag (3D) ---
  onPointerDown(event: PointerEvent): void {
    this.dragging = true;
    this.autoRotate = false;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    (event.target as Element).setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging || !this.lastPointer) {
      return;
    }
    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.rotY.update((v) => v + dx * 0.006);
    this.rotX.update((v) => Math.max(-1.0, Math.min(1.0, v - dy * 0.005)));
  }

  onPointerUp(): void {
    this.dragging = false;
    this.lastPointer = null;
    setTimeout(() => (this.autoRotate = true), 1400);
  }

  // --- animation loop ---
  private startLoop(): void {
    if (this.rafId !== null) {
      return;
    }
    const tick = () => {
      if (this.autoRotate && !this.dragging) {
        this.rotY.update((v) => v + 0.0034);
      }
      this.tickCube(performance.now());
      this.cubeClock.set(performance.now());
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  // --- radial layout ---
  /** Stagger article nodes on inner/outer rings when the calendar is dense. */
  private radialRadiusFactor(
    clusterId: string,
    nodeCount: number,
    index: number,
    linearT: number,
  ): number {
    if (clusterId !== 'articles' || nodeCount <= 5) {
      return 0.35 + linearT * 0.55;
    }
    const ringIndex = Math.floor(index / 2);
    const ringCount = Math.ceil(nodeCount / 2);
    const ringT = ringCount <= 1 ? 0.5 : ringIndex / (ringCount - 1);
    const isOuter = index % 2 === 1;
    return isOuter ? 0.56 + ringT * 0.34 : 0.3 + ringT * 0.24;
  }

  private layoutClusterArcs(): { cluster: SpokeCluster; path: string }[] {
    const { innerRadius, outerRadius, wedgeOuterPad } = this.geo();
    const { cx, cy } = this.hub();
    return this.clusters().map((cluster) => ({
      cluster,
      path: this.describeWedge(cx, cy, innerRadius - 8, outerRadius + wedgeOuterPad, cluster.startAngle, cluster.endAngle),
    }));
  }

  private layoutNodes(): PlacedNode[] {
    const { innerRadius, outerRadius, hubRadius } = this.geo();
    const { cx, cy } = this.hub();
    const placed: PlacedNode[] = [];
    let order = 0;

    for (const cluster of this.clusters()) {
      const nodes = cluster.nodes;
      const span = this.normalizeSpan(cluster.startAngle, cluster.endAngle);
      const step = nodes.length <= 1 ? 0 : span / (nodes.length - 1);

      nodes.forEach((node, index) => {
        const t = nodes.length <= 1 ? 0.5 : index / (nodes.length - 1);
        const angle = cluster.startAngle + step * index;
        const radiusFactor = this.radialRadiusFactor(cluster.id, nodes.length, index, t);
        const radius = innerRadius + (outerRadius - innerRadius) * radiusFactor;
        const pos = this.polar(cx, cy, radius, angle);
        const elbow = this.polar(cx, cy, hubRadius + 24 + t * 28, angle);
        placed.push({
          node,
          cluster,
          order: order++,
          x: pos.x,
          y: pos.y,
          angle,
          path: `M ${cx} ${cy} Q ${elbow.x} ${elbow.y} ${pos.x} ${pos.y}`,
        });
      });
    }

    return placed;
  }

  // --- 3D orbital layout (sun + planets) ---
  private get pillarCluster(): SpokeCluster | undefined {
    return this.clusters().find((c) => c.id === 'pillars');
  }

  private get articleCluster(): SpokeCluster | undefined {
    return this.clusters().find((c) => c.id === 'articles');
  }

  private keywordSections(): { cluster: SpokeCluster; start: number; end: number }[] {
    const kw = this.clusters().filter((c) => c.id !== 'pillars' && c.id !== 'articles');
    const span = (360 - SECTION_GAP * kw.length) / kw.length;
    return kw.map((cluster, si) => {
      const start = si * (span + SECTION_GAP) + SECTION_GAP / 2 - 90;
      return { cluster, start, end: start + span };
    });
  }

  private buildNeural(): { nodes: BaseNode3D[]; edges: Edge3D[] } {
    const { orbitPillar, orbitArticle, orbitKeyword } = this.geo();
    const nodes: BaseNode3D[] = [];
    const edges: Edge3D[] = [];
    let order = 0;

    const place = (node: SpokeNode, cluster: SpokeCluster, radius: number, angleDeg: number, hub: boolean): void => {
      const a = angleDeg * DEG2RAD;
      nodes.push({
        node,
        cluster,
        order,
        bx: Math.cos(a) * radius,
        by: 0,
        bz: Math.sin(a) * radius,
      });
      edges.push({ a: -1, b: order, cluster, hub });
      order++;
    };

    const pillars = this.pillarCluster;
    if (pillars) {
      const n = pillars.nodes.length;
      pillars.nodes.forEach((node, i) => place(node, pillars, orbitPillar, (i / n) * 360 - 90, true));
    }

    const articles = this.articleCluster;
    if (articles) {
      const n = articles.nodes.length;
      articles.nodes.forEach((node, i) => place(node, articles, orbitArticle, (i / n) * 360 - 54, true));
    }

    for (const section of this.keywordSections()) {
      const span = section.end - section.start;
      const pad = span * 0.14;
      const cnt = section.cluster.nodes.length;
      section.cluster.nodes.forEach((node, ni) => {
        const t = cnt <= 1 ? 0.5 : ni / (cnt - 1);
        const angle = section.start + pad + t * (span - 2 * pad);
        place(node, section.cluster, orbitKeyword, angle, false);
      });
    }

    return { nodes, edges };
  }

  private projectXZ(
    radius: number,
    angleDeg: number,
    cosY: number,
    sinY: number,
    cosX: number,
    sinX: number,
  ): { x: number; y: number; z: number } {
    const { focal } = this.geo();
    const a = angleDeg * DEG2RAD;
    const bx = Math.cos(a) * radius;
    const bz = Math.sin(a) * radius;
    const rx = bx * cosY - bz * sinY;
    const rz = bx * sinY + bz * cosY;
    const ry = -rz * sinX;
    const z = rz * cosX;
    const scale = focal / (focal - z);
    const { cx, cy } = this.hub();
    return { x: cx + rx * scale, y: cy + ry * scale, z };
  }

  private orbitTrig(): { cosY: number; sinY: number; cosX: number; sinX: number } {
    const rotY = this.rotY();
    const rotX = this.rotX();
    return {
      cosY: Math.cos(rotY),
      sinY: Math.sin(rotY),
      cosX: Math.cos(rotX),
      sinX: Math.sin(rotX),
    };
  }

  readonly orbitRings = computed<{ d: string; radius: number }[]>(() => {
    const { orbitPillar, orbitArticle, orbitKeyword } = this.geo();
    const { cosY, sinY, cosX, sinX } = this.orbitTrig();
    return [orbitPillar, orbitArticle, orbitKeyword].map((radius) => {
      let d = '';
      for (let deg = 0; deg <= 360; deg += 5) {
        const p = this.projectXZ(radius, deg, cosY, sinY, cosX, sinX);
        d += `${deg === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
      }
      return { d: d + 'Z', radius };
    });
  });

  readonly sectionArcs = computed<{ cluster: SpokeCluster; d: string; lx: number; ly: number }[]>(() => {
    const { orbitKeyword } = this.geo();
    const { cosY, sinY, cosX, sinX } = this.orbitTrig();
    return this.keywordSections().map((section) => {
      let d = '';
      let first = true;
      for (let deg = section.start; deg <= section.end; deg += 3) {
        const p = this.projectXZ(orbitKeyword + 12, deg, cosY, sinY, cosX, sinX);
        d += `${first ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
        first = false;
      }
      const mid = this.projectXZ(orbitKeyword + 30, (section.start + section.end) / 2, cosY, sinY, cosX, sinX);
      return { cluster: section.cluster, d, lx: mid.x, ly: mid.y };
    });
  });

  private rand(seed: number): number {
    const x = Math.sin(seed * 999.13) * 43758.5453;
    return x - Math.floor(x);
  }

  // --- Rubik's cube ---
  private initCube(): void {
    const stickers: CubeSticker[] = [];
    for (const face of CUBE_FACES) {
      const axis = face.n.findIndex((c) => c !== 0);
      const sign = face.n[axis];
      const others = [0, 1, 2].filter((a) => a !== axis);
      for (const a of [-1, 0, 1]) {
        for (const b of [-1, 0, 1]) {
          const p: Vec3 = [0, 0, 0];
          p[axis] = sign;
          p[others[0]] = a;
          p[others[1]] = b;
          stickers.push({ p, n: [...face.n] as Vec3, color: face.color });
        }
      }
    }
    this.cubeStickers = stickers;
  }

  private buildPlaylist(): CubeMove[] {
    const scramble = this.randomScramble(16);
    const pause = (duration: number): CubeMove => ({ axis: null, layer: 0, dir: 1, duration });
    const scrambleFast: CubeMove[] = scramble.map((m) => ({ ...m, duration: 0.14 }));
    const solution: CubeMove[] = scramble
      .slice()
      .reverse()
      .map((m) => ({ axis: m.axis, layer: m.layer, dir: (m.dir * -1) as 1 | -1, duration: 0.32 }));

    return [pause(0.7), ...scrambleFast, pause(0.45), ...solution, pause(1.5)];
  }

  private randomScramble(count: number): CubeMove[] {
    const moves: CubeMove[] = [];
    let prevAxis = -1;
    for (let i = 0; i < count; i++) {
      let axis = Math.floor(this.rand(i * 7.3 + 1.1) * 3);
      if (axis === prevAxis) {
        axis = (axis + 1) % 3;
      }
      prevAxis = axis;
      const layer = this.rand(i * 3.7 + 2.9) > 0.5 ? 1 : -1;
      const dir: 1 | -1 = this.rand(i * 5.1 + 4.3) > 0.5 ? 1 : -1;
      moves.push({ axis: axis as 0 | 1 | 2, layer, dir, duration: 0.32 });
    }
    return moves;
  }

  private tickCube(nowMs: number): void {
    if (!this.cubeStarted) {
      this.cubeStarted = true;
      this.cubeMoveStart = nowMs;
      this.cubeMoveIdx = 0;
    }

    const move = this.cubeMoves[this.cubeMoveIdx];
    const elapsed = nowMs - this.cubeMoveStart;
    const durMs = move.duration * 1000;

    if (move.axis === null) {
      this.turnAxis = null;
      this.turnAngle = 0;
    } else {
      this.turnAxis = move.axis;
      this.turnLayer = move.layer;
      this.turnDir = move.dir;
      const t = Math.min(elapsed / durMs, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.turnAngle = eased * (Math.PI / 2) * move.dir;
    }

    if (elapsed >= durMs) {
      if (move.axis !== null) {
        this.commitMove(move);
      }
      this.turnAxis = null;
      this.turnAngle = 0;
      this.cubeMoveStart = nowMs;
      this.cubeMoveIdx++;
      if (this.cubeMoveIdx >= this.cubeMoves.length) {
        this.cubeMoves = this.buildPlaylist();
        this.cubeMoveIdx = 0;
      }
    }
  }

  private commitMove(move: CubeMove): void {
    if (move.axis === null) {
      return;
    }
    const axis = move.axis;
    for (const sticker of this.cubeStickers) {
      if (sticker.p[axis] === move.layer) {
        sticker.p = this.rotateAxisInt(sticker.p, axis, move.dir);
        sticker.n = this.rotateAxisInt(sticker.n, axis, move.dir);
      }
    }
  }

  private rotateAxis(v: Vec3, axis: number, ang: number): Vec3 {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const [x, y, z] = v;
    if (axis === 0) {
      return [x, y * c - z * s, y * s + z * c];
    }
    if (axis === 1) {
      return [x * c + z * s, y, -x * s + z * c];
    }
    return [x * c - y * s, x * s + y * c, z];
  }

  private rotateAxisInt(v: Vec3, axis: number, dir: number): Vec3 {
    const r = this.rotateAxis(v, axis, (dir * Math.PI) / 2);
    return [Math.round(r[0]), Math.round(r[1]), Math.round(r[2])];
  }

  private rotateGlobal(v: Vec3, cosY: number, sinY: number, cosX: number, sinX: number): Vec3 {
    const rx = v[0] * cosY - v[2] * sinY;
    const rz = v[0] * sinY + v[2] * cosY;
    const ry = v[1] * cosX - rz * sinX;
    const z = v[1] * sinX + rz * cosX;
    return [rx, ry, z];
  }

  private planeBasis(n: Vec3): [Vec3, Vec3] {
    if (Math.abs(n[0]) === 1) {
      return [
        [0, 1, 0],
        [0, 0, 1],
      ];
    }
    if (Math.abs(n[1]) === 1) {
      return [
        [1, 0, 0],
        [0, 0, 1],
      ];
    }
    return [
      [1, 0, 0],
      [0, 1, 0],
    ];
  }

  private polar(cx: number, cy: number, radius: number, angleDeg: number): { x: number; y: number } {
    const rad = (angleDeg - 90) * DEG2RAD;
    return {
      x: cx + Math.cos(rad) * radius,
      y: cy + Math.sin(rad) * radius,
    };
  }

  private normalizeSpan(start: number, end: number): number {
    if (end >= start) {
      return end - start;
    }
    return 360 - start + end;
  }

  private describeWedge(
    cx: number,
    cy: number,
    innerR: number,
    outerR: number,
    startAngle: number,
    endAngle: number,
  ): string {
    const start = this.polar(cx, cy, outerR, startAngle);
    const end = this.polar(cx, cy, outerR, endAngle);
    const innerStart = this.polar(cx, cy, innerR, startAngle);
    const innerEnd = this.polar(cx, cy, innerR, endAngle);
    const span = this.normalizeSpan(startAngle, endAngle);
    const largeArc = span > 180 ? 1 : 0;

    return [
      `M ${innerStart.x} ${innerStart.y}`,
      `L ${start.x} ${start.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      'Z',
    ].join(' ');
  }
}
