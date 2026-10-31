import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { THEME } from '../constants/theme';

export type AppIconName =
  | 'audio-waveform'
  | 'bookmark'
  | 'bot'
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'dollar-sign'
  | 'edit'
  | 'folder'
  | 'home'
  | 'log-in'
  | 'log-out'
  | 'menu'
  | 'message-circle'
  | 'mic-audio-lines'
  | 'mic'
  | 'mume-black'
  | 'mume-white'
  | 'pin'
  | 'plus'
  | 'radio'
  | 'scan-line'
  | 'share'
  | 'sparkles'
  | 'trash'
  | 'user-round'
  | 'wrench'
  | 'x';

export interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Unified, type-safe vector icon component that renders SVG assets from `frontend/assets/`.
 * Supports dynamic theming, stroke widths, accessibility, and resolution-independent scaling.
 */
export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 24,
  color = THEME.colors.text,
  strokeWidth = 2,
  style,
  accessibilityLabel,
}) => {
  if (name === 'mume-black' || name === 'mume-white') {
    const fillColor = name === 'mume-white' ? '#FFFFFF' : (color || THEME.colors.obsidian);
    return (
      <Svg
        width={size * 3}
        height={size}
        viewBox="0 0 600 600"
        preserveAspectRatio="xMidYMid meet"
        style={style}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel || 'Mume'}
      >
        <G transform="translate(0, 600) scale(0.1, -0.1)" fill={fillColor} stroke="none">
          <Path d="M715 4171 c-16 -4 -41 -13 -53 -20 -52 -28 -52 -32 -52 -707 0 -698 -1 -682 66 -710 46 -19 187 -18 224 1 54 28 55 30 60 444 l5 383 34 -48 c19 -27 90 -124 158 -216 101 -136 132 -170 167 -187 55 -27 96 -26 154 3 49 25 50 26 263 321 l94 130 7 -585 c9 -660 10 -671 88 -825 81 -160 203 -272 351 -325 99 -35 268 -39 376 -10 85 23 178 72 245 129 84 72 172 222 211 360 20 72 21 104 27 665 l5 588 35 -48 c19 -27 89 -124 157 -216 101 -136 131 -170 166 -187 55 -27 99 -27 153 0 45 21 58 38 265 324 l94 130 5 -840 c5 -920 3 -880 65 -910 48 -22 1291 -23 1334 0 60 31 61 35 61 560 0 534 2 520 -70 549 -50 20 -159 21 -205 2 -19 -8 -44 -30 -55 -48 -19 -31 -20 -50 -20 -380 l0 -348 -99 0 -99 0 -4 243 c-3 273 -6 285 -76 314 -54 23 -191 15 -229 -13 -44 -33 -51 -77 -52 -321 l-1 -223 -100 0 -100 0 0 960 c0 1009 0 1002 -43 1038 -9 8 -44 18 -79 24 -85 14 -172 -3 -208 -42 -14 -15 -123 -156 -243 -314 l-218 -287 -200 263 c-250 329 -263 344 -302 365 -44 24 -179 23 -225 -1 -60 -31 -62 -43 -63 -478 -1 -216 -4 -593 -8 -838 -7 -428 -8 -447 -29 -501 -27 -68 -81 -133 -132 -159 -86 -44 -217 -34 -293 23 -49 37 -102 134 -116 212 -5 28 -13 412 -16 855 -6 624 -10 812 -20 837 -20 47 -65 67 -155 67 -133 1 -122 10 -367 -311 -120 -158 -227 -297 -238 -309 l-20 -23 -175 231 c-248 328 -286 375 -319 392 -34 18 -144 28 -186 17z" />
        </G>
      </Svg>
    );
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={style}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel || name}
    >
      {name === 'home' && (
        <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}>
          <Path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <Path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </G>
      )}

      {name === 'message-circle' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092a10 10 0 1 0-4.777-4.719"
        />
      )}

      {name === 'folder' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
        />
      )}

      {name === 'wrench' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"
        />
      )}

      {name === 'mic' && (
        <G fill="none" stroke={color} strokeWidth={strokeWidth}>
          <Rect height={11} rx={4} strokeWidth={strokeWidth} width={7} x={8.5} y={3} />
          <Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" strokeLinecap="round" strokeWidth={strokeWidth} />
        </G>
      )}

      {name === 'mic-audio-lines' && (
        <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}>
          <Path d="M10 3v2.341M12 17v4m2-16v.341M18 5v13M2 10v3m20-3v3M6 6v11m3 4h6" />
          <Rect width={4} height={8} x={10} y={9} rx={2} />
        </G>
      )}

      {name === 'audio-waveform' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2"
        />
      )}

      {name === 'check' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M20 6L9 17l-5-5"
        />
      )}

      {name === 'chevron-right' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="m9 18l6-6l-6-6"
        />
      )}

      {name === 'chevron-left' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="m15 18l-6-6l6-6"
        />
      )}

      {name === 'edit' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M13 21h8M15 5l4 4m2.174-2.188a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
        />
      )}

      {name === 'dollar-sign' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M12 2v20m5-17H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        />
      )}

      {name === 'user-round' && (
        <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}>
          <Circle cx={12} cy={8} r={5} />
          <Path d="M20 21a8 8 0 0 0-16 0" />
        </G>
      )}

      {name === 'radio' && (
        <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}>
          <Path d="M16.247 7.761a6 6 0 0 1 0 8.478m2.828-11.306a10 10 0 0 1 0 14.134m-14.15 0a10 10 0 0 1 0-14.134m2.828 11.306a6 6 0 0 1 0-8.478" />
          <Circle cx={12} cy={12} r={2} />
        </G>
      )}

      {name === 'scan-line' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2m4-5h10"
        />
      )}

      {name === 'bot' && (
        <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}>
          <Path d="M12 8V4H8" />
          <Rect width={16} height={12} x={4} y={8} rx={2} />
          <Path d="M2 14h2m16 0h2m-7-1v2m-6-2v2" />
        </G>
      )}

      {name === 'bookmark' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"
        />
      )}

      {name === 'pin' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4a1 1 0 0 1 1 1z"
        />
      )}

      {name === 'share' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M12 2v13m4-9l-4-4l-4 4m-4 6v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"
        />
      )}

      {name === 'trash' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M10 11v6m4-6v6m5-11v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        />
      )}

      {name === 'log-in' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="m10 17l5-5l-5-5m5 5H3m12-9h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
        />
      )}

      {name === 'log-out' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="m16 17l5-5l-5-5m5 5H9m0 9H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        />
      )}

      {name === 'x' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M18 6L6 18M6 6l12 12"
        />
      )}

      {name === 'menu' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M4 6h16M4 12h16M4 18h16"
        />
      )}

      {name === 'plus' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="M12 5v14M5 12h14"
        />
      )}

      {name === 'chevron-down' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="m6 9 6 6 6-6"
        />
      )}

      {name === 'sparkles' && (
        <Path
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"
        />
      )}
    </Svg>
  );
};

export default AppIcon;

