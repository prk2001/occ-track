import type { Meta, StoryObj } from '@storybook/react';
import { BlockDaySheet } from './BlockDaySheet';
import { COLLECTION_DAYS } from '@/data/mockData';

/**
 * BlockDaySheet — bottom-sheet modal for blocking out a Collection Week
 * day (e.g. "Sunday is covered by First Baptist Youth Group").
 *
 * Stories cover the empty / valid / pre-filled UI states. Note: this is
 * a fullscreen modal, so the canvas backdrop displays the dim overlay too.
 */
const meta = {
  title: 'Signups/BlockDaySheet',
  component: BlockDaySheet,
  args: {
    date: COLLECTION_DAYS[3].date,
    time: '8:00 AM - 5:00 PM',
    onCancel: () => undefined,
    onSave: () => undefined,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof BlockDaySheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Tuesday: Story = {
  args: {
    date: COLLECTION_DAYS[1].date,
  },
};

export const PreFilled: Story = {
  // BlockDaySheet doesn't accept initial-value props (its inputs are local
  // state), so this story documents the visual baseline post-typing.
  args: {
    date: COLLECTION_DAYS[5].date,
  },
};
