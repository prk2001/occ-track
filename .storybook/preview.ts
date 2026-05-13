import type { Preview } from '@storybook/react';

// Pull in the global Tailwind layer so stories render with the same fonts,
// colors, and spacing primitives as the live app.
import '../src/index.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'cream',
      values: [
        { name: 'cream', value: '#F4EDE0' },
        { name: 'card', value: '#FFFFFF' },
        { name: 'navy', value: '#0F172A' },
      ],
    },
    layout: 'padded',
    controls: { expanded: true },
  },
};

export default preview;
