import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { AppIcon } from './AppIcon';

interface WakeWordButtonProps {
  isListening?: boolean;
  isThinking?: boolean;
  onPress?: () => void;
}

export const WakeWordButton: React.FC<WakeWordButtonProps> = ({
  isListening = false,
  isThinking = false,
  onPress,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    const ring = Animated.loop(
      Animated.parallel([
        Animated.timing(ringAnim, {
          toValue: 1.45,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(ringOpacity, {
            toValue: 0.8,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulse.start();
    ring.start();
    return () => {
      pulse.stop();
      ring.stop();
    };
  }, [pulseAnim, ringAnim, ringOpacity]);

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Haptics optional on web
    }
    onPress?.();
  };

  const getBackgroundColor = () => {
    // Primary Antigravity Obsidian Black button across all states (not red)
    if (isListening) return THEME.colors.obsidian;
    if (isThinking) return THEME.colors.obsidian;
    return THEME.colors.obsidian;
  };

  return (
    <View style={styles.container}>
      {/* Outer Pulse Ring */}
      <Animated.View
        style={[
          styles.wakeRing,
          {
            borderColor: isListening ? THEME.colors.obsidian : THEME.colors.cardBorder,
            opacity: ringOpacity,
            transform: [{ scale: ringAnim }],
          },
        ]}
      />

      {/* Center 72dp Button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Wake Mume voice assistant"
          accessibilityHint="Double tap to talk to Mume hands-free"
          onPress={handlePress}
          style={[styles.button, { backgroundColor: getBackgroundColor() }]}
        >
          <AppIcon
            name={isThinking ? 'bot' : isListening ? 'mic-audio-lines' : 'mic'}
            size={28}
            color="#FFFFFF"
            strokeWidth={2.2}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 90,
    height: 90,
  },
  wakeRing: {
    position: 'absolute',
    width: THEME.ergonomics.wakeButtonSize + 12,
    height: THEME.ergonomics.wakeButtonSize + 12,
    borderRadius: (THEME.ergonomics.wakeButtonSize + 12) / 2,
    borderWidth: 2.5,
  },
  button: {
    width: THEME.ergonomics.wakeButtonSize,
    height: THEME.ergonomics.wakeButtonSize,
    borderRadius: THEME.ergonomics.wakeButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  iconText: {
    fontSize: 28,
  },
});
