import type { SheriffConfig } from '@softarc/sheriff-core';

export const config: SheriffConfig = {
  version: 1,
  enableBarrelLess: true,
  excludeRoot: true,
  modules: {
    'src/environments': 'root',
    'src/app': {
      core: 'type:util',
      layout: 'type:shell',
      shared: {
        ui: 'type:ui',
      },
      features: {
        '<feature>': 'type:feature',
      },
    },
  },
  depRules: {
    root: '*',
    'type:feature': ['type:ui', 'type:util', 'root'],
    'type:ui': ['type:util', 'root'],
    'type:shell': ['type:util', 'root'],
    'type:util': ['root'],
  },
};
