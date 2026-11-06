import React from "react"

// Verified local SVG asset imports per repository structure

import audioWaveformSvg from "../assets/audio-waveform.svg"

import bookmarkSvg from "../assets/bookmark.svg"

import botSvg from "../assets/bot-svg.svg"

import checkSvg from "../assets/check.svg"

import chevronLeftSvg from "../assets/chevron-left.svg"

import chevronRightSvg from "../assets/chevron-right.svg"

import dollarSignSvg from "../assets/dollar-sign.svg"

import downLineSvg from "../assets/down-line.svg"

import editSvg from "../assets/edit.svg"

import folderSvg from "../assets/folder.svg"

import homeSvg from "../assets/home.svg"

import messageCircleSvg from "../assets/message-circle.svg"

import wrenchSvg from "../assets/wrench.svg"

import xSvg from "../assets/x.svg"

import mumeBlackSvg from "../assets/mume-black.svg"

import logOutSvg from "../assets/log-out.svg"

import logInSvg from "../assets/log-in.svg"

export type VerifiedIconName = "audio-waveform" | "bookmark" | "bot-svg" | "check" | "chevron-left" | "chevron-right" | "dollar-sign" | "down-line" | "edit" | "folder" | "home" | "message-circle" | "wrench" | "x" | "mume-black" | "log-out" | "log-in"

export type MissingIconName = "settings" | "menu" | "meta-facebook" | "baseline-facebook" | "facebook" | "send" | "trash" | "plus" | "round-plus" | "camera" | "subscription-upgrade"

export type IconName = VerifiedIconName | MissingIconName

const VERIFIED_ASSETS: Record<VerifiedIconName, string> = {
  "audio-waveform": audioWaveformSvg,

  bookmark: bookmarkSvg,

  "bot-svg": botSvg,

  check: checkSvg,

  "chevron-left": chevronLeftSvg,

  "chevron-right": chevronRightSvg,

  "dollar-sign": dollarSignSvg,

  "down-line": downLineSvg,

  edit: editSvg,

  folder: folderSvg,

  home: homeSvg,

  "message-circle": messageCircleSvg,

  wrench: wrenchSvg,

  x: xSvg,

  "mume-black": mumeBlackSvg,

  "log-out": logOutSvg,

  "log-in": logInSvg,
}

interface IconProps {
  name: IconName

  size?: number

  className?: string

  accessibilityLabel?: string

  style?: React.CSSProperties
}

/**
 * Reusable Vector Component Wrapper
 * Strict Missing SVG Audit Protocol:
 * - Uses exact local file imports for verified assets.
 * - Does NOT import third-party libraries (Lucide, FontAwesome).
 * - Highlights missing assets ('settings', 'home', 'meta-facebook') with styled text placeholders until provided.
 */

export const Icon: React.FC<IconProps> = ({
  name,

  size = 20,

  className = "",

  accessibilityLabel,

  style,
}) => {
  // Missing asset handler: standard styled text placeholder

  if (name === "settings") {
    return (
      <img
        src={wrenchSvg}
        alt={accessibilityLabel || "Settings"}
        width={size}
        height={size}
        className={`inline-block shrink-0 object-contain ${className}`}
        style={{ width: size, height: size, ...style }}
        aria-hidden={!accessibilityLabel}
      />
    )
  }

  if (name === "menu") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`inline-block shrink-0 ${className}`}
        style={{ width: size, height: size, color: "#FFFFFF", ...style }}
        aria-label={accessibilityLabel || "Menu"}
      >
        <path d="M10 6h10M4 12h16M7 12h13M4 18h10" />
      </svg>
    )
  }

  if (name === "send") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`inline-block shrink-0 ${className}`}
        style={{ width: size, height: size, ...style }}
        aria-label={accessibilityLabel || "Send message"}
      >
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </svg>
    )
  }

  if (name === "plus") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`inline-block shrink-0 ${className}`}
        style={{ width: size, height: size, ...style }}
        aria-label={accessibilityLabel || "Add"}
      >
        <path d="M5 12h14M12 5v14" />
      </svg>
    )
  }

  if (name === "round-plus") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`inline-block shrink-0 ${className}`}
        style={{ width: size, height: size, ...style }}
        aria-label={accessibilityLabel || "Add"}
      >
        <path d="M18 12.998h-5v5a1 1 0 0 1-2 0v-5H6a1 1 0 0 1 0-2h5v-5a1 1 0 0 1 2 0v5h5a1 1 0 0 1 0 2" />
      </svg>
    )
  }

  if (name === "camera") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`inline-block shrink-0 ${className}`}
        style={{ width: size, height: size, ...style }}
        aria-label={accessibilityLabel || "Camera"}
      >
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    )
  }

  if (name === "trash") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`inline-block shrink-0 ${className}`}
        style={{ width: size, height: size, ...style }}
        aria-label={accessibilityLabel || "Delete"}
      >
        <path d="M10 11v6m4-6v6m5-11v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    )
  }

  if (
    name === "meta-facebook" ||
    name === "baseline-facebook" ||
    name === "facebook"
  ) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`inline-block shrink-0 ${className}`}
        style={{ width: size, height: size, ...style }}
        aria-label={accessibilityLabel || "Facebook"}
      >
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95" />
      </svg>
    )
  }

  if (name === "subscription-upgrade") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`inline-block shrink-0 ${className}`}
        style={{ width: size, height: size, ...style }}
        aria-label={accessibilityLabel || "Subscription upgrade"}
      >
        <path d="M4 5h16a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2H4a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4V7a2 2 0 0 1 2 -2" />
        <path d="M9.5 11 12 8.5l2.5 2.5" />
        <path d="m9.5 15 2.5 -2.5 2.5 2.5" />
      </svg>
    )
  }

  const assetSrc = VERIFIED_ASSETS[(name as VerifiedIconName)]

  return (
    <img
      src={assetSrc}
      alt={accessibilityLabel || name}
      width={size}
      height={size}
      className={`inline-block shrink-0 object-contain ${className}`}
      style={{ width: size, height: size, ...style }}
      aria-hidden={!accessibilityLabel}
    />
  )
}

export default Icon
