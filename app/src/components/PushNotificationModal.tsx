import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  ViewStyle
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';
import { Text } from './Text';
import { RotaLogo } from './RotaLogo';
import { useAppStore } from '../storage/store';
import { X } from 'lucide-react-native';

export interface PushNotificationModalProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  body?: string;
  targetScreenId?: number;
  style?: ViewStyle;
}

/**
 * Screen 19 Component: PushNotificationModal
 * Interactive OS-style push notification banner simulation.
 * Features:
 * - App icon badge: "R" Rota icon
 * - Header: "ROTA" · "now"
 * - Title: "Shift approved"
 * - Body: "Your swap request for May 29 has been approved."
 * - Smooth slide-in from top animation
 * - Tapping banner deep-links to Shift Calendar (Screen 7)
 */
export function PushNotificationModal({
  visible,
  onDismiss,
  title = 'Shift approved',
  body = 'Your swap request for May 29 has been approved.',
  targetScreenId = 7, // Shift Calendar / Dashboard
  style
}: PushNotificationModalProps): React.JSX.Element | null {
  const { colors } = useTheme();
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: Platform.OS !== 'web',
          bounciness: 6,
          speed: 12
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web'
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web'
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: Platform.OS !== 'web'
        })
      ]).start();
    }
  }, [visible, translateY, opacity]);

  if (!visible) return null;

  const handleBannerPress = (): void => {
    onDismiss();
    setCurrentScreenId(targetScreenId);
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          transform: [{ translateY }],
          opacity
        },
        style
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`Push notification from Rota: ${title}. ${body}. Tap to open.`}
    >
      <Pressable
        onPress={handleBannerPress}
        style={({ pressed }) => [
          styles.bannerCard,
          {
            backgroundColor: colors['surface-container-lowest-color'],
            borderColor: colors['outline-variant-color'],
            opacity: pressed ? 0.92 : 1
          }
        ]}
      >
        {/* Banner Header: App Icon + Name + Timestamp */}
        <View style={styles.headerRow}>
          <View style={styles.appIdentity}>
            <RotaLogo size={20} />
            <Text
              weight="bold"
              variant="xs"
              color={colors['on-surface-color']}
              style={styles.appName}
            >
              ROTA
            </Text>
          </View>
          <View style={styles.rightHeaderCluster}>
            <Text variant="xs" color={colors['outline-color']}>
              now
            </Text>
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Dismiss notification"
              hitSlop={8}
              style={styles.closeBtn}
            >
              <X size={14} color={colors['outline-color']} />
            </Pressable>
          </View>
        </View>

        {/* Notification Content */}
        <View style={styles.bodyContent}>
          <Text
            weight="bold"
            variant="base"
            color={colors['on-surface-color']}
            style={styles.titleText}
          >
            {title}
          </Text>
          <Text
            variant="sm"
            color={colors['on-surface-variant-color']}
            style={styles.bodyText}
          >
            {body}
          </Text>
        </View>

        {/* Drag / Action Cue Bar */}
        <View style={styles.cueBarWrapper} importantForAccessibility="no">
          <View
            style={[styles.cueBar, { backgroundColor: colors['outline-variant-color'] }]}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: tokens.spacing[4],
    right: tokens.spacing[4],
    zIndex: 9999,
    alignItems: 'center'
  },
  bannerCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: tokens.radius.xl,
    paddingHorizontal: tokens.spacing[4],
    paddingTop: tokens.spacing[3],
    paddingBottom: tokens.spacing[2],
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
    gap: tokens.spacing[1.5]
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  appIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[2]
  },
  appName: {
    letterSpacing: 0.8
  },
  rightHeaderCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[2]
  },
  closeBtn: {
    padding: tokens.spacing[1]
  },
  bodyContent: {
    gap: tokens.spacing[0.5]
  },
  titleText: {
    letterSpacing: -0.2
  },
  bodyText: {
    lineHeight: 18
  },
  cueBarWrapper: {
    alignItems: 'center',
    paddingTop: tokens.spacing[1]
  },
  cueBar: {
    width: 36,
    height: 3,
    borderRadius: 1.5
  }
});

export default PushNotificationModal;
