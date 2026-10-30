import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';

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

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Haptics optional on web/emulator
    }
    onPress?.();
  };

  const getBackgroundColor = () => {
    if (isListening) return THEME.colors.listening;
    if (isThinking) return THEME.colors.pending;
    return THEME.colors.primary;
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Wake Mume voice assistant"
          accessibilityHint="Double tap to talk to Mume hands-free"
          onPress={handlePress}
          style={[styles.button, { backgroundColor: getBackgroundColor() }]}
        >
          <Text style={styles.iconText}>🎙️</Text>
          <Text style={styles.label}>
            {isListening ? 'Listening...' : isThinking ? 'Thinking...' : 'Mume'}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.ergonomics.wakeButtonMarginBottom,
  },
  button: {
    width: THEME.ergonomics.wakeButtonSize,
    height: THEME.ergonomics.wakeButtonSize,
    borderRadius: THEME.ergonomics.wakeButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  iconText: {
    fontSize: 26,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
