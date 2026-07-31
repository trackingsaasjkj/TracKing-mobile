import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { Button } from '@/shared/ui/components/Button';
import { useRoutesStore } from '@/features/routes/store/routesStore';
import type { Service } from '@/features/services/types/services.types';

interface RouteCardProps {
  service?: Service;        // optional — not needed when rendering from route store only
  totalStops: number;
  onPress: () => void;      // → ServiceDetailScreen
  onRoutePress: () => void; // → RouteDetailScreen
}

// ── Badge — replaces StatusBadge, shows "RUTA" pill ──────────────────────────
function RoutePill() {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: colors.primaryBg }]}>
      <Ionicons name="git-branch-outline" size={11} color={colors.primary} />
      <Text style={[styles.pillText, { color: colors.primary }]}>RUTA</Text>
    </View>
  );
}

// ── Stops block — mirrors RouteBlock from ServiceCard (origin→destination dots) ─
function StopsBlock({ totalStops }: { totalStops: number }) {
  const { colors } = useTheme();
  const activeRoute = useRoutesStore((s) => s.activeRoute);
  const stops = activeRoute?.stops ?? [];
  const completed = stops.filter((s) => s.status === 'COMPLETED').length;
  const hasProgress = stops.length > 0;
  const pct = hasProgress ? Math.round((completed / totalStops) * 100) : 0;

  return (
    <View style={styles.stopsBlock}>
      {/* First stop row */}
      <View style={styles.stopRow}>
        <View style={[styles.dotTop, { backgroundColor: colors.neutral400 }]} />
        <View style={styles.stopTextBlock}>
          <Text style={[styles.stopLabel, { color: colors.neutral400 }]}>PARADAS</Text>
          <Text style={[styles.stopValue, { color: colors.neutral600 }]} numberOfLines={1}>
            {totalStops} paradas en esta ruta
          </Text>
        </View>
      </View>

      {/* Connector line */}
      <View style={[styles.connector, { backgroundColor: colors.neutral200 }]} />

      {/* Progress row */}
      <View style={styles.stopRow}>
        <View style={[styles.dotBottom, { backgroundColor: colors.primary }]} />
        <View style={styles.stopTextBlock}>
          <Text style={[styles.stopLabel, { color: colors.primary }]}>PROGRESO</Text>
          {hasProgress ? (
            <View style={styles.progressRow}>
              <View style={[styles.progressTrack, { backgroundColor: colors.neutral200 }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: pct === 100 ? colors.success : colors.primary,
                      width: `${pct}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: colors.neutral900 }]}>
                {completed}/{totalStops}
              </Text>
            </View>
          ) : (
            <Text style={[styles.stopValue, { color: colors.neutral900, fontWeight: fontWeight.semibold }]}>
              Sin iniciar
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Recipient row — identical to ClientRow in ServiceCard ─────────────────────
function RecipientRow({ name, sub }: { name: string; sub: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.clientRow}>
      <View style={[styles.clientAvatar, { backgroundColor: colors.primaryBg }]}>
        <Text style={[styles.clientInitial, { color: colors.primary }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={[styles.clientName, { color: colors.neutral800 }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.clientSub, { color: colors.neutral500 }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function RouteCard({ service, totalStops, onPress, onRoutePress }: RouteCardProps) {
  const { colors } = useTheme();
  const activeRoute = useRoutesStore((s) => s.activeRoute);

  // Derive display name/address from service prop OR from the first stop in the route store
  const firstStop = activeRoute?.stops?.[0];
  const displayName = service?.destination_name ?? firstStop?.contact_name ?? 'Ruta';
  const displayAddress = service?.destination_address ?? firstStop?.address ?? '';

  const status = service?.status ?? activeRoute?.status;
  const isActive =
    status === 'IN_TRANSIT' || status === 'ACCEPTED' || status === 'IN_PROGRESS';
  const isAssigned = status === 'ASSIGNED' || status === 'PLANNED';

  // ── Active ─────────────────────────────────────────────────────────────────
  if (isActive) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.primary, shadowColor: colors.black },
          shadows.md,
        ]}
        onPress={onRoutePress}
        activeOpacity={0.9}
      >
        <View style={styles.topRow}>
          <RoutePill />
          <Text style={[styles.stopCount, { color: colors.neutral500 }]}>
            {totalStops} paradas
          </Text>
        </View>
        <StopsBlock totalStops={totalStops} />
        <RecipientRow
          name={displayName}
          sub={displayAddress}
        />
      </TouchableOpacity>
    );
  }

  // ── Assigned ───────────────────────────────────────────────────────────────
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.surface, shadowColor: colors.black },
        shadows.sm,
      ]}
      onPress={onRoutePress}
      activeOpacity={0.88}
    >
      <View style={styles.topRow}>
        <RoutePill />
        <Text style={[styles.stopCount, { color: colors.neutral500 }]}>
          {totalStops} paradas
        </Text>
      </View>

      <StopsBlock totalStops={totalStops} />

      <RecipientRow
        name={displayName}
        sub={displayAddress}
      />

      {isAssigned && (
        <View style={[styles.actions, { borderTopColor: colors.neutral100 }]}>
          <Button
            label="Ver servicio"
            onPress={onPress}
            size="sm"
            variant="outline"
            style={styles.actionBtn}
          />
          <Button
            label="Ver ruta"
            onPress={onRoutePress}
            size="sm"
            variant="primary"
            style={styles.actionBtn}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Card — same as ServiceCard
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

  // Top row — same as ServiceCard topRow
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  // Route pill (replaces StatusBadge)
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  pillText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  stopCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },

  // Stops block — mirrors RouteBlock from ServiceCard
  stopsBlock: {
    marginBottom: spacing.md,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  dotTop: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 3,
  },
  dotBottom: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 3,
  },
  connector: {
    width: 1.5,
    height: 14,
    marginLeft: 4,
    marginVertical: 2,
  },
  stopTextBlock: {
    flex: 1,
  },
  stopLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  stopValue: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    minWidth: 28,
    textAlign: 'right',
  },

  // Client row — identical to ServiceCard
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  clientAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInitial: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  clientSub: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },

  // Actions — identical to ServiceCard pendingActions
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
  },
});
