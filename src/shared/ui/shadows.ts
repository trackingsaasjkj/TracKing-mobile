import { Platform } from 'react-native';

const DEFAULT_SHADOW_COLOR = '#000';
const DEFAULT_PRIMARY_COLOR = '#1A6B3C';

/** Cross-platform shadow presets.
 *  On iOS, pass `shadowColor` inline to override the default neutral shadow color:
 *    <View style={[shadows.sm, { shadowColor: colors.black }]} />
 */
export const shadows = {
  none: {},

  sm: Platform.select({
    ios: {
      shadowColor: DEFAULT_SHADOW_COLOR,
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 2 },
  }),

  md: Platform.select({
    ios: {
      shadowColor: DEFAULT_SHADOW_COLOR,
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 4 },
  }),

  lg: Platform.select({
    ios: {
      shadowColor: DEFAULT_SHADOW_COLOR,
      shadowOpacity: 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 8 },
  }),

  /** Colored shadow for primary cards — override shadowColor inline with colors.primary */
  primary: Platform.select({
    ios: {
      shadowColor: DEFAULT_PRIMARY_COLOR,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 6 },
  }),
} as const;
