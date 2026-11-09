import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { borderRadius, spacing } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useWorkday } from '@/features/workday/hooks/useWorkday';
import { useServicesStore } from '@/features/services/store/servicesStore';

interface HeaderProps {
  name: string;
  /** Renders the header as a floating card over the map */
  floating?: boolean;
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

// Dimensions for the toggle (–30%)
const TOGGLE_WIDTH = 60;
const TOGGLE_HEIGHT = 24;
const THUMB_SIZE = 18;
const THUMB_PADDING = 2;
const THUMB_TRAVEL = TOGGLE_WIDTH - THUMB_SIZE - THUMB_PADDING * 2;

export function Header({ name, floating = false }: HeaderProps) {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const services = useServicesStore((s) => s.services);
  const { loading, startWorkday, endWorkday } = useWorkday();

  const operationalStatus = user?.operationalStatus;
  const isAvailable = operationalStatus === 'AVAILABLE';
  const isInService = operationalStatus === 'IN_SERVICE';
  // Toggle is ON whenever the courier is active (AVAILABLE or IN_SERVICE)
  const isOn = isAvailable || isInService;
  const activeCount = services.filter(
    (s) => s.status === 'ASSIGNED' || s.status === 'ACCEPTED' || s.status === 'IN_TRANSIT',
  ).length;

  // Animate thumb position: 0 = OFF (left), 1 = ON (right)
  const anim = useRef(new Animated.Value(isOn ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isOn ? 1 : 0,
      useNativeDriver: false,
      bounciness: 6,
    }).start();
  }, [isOn]);

  const thumbLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [THUMB_PADDING, THUMB_TRAVEL],
  });

  const handlePress = async () => {
    if (isOn) {
      if (activeCount > 0) {
        Alert.alert(
          'Servicios activos',
          `Tienes ${activeCount} servicio(s) activo(s). Finalízalos antes de cerrar la jornada.`,
        );
        return;
      }
      Alert.alert(
        'Finalizar jornada',
        '¿Estás seguro de que quieres finalizar tu jornada?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Finalizar',
            style: 'destructive',
            onPress: async () => {
              const result = await endWorkday();
              if (!result.ok) Alert.alert('Error', result.error);
            },
          },
        ],
      );
    } else {
      const result = await startWorkday();
      if (!result.ok) Alert.alert('Error', result.error);
    }
  };

  const trackColor = isOn ? colors.success : colors.danger;
  // Only disable while a request is in flight
  const isDisabled = loading;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: floating ? colors.overlaySurface : colors.surface },
        floating && [styles.floating, { shadowColor: colors.black }],
      ]}
    >
      <View style={styles.left}>
        <Text
          style={[
            styles.greeting,
            floating && styles.greetingFloating,
            { color: colors.neutral900 },
          ]}
        >
          Hola, {name}
        </Text>
        <Text style={[styles.date, { color: colors.neutral500 }]}>Hoy, {getFormattedDate()}</Text>
      </View>

      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.9}
        style={{ opacity: isDisabled ? 0.5 : 1 }}
      >
        {/* Outer border wrapper — separated from inner so overflow:hidden doesn't clip thumb */}
        <View style={[styles.trackBorder, { borderColor: colors.neutral400 }]}>
          {/* Track fill */}
          <View style={[styles.track, { backgroundColor: trackColor }]}>
            {/* Label */}
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" style={styles.loader} />
            ) : (
              <Text
                style={[
                  styles.label,
                  isOn ? styles.labelLeft : styles.labelRight,
                  { color: colors.white },
                ]}
              >
                {isOn ? 'ON' : 'OFF'}
              </Text>
            )}
          </View>

          {/* Thumb — outside the overflow:hidden track so it renders perfectly round */}
          <Animated.View
            style={[
              styles.thumb,
              {
                left: thumbLeft,
                backgroundColor: colors.surface,
                borderColor: colors.neutral400,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  floating: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  left: { flex: 1 },
  greeting: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  greetingFloating: { fontSize: fontSize.lg },
  date: { fontSize: fontSize.sm, marginTop: 2 },

  trackBorder: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    borderRadius: TOGGLE_HEIGHT / 2,
    borderWidth: 1.5,
    overflow: 'visible',
    justifyContent: 'center',
  },
  track: {
    width: '100%',
    height: '100%',
    borderRadius: TOGGLE_HEIGHT / 2,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 1.5,
    top: (TOGGLE_HEIGHT - THUMB_SIZE) / 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    position: 'absolute',
  },
  // ON label sits on the left side (thumb is on the right)
  labelLeft: {
    left: THUMB_PADDING + 8,
  },
  // OFF label sits on the right side (thumb is on the left)
  labelRight: {
    right: THUMB_PADDING + 8,
  },
  loader: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
  },
});
