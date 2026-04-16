import React, { useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing } from '@/shared/ui/spacing';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { HistoryServiceCard } from '../components/HistoryServiceCard';
import { useServiceHistory, flattenHistoryPages } from '../hooks/useServiceHistory';
import type { ServicesStackParamList } from '../navigation/ServicesNavigator';

type Nav = NativeStackNavigationProp<ServicesStackParamList, 'ServiceHistory'>;

export function ServiceHistoryScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useServiceHistory();

  const services = flattenHistoryPages(data);
  const total = data?.pages[0]?.total ?? 0;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState message="No se pudo cargar el historial" onRetry={refetch} />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.neutral900 }]}>Historial</Text>
        {total > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.primaryBg }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{total}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HistoryServiceCard
            service={item}
            onPress={() => navigation.navigate('ServiceDetail', { serviceId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyText, { color: colors.neutral400 }]}>
              Sin historial disponible
            </Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  countBadge: {
    borderRadius: 99,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  countText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  empty: { alignItems: 'center', paddingTop: spacing.huge, gap: spacing.md },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: fontSize.sm },
  footer: { paddingVertical: spacing.lg, alignItems: 'center' },
});
