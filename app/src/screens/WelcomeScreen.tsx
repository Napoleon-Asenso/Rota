import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  TouchableOpacity
} from 'react-native';
import { tokens } from '../theme/tokens';
import { Text } from '../components/Text';
import { RotaLogo } from '../components/RotaLogo';
import { useAppStore } from '../storage/store';

/**
 * Splash & Welcome Onboarding Screen.
 * Replicates the motion choreography from the inspiration video:
 * 1. Centered Splash: Brand Logo pops & scales in with spring easing.
 * 2. Brand Wordmark slides out next to the logo.
 * 3. Smooth crossfade transition into Welcome experience.
 * 4. Concentric celestial/rotational shift orbits with accent nodes revolving continuously.
 * 5. Staggered bottom card entrance with "Welcome to Rota", legal agreement, and pill CTA buttons.
 *
 * Responsiveness & Interaction guarantees:
 * - Splash overlay completely unmounts upon animation completion so CTA buttons are directly clickable.
 * - Entire screen is strictly bounded to 100% height with overflow hidden to prevent any vertical bounce or blank white gaps.
 */
export function WelcomeScreen(): React.JSX.Element {
  const setCurrentScreenId = useAppStore((s) => s.setCurrentScreenId);

  // Unmount splash overlay completely once transition finishes
  const [isSplashActive, setIsSplashActive] = useState<boolean>(true);

  // Animated values for Phase 1: Centered Splash
  const splashLogoScale = useRef(new Animated.Value(0.4)).current;
  const splashLogoOpacity = useRef(new Animated.Value(0)).current;
  const splashWordmarkOpacity = useRef(new Animated.Value(0)).current;
  const splashWordmarkTranslateX = useRef(new Animated.Value(-14)).current;
  const splashContainerOpacity = useRef(new Animated.Value(1)).current;

  // Animated values for Phase 2: Welcome View & Orbitals
  const welcomeContainerOpacity = useRef(new Animated.Value(0)).current;
  const orbitalScale = useRef(new Animated.Value(0.88)).current;
  const orbitalRotation = useRef(new Animated.Value(0)).current;
  const bottomContentTranslateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';

    // Reset initial states
    splashLogoScale.setValue(0.4);
    splashLogoOpacity.setValue(0);
    splashWordmarkOpacity.setValue(0);
    splashWordmarkTranslateX.setValue(-14);
    splashContainerOpacity.setValue(1);
    welcomeContainerOpacity.setValue(0);
    orbitalScale.setValue(0.88);
    bottomContentTranslateY.setValue(28);

    // Continuous orbital rotation loop (independent 360deg spin)
    Animated.loop(
      Animated.timing(orbitalRotation, {
        toValue: 1,
        duration: 36000,
        easing: Easing.linear,
        useNativeDriver
      })
    ).start();

    // Choreographed entrance sequence matching the inspiration video
    Animated.sequence([
      // Step 1: Logo pops in (0ms - 500ms)
      Animated.parallel([
        Animated.timing(splashLogoOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver
        }),
        Animated.timing(splashLogoScale, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver
        })
      ]),

      // Step 2: Brand wordmark slides in from left (500ms - 900ms)
      Animated.parallel([
        Animated.timing(splashWordmarkOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver
        }),
        Animated.timing(splashWordmarkTranslateX, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver
        })
      ]),

      // Step 3: Hold centered splash for brand impact (~800ms)
      Animated.delay(800),

      // Step 4: Crossfade into the Welcome screen with orbital rings & buttons
      Animated.parallel([
        Animated.timing(splashContainerOpacity, {
          toValue: 0,
          duration: 450,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver
        }),
        Animated.timing(welcomeContainerOpacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver
        }),
        Animated.timing(orbitalScale, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver
        }),
        Animated.timing(bottomContentTranslateY, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver
        })
      ])
    ]).start(() => {
      // Unmount splash overlay completely once animation completes
      setIsSplashActive(false);
    });
  }, [
    splashLogoScale,
    splashLogoOpacity,
    splashWordmarkOpacity,
    splashWordmarkTranslateX,
    splashContainerOpacity,
    welcomeContainerOpacity,
    orbitalScale,
    orbitalRotation,
    bottomContentTranslateY
  ]);

  // Interpolate continuous rotation angle for background orbital rings
  const spinInterpolation = orbitalRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // Tap-to-skip splash handler
  const handleSkipSplash = (): void => {
    splashContainerOpacity.setValue(0);
    welcomeContainerOpacity.setValue(1);
    orbitalScale.setValue(1);
    bottomContentTranslateY.setValue(0);
    setIsSplashActive(false);
  };

  return (
    <View style={styles.root}>
      {/* ============================================================ */}
      {/* PHASE 2: WELCOME EXPERIENCE WITH ORBITAL ROTATION & BUTTONS  */}
      {/* ============================================================ */}
      <Animated.View
        style={[
          styles.welcomeLayer,
          {
            opacity: welcomeContainerOpacity
          }
        ]}
      >
        {/* Dynamic Celestial Shift Orbits (Continuous 360° Rotation in Top Space) */}
        <View
          style={styles.orbitalViewport}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Animated.View
            style={[
              styles.orbitalGroup,
              {
                transform: [
                  { scale: orbitalScale },
                  { rotate: spinInterpolation }
                ]
              }
            ]}
          >
            {/* Outer Orbit 4 */}
            <View style={styles.ringFour}>
              <View style={styles.nodeFourA} />
              <View style={styles.diamondFourB} />
            </View>

            {/* Orbit 3 */}
            <View style={styles.ringThree}>
              <View style={styles.nodeThreeA} />
              <View style={styles.diamondThreeB} />
            </View>

            {/* Orbit 2 */}
            <View style={styles.ringTwo}>
              <View style={styles.nodeTwoA} />
              <View style={styles.nodeTwoB} />
            </View>

            {/* Inner Orbit 1 */}
            <View style={styles.ringOne}>
              <View style={styles.nodeOne} />
            </View>

            {/* Center Rota Core Hub */}
            <View style={styles.coreHub}>
              <View style={styles.coreDot} />
            </View>
          </Animated.View>
        </View>

        {/* Bottom Content Area */}
        <Animated.View
          style={[
            styles.bottomArea,
            {
              transform: [{ translateY: bottomContentTranslateY }]
            }
          ]}
        >
          {/* Headline */}
          <Text
            weight="bold"
            variant="3xl"
            color="#FFFFFF"
            style={styles.welcomeHeadline}
            accessibilityRole="header"
          >
            Welcome to Rota
          </Text>

          {/* Legal / Terms Subtitle */}
          <Text
            variant="xs"
            color="rgba(255, 255, 255, 0.65)"
            style={styles.termsText}
          >
            By continuing, you agree to{' '}
            <Text variant="xs" weight="medium" color="#38BDF8">
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text variant="xs" weight="medium" color="#38BDF8">
              Privacy Policy
            </Text>
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            {/* Primary Pill Button: Create new account (Screen 2: Sign Up) */}
            <TouchableOpacity
              onPress={() => setCurrentScreenId(2)}
              style={styles.primaryPillButton}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Create new account"
            >
              <Text weight="bold" variant="base" color="#FFFFFF">
                Create new account
              </Text>
            </TouchableOpacity>

            {/* Secondary Dark Pill Button: Log In (Screen 3: Log In) */}
            <TouchableOpacity
              onPress={() => setCurrentScreenId(3)}
              style={styles.secondaryPillButton}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Log in to existing account"
            >
              <Text weight="semibold" variant="base" color="#F1F5F9">
                Log In
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>

      {/* ============================================================ */}
      {/* PHASE 1: INITIAL CENTERED SPLASH LOGO & WORDMARK REVEAL      */}
      {/* (Only mounted while splash is active; unmounts completely)   */}
      {/* ============================================================ */}
      {isSplashActive && (
        <Animated.View
          style={[
            styles.splashOverlay,
            {
              opacity: splashContainerOpacity
            }
          ]}
        >
          <TouchableOpacity
            style={styles.splashTapCatcher}
            activeOpacity={1}
            onPress={handleSkipSplash}
            accessibilityRole="button"
            accessibilityLabel="Skip intro animation"
          >
            <View style={styles.splashCenterCluster}>
              {/* 1. Logo Pops & Scales in */}
              <Animated.View
                style={{
                  transform: [{ scale: splashLogoScale }],
                  opacity: splashLogoOpacity
                }}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <RotaLogo size={52} />
              </Animated.View>

              {/* 2. Brand Wordmark Slides in horizontally */}
              <Animated.View
                style={{
                  opacity: splashWordmarkOpacity,
                  transform: [{ translateX: splashWordmarkTranslateX }]
                }}
              >
                <Text weight="bold" variant="4xl" color="#FFFFFF" style={styles.splashBrandText}>
                  Rota
                </Text>
              </Animated.View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: '100%',
    width: '100%',
    backgroundColor: '#070A10', // Deep cinematic background
    overflow: 'hidden'
  },
  // Phase 1: Splash Layer
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#070A10',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  splashTapCatcher: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  splashCenterCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing[3]
  },
  splashBrandText: {
    letterSpacing: -0.6
  },

  // Phase 2: Welcome Layer
  welcomeLayer: {
    flex: 1,
    height: '100%',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing[6],
    paddingTop: tokens.spacing[8],
    paddingBottom: tokens.spacing[8],
    overflow: 'hidden'
  },

  // Concentric Celestial Orbits Viewport (flex-1 contained without overflow)
  orbitalViewport: {
    flex: 1,
    minHeight: 180,
    maxHeight: 340,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  orbitalGroup: {
    width: 320,
    height: 320,
    justifyContent: 'center',
    alignItems: 'center'
  },

  // Orbit Rings
  ringFour: {
    position: 'absolute',
    width: 310,
    height: 310,
    borderRadius: 155,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.12)'
  },
  nodeFourA: {
    position: 'absolute',
    top: 42,
    left: 46,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#38BDF8'
  },
  diamondFourB: {
    position: 'absolute',
    bottom: 58,
    right: 48,
    width: 9,
    height: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.75)',
    transform: [{ rotate: '45deg' }]
  },

  ringThree: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.22)'
  },
  nodeThreeA: {
    position: 'absolute',
    top: 110,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#60A5FA'
  },
  diamondThreeB: {
    position: 'absolute',
    top: 32,
    left: 36,
    width: 7,
    height: 7,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    transform: [{ rotate: '45deg' }]
  },

  ringTwo: {
    position: 'absolute',
    width: 155,
    height: 155,
    borderRadius: 77.5,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.32)'
  },
  nodeTwoA: {
    position: 'absolute',
    top: -4,
    left: 74,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#38BDF8'
  },
  nodeTwoB: {
    position: 'absolute',
    bottom: 14,
    right: 22,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#60A5FA'
  },

  ringOne: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)'
  },
  nodeOne: {
    position: 'absolute',
    bottom: -3,
    left: 42,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#818CF8'
  },

  coreHub: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  coreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8'
  },

  // Bottom Content Area
  bottomArea: {
    width: '100%',
    alignItems: 'center',
    gap: tokens.spacing[2.5],
    paddingBottom: tokens.spacing[2]
  },
  welcomeHeadline: {
    textAlign: 'center',
    letterSpacing: -0.5
  },
  termsText: {
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
    marginBottom: tokens.spacing[2]
  },
  buttonsContainer: {
    width: '100%',
    gap: tokens.spacing[3]
  },

  // Primary Pill Button (52dp height for comfortable touch target)
  primaryPillButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: tokens.radius.full,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing[6],
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4
  },

  // Secondary Pill Button (52dp height)
  secondaryPillButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: tokens.radius.full,
    backgroundColor: '#111724',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing[6]
  }
});
