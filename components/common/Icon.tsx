import React from 'react';
import Svg, { Path } from 'react-native-svg';

type IconName =
  | 'home' | 'explore' | 'trips' | 'budget' | 'profile'
  | 'search' | 'menu' | 'close' | 'assistant' | 'save'
  | 'location' | 'check' | 'phone' | 'bell' | 'chevron'
  | 'businesses' | 'favorites';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

const PATHS: Record<IconName, string | string[]> = {
  home: 'M15 20H21V10L12 3L3 10V20H9M15 20H9M15 20V13H9V20',
  explore: ['M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z', 'M16 8L13 13L8 16L11 11L16 8Z'],
  trips: ['M6 7H18C19.1046 7 20 7.89543 20 9V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V9C4 7.89543 4.89543 7 6 7Z', 'M8 7V3H16V7M8 11V17M16 11V17'],
  budget: ['M6 3H18C19.1046 3 20 3.89543 20 5V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V5C4 3.89543 4.89543 3 6 3Z', 'M8 7H16M8 12H9M15 12H16M8 17H9M15 17H16'],
  profile: ['M16 8C16 10.2091 14.2091 12 12 12C9.79086 12 8 10.2091 8 8C8 5.79086 9.79086 4 12 4C14.2091 4 16 5.79086 16 8Z', 'M4 21V19C4 16.8783 4.84285 14.8434 6.34315 13.3431C7.84344 11.8429 9.87827 11 12 11C14.1217 11 16.1566 11.8429 17.6569 13.3431C19.1571 14.8434 20 16.8783 20 19V21'],
  search: ['M17 10.5C17 14.0899 14.0899 17 10.5 17C6.91015 17 4 14.0899 4 10.5C4 6.91015 6.91015 4 10.5 4C14.0899 4 17 6.91015 17 10.5Z', 'M16 16L21 21'],
  menu: 'M4 6H20M4 12H20M4 18H20',
  close: 'M5 5L12 12M12 12L19 19M12 12L5 19M12 12L19 5',
  assistant: 'M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5L12 3Z',
  save: 'M6 3H18V21L12 17L6 21V3Z',
  location: ['M19 9C19 15 12 21 12 21C12 21 5 15 5 9C5 8.08075 5.18106 7.1705 5.53284 6.32122C5.88463 5.47194 6.40024 4.70026 7.05025 4.05025C7.70026 3.40024 8.47194 2.88463 9.32122 2.53284C10.1705 2.18106 11.0807 2 12 2C12.9193 2 13.8295 2.18106 14.6788 2.53284C15.5281 2.88463 16.2997 3.40024 16.9497 4.05025C17.5998 4.70026 18.1154 5.47194 18.4672 6.32122C18.8189 7.1705 19 8.08075 19 9Z', 'M14 9C14 10.1046 13.1046 11 12 11C10.8954 11 10 10.1046 10 9C10 7.89543 10.8954 7 12 7C13.1046 7 14 7.89543 14 9Z'],
  check: 'M4 12L9 17L20 6',
  phone: 'M6 3L10 7L8 10C10 13 11 14 14 16L17 14L21 18L18 21C10 21 3 14 3 6L6 3Z',
  bell: 'M10 21H14M5 17H19L17 14V9C17 7.67392 16.4732 6.40215 15.5355 5.46447C14.5979 4.52678 13.3261 4 12 4C10.6739 4 9.40215 4.52678 8.46447 5.46447C7.52678 6.40215 7 7.67392 7 9V14L5 17Z',
  chevron: 'M9 5L16 12L9 19',
  // extras not in Figma set — use simple geometric paths
  businesses: ['M3 9L12 3L21 9V21H15V15H9V21H3V9Z'],
  favorites: 'M12 21L10.55 19.7C5.4 15.1 2 12.1 2 8.5C2 5.5 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.5 22 8.5C22 12.1 18.6 15.1 13.45 19.7L12 21Z',
};

export function Icon({ name, size = 24, color = '#075C73' }: Props) {
  const paths = PATHS[name];
  const pathArray = Array.isArray(paths) ? paths : [paths];

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {pathArray.map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
