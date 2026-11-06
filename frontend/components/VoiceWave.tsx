import React, { useEffect, useRef } from "react"
import { StyleSheet, View, Animated } from "react-native"
import { THEME } from "../constants/theme"

export const VoiceWave: React.FC = () => {
  const anims = [
    useRef(new Animated.Value(6)).current,
    useRef(new Animated.Value(14)).current,
    useRef(new Animated.Value(22)).current,
    useRef(new Animated.Value(12)).current,
    useRef(new Animated.Value(8)).current,
  ]

  useEffect(() => {
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 24,
            duration: 350 + i * 50,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 6,
            duration: 350 + i * 50,
            useNativeDriver: false,
          }),
        ]),
      ),
    )

    loops.forEach((l) => l.start())
    return () => loops.forEach((l) => l.stop())
  }, [])

  return (
    <View style={styles.container} aria-hidden={true}>
      {anims.map((anim, idx) => (
        <Animated.View
          key={idx}
          style={[
            styles.bar,
            {
              height: anim,
            },
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 24,
    paddingHorizontal: 4,
  },
  bar: {
    width: 3.5,
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
  },
})
