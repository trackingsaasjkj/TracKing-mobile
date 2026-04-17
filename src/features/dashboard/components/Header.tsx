import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useWorkday } from '@/features/workday/hooks/useWorkday';
import { useServicesStore } from '@/features/services/store/servicesStore';

interface HeaderProps {
  name: string;
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

export function Header({ name }: HeaderProps) {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const services = useServicesStore((s) => s.services);
  const { loading, startWorkday, endWorkday } = useWorkday();

  const isAvailable = user?.operationalStatus === 'AVAILABLE';
  const activeCount = services.filter(
    (s) => s.status === 'ASSIGNED' || s.status === 'ACCEPTED' || s.status === 'IN_TRANSIT',
  ).length;

  const handleStart = async () => {
    const result = await startWorkday();
    if (!result.ok) Alert.alert('Error', result.error);
  };

  const handleEnd = async () => {
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
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.left}>
        <Text style={[styles.greeting, { color: colors.neutral900 }]}>Hola, {name}</Text>
        <Text style={[styles.date, { color: colors.neutral500 }]}>Hoy, {getFormattedDate()}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.workdayBtn,
          {
            backgroundColor: isAvailable ? colors.danger : colors.success,
            opacity: loading || (!isAvailable === false && activeCount > 0) ? 0.6 : 1,
          },
        ]}
        onPress={isAvailable ? handleEnd : handleStart}
        disabled={loading || (isAvailable && activeCount > 0)}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={[styles.workdayBtnText, { color: colors.white }]}>
            {isAvailable ? 'Terminar\njornada' : 'Iniciar\njornada'}
          </Text>
        )}
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
  left: { flex: 1 },
  greeting: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  date: { fontSize: fontSize.sm, marginTop: 2 },
  workdayBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  workdayBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    lineHeight: 16,
  },
});
