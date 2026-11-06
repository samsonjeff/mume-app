import React from "react"

import { StyleSheet, Text, View, Pressable } from "react-native"

import { THEME } from "../constants/theme"

interface InboxBadgeProps {
  count: number

  onPress?: () => void
}

export const InboxBadge: React.FC<InboxBadgeProps> = ({ count, onPress }) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Messenger Inbox, ${count} unread`}
      onPress={onPress}
      style={styles.container}
    >
      <Text style={styles.icon}>💬</Text>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    minWidth: THEME.ergonomics.minTapTarget,

    minHeight: THEME.ergonomics.minTapTarget,

    alignItems: "center",

    justifyContent: "center",

    position: "relative",

    padding: 6,
  },

  icon: {
    fontSize: 24,
  },

  badge: {
    position: "absolute",

    top: 2,

    right: 2,

    backgroundColor: THEME.colors.danger,

    borderRadius: 10,

    minWidth: 18,

    height: 18,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 4,
  },

  badgeText: {
    color: "#FFFFFF",

    fontSize: 10,

    fontWeight: "700",
  },
})
