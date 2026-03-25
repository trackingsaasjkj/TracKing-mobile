import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServicesStore } from '@/features/services/store/servicesStore';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { useWorkday } from '../hooks/useWorkday';
import { useLogout } from '@/features/auth/hooks/useLogout';

export function WorkdayScreen() {
  const user = useAuthStore((s) => s.user);
  const services = useServicesStore((s) => s.services);
  const { loading, startWorkday, endWorkday } = useWorkday();
  const { logout } = useLogout();

  const isAvailable = user?.operationalStatus === 'AVAILABLE';
  const activeCount = services.filter(
    (s) => s.status === 'ASSIGNED' || s.status === 'ACCEPTED' || s.status === 'IN_TRANSIT'
  ).length;

  const handleStart = async () => {
    const result = await startWorkday();
    if (!result.ok) {
      Alert.alert('Error', result.error);
    }
  };

  const handleEnd = async () => {
    if (activeCount > 0) {
      Alert.alert(
        'Servicios activos',
        `Tienes ${activeCount} servicio(s) activo(s). Finalízalos antes de cerrar la jornada.`
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
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={[styles.statusBadge, isAvailable ? styles.badgeOnline : styles.badgeOffline]}>
          <View style={[styles.statusDot, isAvailable ? styles.dotOnline : styles.dotOffline]} />
          <Text style={[styles.statusText, isAvailable ? styles.textOnline : styles.textOffline]}>
            {isAvailable ? 'En línea' : 'Fuera de línea'}
          </Text>
        </View>
      </View>

      {/* Active services warning */}
      {activeCount > 0 && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            {activeCount} servicio(s) activo(s) — no puedes cerrar la jornada
          </Text>
        </View>
      )}

      {/* Workday actions */}
      <View style={styles.actions}>
        {!isAvailable ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnStart, loading && styles.btnDisabled]}
            onPress={handleStart}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Iniciar jornada</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.btn,
              styles.btnEnd,
              (loading || activeCount > 0) && styles.btnDisabled,
            ]}
            onPress={handleEnd}
            disabled={loading || activeCount > 0}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Finalizar jornada</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral50 },
  profileCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: fontWeight.bold, color: '#fff' },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.neutral800 },
  email: { fontSize: fontSize.sm, color: '#6B7280', marginTop: 2, marginBottom: 12 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  badgeOnline: { backgroundColor: '#DCFCE7' },
  badgeOffline: { backgroundColor: '#F3F4F6' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: colors.success },
  dotOffline: { backgroundColor: '#9CA3AF' },
  statusText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  textOnline: { color: '#15803D' },
  textOffline: { color: '#6B7280' },
  warningBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
  },
  warningText: { fontSize: fontSize.sm, color: '#92400E', textAlign: 'center' },
  actions: { paddingHorizontal: 16, marginTop: 8 },
  btn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnStart: { backgroundColor: colors.success },
  btnEnd: { backgroundColor: colors.danger },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  logoutBtn: {
    marginTop: 'auto',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logoutText: { fontSize: fontSize.md, color: colors.danger, fontWeight: fontWeight.medium },
});
