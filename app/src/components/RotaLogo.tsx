import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tokens } from '../theme/tokens';

export interface RotaLogoProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * Modern geometric vector brand mark for Rota.
 * Features an interlocking, rotational 'R' lettermark symbolizing seamless
 * shift handovers, team coordination, and continuous calendar cycles.
 */
export function RotaLogo({ size = 48, style }: RotaLogoProps): React.JSX.Element {
  const { colors } = useTheme();

  // Proportional scale factor normalized to baseline 48dp
  const scale = size / 48;

  return (
    <View
      style={[
        styles.squircleContainer,
        {
          width: size,
          height: size,
          borderRadius: Math.round(14 * scale),
          backgroundColor: colors['primary-color'],
          ...tokens.elevation[2]
        },
        style
      ]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {/* Precision Geometric 'R' & Rotational Arc Vector Construction */}
      <View style={[styles.markWrapper, { width: 30 * scale, height: 32 * scale }]}>
        {/* Backbone Vertical Stem */}
        <View
          style={[
            styles.stem,
            {
              width: 5.5 * scale,
              height: 27 * scale,
              borderRadius: 3 * scale,
              backgroundColor: '#FFFFFF',
              left: 2 * scale,
              top: 2.5 * scale
            }
          ]}
        />

        {/* Upper Rotational Orbit Loop */}
        <View
          style={[
            styles.upperLoop,
            {
              width: 19 * scale,
              height: 16 * scale,
              borderTopRightRadius: 8.5 * scale,
              borderBottomRightRadius: 8.5 * scale,
              borderTopLeftRadius: 4 * scale,
              borderBottomLeftRadius: 4 * scale,
              borderWidth: 4.8 * scale,
              borderLeftWidth: 0,
              borderColor: '#FFFFFF',
              left: 5 * scale,
              top: 2.5 * scale
            }
          ]}
        />

        {/* Dynamic Forward Shift Kick Leg (Sweeping forward motion) */}
        <View
          style={[
            styles.kickLeg,
            {
              width: 5 * scale,
              height: 16 * scale,
              borderRadius: 2.5 * scale,
              backgroundColor: '#BAE6FD', // Sky cyan accent to create layered depth
              left: 16.5 * scale,
              top: 13.5 * scale,
              transform: [{ rotate: '-32deg' }]
            }
          ]}
        />

        {/* Focal Shift Handoff Pivot Point */}
        <View
          style={[
            styles.pivotDot,
            {
              width: 3.5 * scale,
              height: 3.5 * scale,
              borderRadius: 2 * scale,
              backgroundColor: '#E0F2FE',
              left: 12 * scale,
              top: 8 * scale
            }
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  squircleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  markWrapper: {
    position: 'relative'
  },
  stem: {
    position: 'absolute'
  },
  upperLoop: {
    position: 'absolute'
  },
  kickLeg: {
    position: 'absolute'
  },
  pivotDot: {
    position: 'absolute'
  }
});
