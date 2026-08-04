import { describe, expect, it } from 'vitest';
import {
  HOME_DASHBOARD_PATH,
  HOME_DISCOVERY_PATH,
  HOME_ONBOARDING_PATH,
  homeShellRouteKind,
} from './protopipe-home.routes';

describe('protopipe home routes', () => {
  it('maps shell paths to route kinds', () => {
    expect(homeShellRouteKind(HOME_DASHBOARD_PATH)).toBe('dashboard');
    expect(homeShellRouteKind(HOME_ONBOARDING_PATH)).toBe('onboarding');
    expect(homeShellRouteKind(HOME_DISCOVERY_PATH)).toBe('discovery');
    expect(homeShellRouteKind('/home')).toBe('entry');
    expect(homeShellRouteKind('/home/packs')).toBeNull();
  });
});
