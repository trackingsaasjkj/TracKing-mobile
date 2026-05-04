import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useLogin } from '../hooks/useLogin';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { Input } from '@/shared/ui/components/Input';

interface FormValues {
  email: string;
  password: string;
}

function IconUser() { return <Text style={styles.iconText}>👤</Text>; }
function IconEye({ hidden }: { hidden: boolean }) {
  return <Text style={styles.iconText}>{hidden ? '🙈' : '👁️'}</Text>;
}

export function LoginScreen() {
  const { login, isLoading, error, cooldownSeconds } = useLogin();
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { email: '', password: '' },
  });

  const isDisabled = isLoading || cooldownSeconds > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={[styles.heroIllustration, { backgroundColor: colors.primaryBg, shadowColor: colors.black }, shadows.md]}>
              <Image source={require('../../../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={[styles.brandName, { color: colors.primary }]}>TracKing</Text>
          </View>

          <Text style={[styles.title, { color: colors.neutral900 }]}>Bienvenido, Mensajero</Text>
          <Text style={[styles.subtitle, { color: colors.neutral500 }]}>
            Ingresa tus credenciales para comenzar tu ruta de hoy.
          </Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              rules={{ required: 'El usuario es requerido', pattern: { value: /\S+@\S+\.\S+/, message: 'Ingresa un email válido' } }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Usuario"
                  placeholder="Nombre de usuario o ID"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isDisabled}
                  error={errors.email?.message}
                  rightIcon={<IconUser />}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={{ required: 'La contraseña es requerida', minLength: { value: 6, message: 'Mínimo 6 caracteres' } }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Contraseña"
                  placeholder="Ingresa tu contraseña"
                  secureTextEntry={!showPassword}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isDisabled}
                  error={errors.password?.message}
                  rightIcon={<IconEye hidden={!showPassword} />}
                  onRightIconPress={() => setShowPassword((p) => !p)}
                />
              )}
            />

            <TouchableOpacity style={styles.forgotRow} activeOpacity={0.7}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            {error ? <Text style={[styles.apiError, { color: colors.danger }]}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }, isDisabled && { backgroundColor: colors.neutral200 }]}
              onPress={handleSubmit((data) => login(data.email, data.password))}
              disabled={isDisabled}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : cooldownSeconds > 0 ? (
                <Text style={[styles.buttonText, { color: colors.white }]}>Espera {cooldownSeconds}s</Text>
              ) : (
                <Text style={[styles.buttonText, { color: colors.white }]}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>

          </View>

          <Text style={[styles.footer, { color: colors.neutral400 }]}>v1.0.4 • Soporte Técnico</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxl },
  hero: { alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.xl, marginBottom: spacing.md },
  heroIllustration: { width: 100, height: 100, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 64, height: 64 },
  brandName: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, marginTop: spacing.md, letterSpacing: -0.5 },
  heroIcon: { fontSize: 52 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.md, textAlign: 'center', lineHeight: fontSize.md * 1.5, marginBottom: spacing.xxxl },
  form: { gap: 0 },
  iconText: { fontSize: 18 },
  forgotRow: { alignItems: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.xl },
  forgotText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  apiError: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.md },
  button: { borderRadius: borderRadius.lg, paddingVertical: 15, alignItems: 'center' },
  buttonText: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  biometricRow: { alignItems: 'center', marginTop: spacing.xxl, gap: spacing.sm },
  biometricBtn: { width: 56, height: 56, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' },
  biometricLabel: { fontSize: fontSize.sm },
  footer: { fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.xxxl },
});
