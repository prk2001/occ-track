import type { Meta, StoryObj } from '@storybook/react';
import { DayCard } from './DayCard';
import { COLLECTION_DAYS } from '@/data/mockData';

/**
 * DayCard — one cell in the Collection Week schedule grid on /signups.
 * Three primary states: Open, Blocked, Past.
 */
const meta = {
  title: 'Signups/DayCard',
  component: DayCard,
  args: {
    day: COLLECTION_DAYS[2],
    time: '8:00 AM - 5:00 PM',
    isToday: false,
    isPast: false,
    isEditingTime: false,
    onBlock: () => undefined,
    onReopen: () => undefined,
    onStartEditTime: () => undefined,
    onSaveTime: () => undefined,
    onCancelEditTime: () => undefined,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DayCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
export const Today: Story = { args: { isToday: true } };
export const Blocked: Story = {
  args: {
    block: {
      date: COLLECTION_DAYS[2].date,
      coveredBy: 'First Baptist Youth Group',
      note: '12 students + 3 chaperones',
      blockedAt: '2026-10-15T14:30:00Z',
    },
  },
};
export const Past: Story = { args: { isPast: true } };
export const EditingTime: Story = { args: { isEditingTime: true } };
