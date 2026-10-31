import React from 'react';

// Verified local SVG asset imports per repository structure
import audioWaveformSvg from '../assets/audio-waveform.svg';
import bookmarkSvg from '../assets/bookmark.svg';
import botSvg from '../assets/bot-svg.svg';
import checkSvg from '../assets/check.svg';
import chevronLeftSvg from '../assets/chevron-left.svg';
import chevronRightSvg from '../assets/chevron-right.svg';
import dollarSignSvg from '../assets/dollar-sign.svg';
import editSvg from '../assets/edit.svg';
import folderSvg from '../assets/folder.svg';
import homeSvg from '../assets/home.svg';
import messageCircleSvg from '../assets/message-circle.svg';
import wrenchSvg from '../assets/wrench.svg';
import xSvg from '../assets/x.svg';
import mumeBlackSvg from '../assets/mume-black.svg';
import logOutSvg from '../assets/log-out.svg';
import logInSvg from '../assets/log-in.svg';

export type VerifiedIconName =
  | 'audio-waveform'
  | 'bookmark'
  | 'bot-svg'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'dollar-sign'
  | 'edit'
  | 'folder'
  | 'home'
  | 'message-circle'
  | 'wrench'
  | 'x'
  | 'mume-black'
  | 'log-out'
  | 'log-in';

export type MissingIconName = 'settings' | 'menu' | 'meta-facebook';

export type IconName = VerifiedIconName | MissingIconName;

const VERIFIED_ASSETS: Record<VerifiedIconName, string> = {
  'audio-waveform': audioWaveformSvg,
  bookmark: bookmarkSvg,
  'bot-svg': botSvg,
  check: checkSvg,
  'chevron-left': chevronLeftSvg,
  'chevron-right': chevronRightSvg,
  'dollar-sign': dollarSignSvg,
  edit: editSvg,
  folder: folderSvg,
  home: homeSvg,
  'message-circle': messageCircleSvg,
  wrench: wrenchSvg,
  x: xSvg,
  'mume-black': mumeBlackSvg,
  'log-out': logOutSvg,
  'log-in': logInSvg,
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  accessibilityLabel?: string;
  style?: React.CSSProperties;
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
  className = '',
  accessibilityLabel,
  style,
}) => {
  // Missing asset handler: standard styled text placeholder
  if (name === 'settings') {
    return (
      <img
        src={wrenchSvg}
        alt={accessibilityLabel || 'Settings'}
        width={size}
        height={size}
        className={`inline-block shrink-0 object-contain ${className}`}
        style={{ width: size, height: size, ...style }}
        aria-hidden={!accessibilityLabel}
      />
    );
  }

  if (name === 'menu') {
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
        aria-label={accessibilityLabel || 'Menu'}
      >
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    );
  }

  if (name === 'meta-facebook') {
    return (
      <span
        role="img"
        aria-label={accessibilityLabel || 'Meta Facebook (Pending SVG)'}
        className={`inline-flex items-center justify-center font-black text-xs px-1.5 py-0.5 rounded bg-blue-600 text-white select-none ${className}`}
        style={{ minWidth: size, height: size, fontSize: Math.max(11, size * 0.55), ...style }}
      >
        f
      </span>
    );
  }

  const assetSrc = VERIFIED_ASSETS[name as VerifiedIconName];

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
  );
};

export default Icon;

