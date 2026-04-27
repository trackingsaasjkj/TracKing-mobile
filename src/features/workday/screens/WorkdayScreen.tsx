import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/store/authStore';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { useTheme } from '@/shared/ui/useTheme';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useMapDefaultsStore } from '@/shared/utils/mapDefaults';
import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';

export function WorkdayScreen() {
  const user = useAuthStore((s) => s.user);
  const { logout } = useLogout();
  const { colors, isDark, toggle } = useTheme();
  const { defaults: mapDefaults, setDefaults: setMapDefaults } = useMapDefaultsStore();
  const [cityInput, setCityInput] = useState('');
  const [citySearching, setCitySearching] = useState(false);

  const handleSetCity = async () => {
    const trimmed = cityInput.trim();
    if (!trimmed) return;
    setCitySearching(true);
    try {
      interface GeoResult { latitude: number; longitude: number; display_name: string; }
      const result = await apiClient
        .post<ApiResponse<GeoResult>>('/geocoding/forward', { address: trimmed })
        .then(unwrap);
      await setMapDefaults({ lat: result.latitude, lng: result.longitude, label: result.display_name });
      setCityInput('');
      Alert.alert('Ciudad actualizada', result.display_name);
    } catch {
      Alert.alert('Error', 'No se encontró la ciudad. Intenta con un nombre más específico.');
    } finally {
      setCitySearching(false);
    }
  };

  const operationalStatus = user?.operationalStatus;
  const isActive = operationalStatus === 'AVAILABLE' || operationalStatus === 'IN_SERVICE';
  const statusLabel =
    operationalStatus === 'AVAILABLE' ? 'Disponible' :
    operationalStatus === 'IN_SERVICE' ? 'En servicio' :
    'Fuera de línea';

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
        <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.successBg : colors.neutral100 }]}>
          <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success : colors.neutral400 }]} />
          <Text style={[styles.statusText, { color: isActive ? colors.successText : colors.neutral500 }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* ── Theme toggle ── */}
      <View style={[styles.settingsCard, { backgroundColor: colors.surface, shadowColor: colors.black }, shadows.sm]}>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>{isDark ? '🌙' : '☀️'}</Text>
            <View>
              <Text style={[styles.settingLabel, { color: colors.neutral800 }]}>Modo oscuro</Text>
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

      {/* ── Map city config ── */}
      <View style={[styles.settingsCard, { backgroundColor: colors.surface, shadowColor: colors.black }, shadows.sm]}>
        <Text style={[styles.settingLabel, { color: colors.neutral800, marginBottom: spacing.xs }]}>
          🗺️  Ciudad por defecto del mapa
        </Text>
        <Text style={[styles.settingDesc, { color: colors.neutral500, marginBottom: spacing.sm }]}>
          Actual: {mapDefaults.label}
        </Text>
        <View style={styles.cityRow}>
          <TextInput
            value={cityInput}
            onChangeText={setCityInput}
            placeholder="Ej: Bucaramanga, Colombia"
            placeholderTextColor={colors.neutral400}
            style={[styles.cityInput, { borderColor: colors.neutral200, color: colors.neutral800, backgroundColor: colors.background }]}
            onSubmitEditing={handleSetCity}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.cityBtn, { backgroundColor: colors.primary }, (citySearching || !cityInput.trim()) && styles.btnDisabled]}
            onPress={handleSetCity}
            disabled={citySearching || !cityInput.trim()}
            activeOpacity={0.85}
          >
            {citySearching
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={[styles.cityBtnText, { color: colors.white }]}>Guardar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: colors.surface, borderColor: colors.neutral200 }]}
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
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: fontWeight.bold },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  email: { fontSize: fontSize.sm, marginTop: 2, marginBottom: spacing.md },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: borderRadius.full, gap: spacing.sm,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  btnDisabled: { opacity: 0.5 },
  settingsCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingIcon: { fontSize: 22 },
  settingLabel: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
  settingDesc: { fontSize: fontSize.xs, marginTop: 1 },
  logoutBtn: {
    marginTop: 'auto', marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    paddingVertical: 14, borderRadius: borderRadius.lg, borderWidth: 1, alignItems: 'center',
  },
  logoutText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
  cityRow: { flexDirection: 'row', gap: spacing.sm },
  cityInput: {
    flex: 1, height: 40, borderWidth: 1,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md, fontSize: fontSize.sm,
  },
  cityBtn: {
    paddingHorizontal: spacing.md, height: 40, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center', minWidth: 72,
  },
  cityBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
