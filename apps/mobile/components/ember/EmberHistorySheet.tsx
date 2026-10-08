import { conversationDateLabel } from '@firebuddy/shared';
import { MessageCircle, SquarePen, Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import type { EmberConversation } from '@/hooks/use-ember';
import { useTheme } from '@/lib/theme';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { PressOverlay } from '../ui/PressOverlay';
import { AppText } from '../ui/Text';

export interface EmberHistorySheetProps {
  open: boolean;
  conversations: readonly EmberConversation[];
  activeId: string;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNewChat: () => void;
  /** Asks to delete; the screen confirms first. */
  onDelete: (id: string) => void;
}

/** Past DouDou chats saved on this phone, newest first. Tap one to reopen it. Presentation only. */
export function EmberHistorySheet({ open, conversations, activeId, onClose, onOpen, onNewChat, onDelete }: EmberHistorySheetProps) {
  const { theme } = useTheme();
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Past chats"
      description="Saved on this phone only."
      footer={<Button label="New chat" icon={SquarePen} variant="primary" block onPress={onNewChat} />}
    >
      {conversations.length === 0 ? (
        <AppText variant="body" tone="ink2">No past chats yet.</AppText>
      ) : (
        <View style={styles.list}>
          {conversations.map((chat) => {
            const current = chat.id === activeId;
            const turns = chat.messages.filter((message) => message.role === 'user').length;
            return (
              <View key={chat.id} style={[styles.row, { borderColor: current ? theme.accent : theme.line, backgroundColor: current ? theme.accentSoft : theme.surface }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${chat.title}, ${conversationDateLabel(chat.updatedAt)}${current ? ', open now' : ''}`}
                  onPress={() => onOpen(chat.id)}
                  style={styles.open}
                >
                  {({ pressed }) => (
                    <>
                      <PressOverlay pressed={pressed} radius={radii.tile} />
                      <MessageCircle size={18} color={current ? theme.accentText : theme.ink3} strokeWidth={1.9} />
                      <View style={styles.copy}>
                        <AppText variant="bodySemibold" numberOfLines={1}>{chat.title}</AppText>
                        <AppText variant="caption" tone="ink2">
                          {conversationDateLabel(chat.updatedAt)} · {turns} question{turns === 1 ? '' : 's'}{current ? ' · Open now' : ''}
                        </AppText>
                      </View>
                    </>
                  )}
                </Pressable>
                <IconButton icon={Trash2} size="compact" tone="quiet" accessibilityLabel={`Delete ${chat.title}`} onPress={() => onDelete(chat.id)} />
              </View>
            );
          })}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.tile,
    borderWidth: 1,
    paddingRight: 4,
    overflow: 'hidden',
  },
  open: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingLeft: spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
