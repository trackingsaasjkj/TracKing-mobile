import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../useTheme';
import { borderRadius, spacing } from '../spacing';
import { shadows } from '../shadows';

interface BottomSheetProps {
  /** Height in px visible when the sheet is collapsed */
  collapsedHeight: number;
  /** Height in px when fully expanded. Defaults to ~72% of the viewport */
  expandedHeight?: number;
  /** Optional content rendered below the grabber inside the draggable header */
  header?: React.ReactNode;
  children: React.ReactNode;
  onExpandedChange?: (expanded: boolean) => void;
  style?: ViewStyle;
}

const SPRING_CONFIG = {
  useNativeDriver: true,
  bounciness: 4,
  speed: 14,
};

/**
 * Lightweight, dependency-free bottom sheet.
 *
 * Uses a single Animated.Value for translateY and a PanResponder attached
 * only to the header/grabber area, so scrollable content inside can use its
 * own gestures without conflicts.
 *
 * Snap points:
 *   collapsed → translateY = expandedHeight - collapsedHeight
 *   expanded  → translateY = 0
 */
export function BottomSheet({
  collapsedHeight,
  expandedHeight,
  header,
  children,
  onExpandedChange,
  style,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();

  const resolvedExpandedHeight =
    expandedHeight ?? Math.min(windowHeight * 0.72, windowHeight - 96);
  const collapsedOffset = Math.max(
    resolvedExpandedHeight - collapsedHeight,
    0,
  );

  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const translateY = useRef(new Animated.Value(collapsedOffset)).current;
  const dragStart = useRef(collapsedOffset);

  const onExpandedChangeRef = useRef(onExpandedChange);
  onExpandedChangeRef.current = onExpandedChange;

  const snap = useCallback(
    (toExpanded: boolean) => {
      expandedRef.current = toExpanded;
      setExpanded(toExpanded);
      onExpandedChangeRef.current?.(toExpanded);
      Animated.spring(translateY, {
        toValue: toExpanded ? 0 : collapsedOffset,
        ...SPRING_CONFIG,
      }).start();
    },
    [collapsedOffset, translateY],
  );

  const toggle = useCallback(() => {
    snap(!expandedRef.current);
  }, [snap]);

  // Keep the sheet anchored at the collapsed position when the viewport or
  // collapsed height changes (rotation, keyboard, dynamic content).
  useEffect(() => {
    translateY.setValue(expandedRef.current ? 0 : collapsedOffset);
    dragStart.current = expandedRef.current ? 0 : collapsedOffset;
  }, [collapsedOffset, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dy) > 6,
        onPanResponderGrant: () => {
          translateY.stopAnimation((value) => {
            dragStart.current = value;
          });
        },
        onPanResponderMove: (_evt, gesture) => {
          const next = Math.min(
            collapsedOffset,
            Math.max(0, dragStart.current + gesture.dy),
          );
          translateY.setValue(next);
        },
        onPanResponderRelease: (_evt, gesture) => {
          const current = dragStart.current + gesture.dy;
          const shouldExpand =
            gesture.vy < -0.3
              ? true
              : gesture.vy > 0.3
                ? false
                : current < collapsedOffset / 2;
          snap(shouldExpand);
        },
        onPanResponderTerminate: () => snap(expandedRef.current),
      }),
    [collapsedOffset, snap, translateY],
  );

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: resolvedExpandedHeight,
          backgroundColor: colors.surface,
          shadowColor: colors.black,
          transform: [{ translateY }],
        },
        style,
      ]}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.clip,
          { backgroundColor: colors.surface, borderColor: colors.neutral100 },
        ]}
      >
        <View style={styles.dragArea}>
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? 'Contraer panel de servicios' : 'Expandir panel de servicios'
            }
            style={styles.headerPressable}
          >
            <View style={[styles.grabber, { backgroundColor: colors.sheetHandle }]} />
            {header}
          </Pressable>
        </View>

        <View style={styles.content}>{children}</View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: borderRadius.xl + 4,
    borderTopRightRadius: borderRadius.xl + 4,
    ...shadows.lg,
  },
  clip: {
    flex: 1,
    borderTopLeftRadius: borderRadius.xl + 4,
    borderTopRightRadius: borderRadius.xl + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dragArea: {
    paddingTop: spacing.sm,
  },
  headerPressable: {
    paddingBottom: spacing.xs,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  content: {
    flex: 1,
  },
});
