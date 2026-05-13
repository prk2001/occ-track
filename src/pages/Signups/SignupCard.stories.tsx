import type { Meta, StoryObj } from '@storybook/react';
import { SignupCard } from './SignupCard';
import type { StoredSignup } from '@/data/mockData';

const baseSignup: StoredSignup = {
  id: 'demo-1',
  name: 'Maria Rodriguez',
  email: 'maria.rodriguez@example.org',
  phone: '(404) 555-0123',
  zip: '30301',
  locationId: 'cdo1',
  firstTime: false,
  shirtSize: 'M',
  emergencyName: 'Carlos Rodriguez',
  emergencyPhone: '(404) 555-0124',
  notes: 'Available all week. Bringing my van.',
  submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  agree: true,
  editToken: 'demo-token-uuid-not-real',
};

/**
 * SignupCard — admin roster row. Phase 34a extraction. memo'd to keep
 * 100+ row lists snappy under search/sort/PII toggle.
 */
const meta = {
  title: 'Signups/SignupCard',
  component: SignupCard,
  args: {
    signup: baseSignup,
    onResendLink: () => undefined,
    onReissueLink: () => undefined,
    onTransfer: () => undefined,
    onRemove: () => undefined,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SignupCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FirstTimer: Story = {
  args: { signup: { ...baseSignup, firstTime: true, name: 'Sam Park' } },
};

export const Duplicate: Story = {
  args: { isDuplicate: true },
};

export const PiiBlurred: Story = {
  args: { isPiiBlurred: true, onToggleReveal: () => undefined },
};

export const SelfEdited: Story = {
  args: {
    signup: {
      ...baseSignup,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: 'self',
    },
  },
};
