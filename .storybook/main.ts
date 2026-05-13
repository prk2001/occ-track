import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook config — minimal, framework-only.
 *
 * Pulls *.stories.tsx files from anywhere under src. Uses the project's
 * existing Vite config (path aliases, react plugin, plugin-inspect-react-code)
 * so stories render with the same module resolution as the live app.
 *
 * Phase 34e — added 3 starter stories for components extracted in 34a:
 *   - DayCard (Collection Week schedule cell)
 *   - SignupCard (admin roster row)
 *   - BlockDaySheet (block-out-a-day modal)
 *
 * Run locally:
 *   npx storybook dev -p 6006
 *
 * Add more stories: drop a `<ComponentName>.stories.tsx` next to the source.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|js|jsx)'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  addons: [],
};

export default config;
