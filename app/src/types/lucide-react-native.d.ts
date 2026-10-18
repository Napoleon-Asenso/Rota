declare module 'lucide-react-native' {
  import type React from 'react';
  import type { StyleProp, ViewStyle } from 'react-native';

  export interface LucideProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    style?: StyleProp<ViewStyle>;
    [key: string]: unknown;
  }

  export type LucideIcon = React.FC<LucideProps>;

  export const ArrowLeft: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Bell: LucideIcon;
  export const CloudOff: LucideIcon;
  export const Shield: LucideIcon;
  export const Sun: LucideIcon;
  export const Moon: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const LogOut: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Check: LucideIcon;
  export const X: LucideIcon;
  export const Calendar: LucideIcon;
  export const User: LucideIcon;
  export const Users: LucideIcon;
  export const Clock: LucideIcon;
  export const Plus: LucideIcon;

  const icons: Record<string, LucideIcon>;
  export default icons;
}
