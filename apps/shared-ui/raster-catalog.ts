/** Exact production sizes from the approved asset manifest. No masters are served. */
export const illustrationCatalog = {
  'hero/welcome-learn': {
    position: 'right center',
    variants: [[480, 160, '/foxmind-3d/hero/welcome-learn-480.webp'], [960, 320, '/foxmind-3d/hero/welcome-learn-960.webp'], [1600, 533, '/foxmind-3d/hero/welcome-learn.webp']],
  },
  'hero/welcome-teach': {
    position: 'right center',
    variants: [[480, 160, '/foxmind-3d/hero/welcome-teach-480.webp'], [960, 320, '/foxmind-3d/hero/welcome-teach-960.webp'], [1600, 533, '/foxmind-3d/hero/welcome-teach.webp']],
  },
  'scenes/auth': {
    position: 'center',
    variants: [[320, 400, '/foxmind-3d/scenes/auth-320.webp'], [640, 800, '/foxmind-3d/scenes/auth-640.webp'], [960, 1200, '/foxmind-3d/scenes/auth.webp']],
  },
  'scenes/profile': {
    position: 'center',
    variants: [[320, 400, '/foxmind-3d/scenes/profile-320.webp'], [640, 800, '/foxmind-3d/scenes/profile-640.webp'], [960, 1200, '/foxmind-3d/scenes/profile.webp']],
  },
  'scenes/security': {
    position: 'center',
    variants: [[320, 320, '/foxmind-3d/scenes/security-320.webp'], [640, 640, '/foxmind-3d/scenes/security-640.webp'], [960, 960, '/foxmind-3d/scenes/security.webp']],
  },
  'scenes/agenda': {
    position: 'center',
    variants: [[320, 213, '/foxmind-3d/scenes/agenda-320.webp'], [640, 427, '/foxmind-3d/scenes/agenda-640.webp'], [960, 640, '/foxmind-3d/scenes/agenda.webp']],
  },
  'states/empty': {
    position: 'center',
    variants: [[160, 160, '/foxmind-3d/states/empty-160.webp'], [320, 320, '/foxmind-3d/states/empty-320.webp'], [640, 640, '/foxmind-3d/states/empty.webp']],
  },
  'states/success': {
    position: 'center',
    variants: [[160, 160, '/foxmind-3d/states/success-160.webp'], [320, 320, '/foxmind-3d/states/success-320.webp'], [640, 640, '/foxmind-3d/states/success.webp']],
  },
  'states/unavailable': {
    position: 'center',
    variants: [[160, 160, '/foxmind-3d/states/unavailable-160.webp'], [320, 320, '/foxmind-3d/states/unavailable-320.webp'], [640, 640, '/foxmind-3d/states/unavailable.webp']],
  },
  'covers/literature': {
    position: 'center',
    variants: [[320, 213, '/foxmind-3d/covers/literature-320.webp'], [640, 427, '/foxmind-3d/covers/literature-640.webp'], [1200, 800, '/foxmind-3d/covers/literature.webp']],
  },
  'covers/math': {
    position: 'center',
    variants: [[320, 213, '/foxmind-3d/covers/math-320.webp'], [640, 427, '/foxmind-3d/covers/math-640.webp'], [1200, 800, '/foxmind-3d/covers/math.webp']],
  },
  'covers/biology': {
    position: 'center',
    variants: [[320, 213, '/foxmind-3d/covers/biology-320.webp'], [640, 427, '/foxmind-3d/covers/biology-640.webp'], [1200, 800, '/foxmind-3d/covers/biology.webp']],
  },
  'covers/society': {
    position: 'center',
    variants: [[320, 213, '/foxmind-3d/covers/society-320.webp'], [640, 427, '/foxmind-3d/covers/society-640.webp'], [1200, 800, '/foxmind-3d/covers/society.webp']],
  },
  'covers/science': {
    position: 'center',
    variants: [[320, 213, '/foxmind-3d/covers/science-320.webp'], [640, 427, '/foxmind-3d/covers/science-640.webp'], [1200, 800, '/foxmind-3d/covers/science.webp']],
  },
  'covers/creative': {
    position: 'center',
    variants: [[320, 213, '/foxmind-3d/covers/creative-320.webp'], [640, 427, '/foxmind-3d/covers/creative-640.webp'], [1200, 800, '/foxmind-3d/covers/creative.webp']],
  },
  'covers/general': {
    position: 'center',
    variants: [[320, 213, '/foxmind-3d/covers/general-320.webp'], [640, 427, '/foxmind-3d/covers/general-640.webp'], [1200, 800, '/foxmind-3d/covers/general.webp']],
  },
} as const;

export type IllustrationKey = keyof typeof illustrationCatalog;
