import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServicesStore } from '@/features/services/store/servicesStore';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { useTheme } from '@/shared/ui/useTheme';
import { useWorkday } from '../hooks/useWorkday';
import { useLogout } from '@/features/auth/hooks/useLogout';

export function WorkdayScreen() {
  const user = useAuthStore((s) => s.user);
  const services = useServicesStore((s) => s.services);
  const { loading, startWorkday, endWorkday } = useWorkday();
  const { logout } = useLogout();
  const { colors, isDark, toggle } = useTheme();

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

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* ── Profile card ── */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface, shadowColor: colors.black }, shadows.sm]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.white }]}>
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.neutral800 }]}>{user?.name}</Text>
        <Text style={[styles.email, { color: colors.neutral500 }]}>{user?.email}</Text>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isAvailable ? colors.successBg : colors.neutral100 },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isAvailable ? colors.success : colors.neutral400 },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isAvailable ? colors.successText : colors.neutral500 },
            ]}
          >
            {isAvailable ? 'En línea' : 'Fuera de línea'}
          </Text>
        </View>
      </View>

      {/* ── Active services warning ── */}
      {activeCount > 0 && (
        <View style={[styles.warningBanner, { backgroundColor: colors.warningBg }]}>
          <Text style={[styles.warningText, { color: colors.warningText }]}>
            {activeCount} servicio(s) activo(s) — no puedes cerrar la jornada
          </Text>
        </View>
      )}

      {/* ── Workday actions ── */}
      <View style={styles.actions}>
        {!isAvailable ? (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.success }, loading && styles.btnDisabled]}
            onPress={handleStart}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.btnText, { color: colors.white }]}>Iniciar jornada</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: colors.danger },
              (loading || activeCount > 0) && styles.btnDisabled,
            ]}
            onPress={handleEnd}
            disabled={loading || activeCount > 0}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.btnText, { color: colors.white }]}>Finalizar jornada</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Theme toggle ── */}
      <View style={[styles.settingsCard, { backgroundColor: colors.surface, shadowColor: colors.black }, shadows.sm]}>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>{isDark ? '🌙' : '☀️'}</Text>
            <View>
              <Text style={[styles.settingLabel, { color: colors.neutral800 }]}>
                Modo oscuro
              </Text>
              <Text style={[styles.settingDesc, { color: colors.neutral500 }]}>
                {isDark ? 'Activado' : 'Desactivado'}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggle}
            trackColor={{ false: colors.neutral200, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity
        style={[
          styles.logoutBtn,
          { backgroundColor: colors.surface, borderColor: colors.neutral200 },
        ]}
        onPress={handleLogout}
      >
        <Text style={[styles.logoutText, { color: colors.danger }]}>Cerrar sesión</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  profileCard: {
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: fontWeight.bold },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  email: { fontSize: fontSize.sm, marginTop: 2, marginBottom: spacing.md },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },

  warningBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  warningText: { fontSize: fontSize.sm, textAlign: 'center' },

  actions: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  btn: {
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },

  // Theme toggle card
  settingsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingIcon: { fontSize: 22 },
  settingLabel: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
  settingDesc: { fontSize: fontSize.xs, marginTop: 1 },

  logoutBtn: {
    marginTop: 'auto',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  logoutText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
});
