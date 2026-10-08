import { useState } from 'react';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { RegionPicker, type RegionChoice } from './RegionPicker';

/**
 * Change country and currency from Profile. Mounted only while open, so it always starts from the
 * saved choice. Amounts are relabelled, never converted: FireBuddy has no exchange rates.
 */
export function RegionSheet({ initial, onClose, onSave }: { initial: RegionChoice; onClose: () => void; onSave: (choice: RegionChoice) => void }) {
  const [choice, setChoice] = useState<RegionChoice>(initial);
  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Country and currency"
      description="Changing currency relabels your amounts; it does not convert them."
      footer={<Button label="Save" variant="primary" block onPress={() => onSave(choice)} />}
    >
      <RegionPicker value={choice} onChange={setChoice} />
    </BottomSheet>
  );
}
