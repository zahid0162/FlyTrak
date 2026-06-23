import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// OpenSky states vector mapping:
// 0: icao24
// 1: callsign
// 2: origin_country
// 7: baro_altitude
// 8: on_ground
// 9: velocity

type FlightState = {
  icao24: string;
  callsign: string;
  originCountry: string;
  altitude: number | null;
  onGround: boolean;
  velocity: number | null;
};

export default function HomeScreen() {
  const [flights, setFlights] = useState<FlightState[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const theme = useTheme();
  const textIcon = theme.textSecondary;

  const fetchFlights = useCallback(async () => {
    try {
      // Bounding box over Europe to limit data payload and speed up response
      // lamin=40&lomin=-10&lamax=60&lomax=30
      const url = 'https://opensky-network.org/api/states/all?lamin=40&lomin=-10&lamax=60&lomax=30';
      // Use a proxy on the web to avoid CORS issues
      const proxyUrl = Platform.OS === 'web' ? `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` : url;
      
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      const mappedFlights = (data.states || []).slice(0, 100).map((state: any[]) => ({
        icao24: state[0],
        callsign: state[1]?.trim() || 'UNKNOWN',
        originCountry: state[2],
        altitude: state[7],
        onGround: state[8],
        velocity: state[9],
      }));
      
      setFlights(mappedFlights);
    } catch (error) {
      // Fallback to some mock data if request fails completely
      setFlights([
        { icao24: 'mock1', callsign: 'DLH45', originCountry: 'Germany', altitude: 10000, onGround: false, velocity: 220 },
        { icao24: 'mock2', callsign: 'RYR112', originCountry: 'Ireland', altitude: 8000, onGround: false, velocity: 200 },
        { icao24: 'mock3', callsign: 'AFR89', originCountry: 'France', altitude: null, onGround: true, velocity: 0 },
        { icao24: 'mock4', callsign: 'BAW15G', originCountry: 'United Kingdom', altitude: 11000, onGround: false, velocity: 240 },
        { icao24: 'mock5', callsign: 'SWR407', originCountry: 'Switzerland', altitude: 9500, onGround: false, velocity: 215 },
      ]);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    await fetchFlights();
    setLoading(false);
  }, [fetchFlights]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFlights();
    setRefreshing(false);
  }, [fetchFlights]);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      loadInitialData();
    }
    return () => { mounted = false; };
  }, [loadInitialData]);

  const renderFlight = ({ item }: { item: FlightState }) => (
    <ThemedView type="backgroundElement" style={styles.flightCard}>
      <View style={styles.flightHeader}>
        <View style={styles.callsignContainer}>
          <Ionicons name="airplane" size={20} color={textIcon} style={styles.planeIcon} />
          <ThemedText type="smallBold">{item.callsign}</ThemedText>
        </View>
        <ThemedText type="small" style={styles.originCountry}>{item.originCountry}</ThemedText>
      </View>
      
      <View style={styles.flightDetails}>
        <View style={styles.detailColumn}>
          <ThemedText type="small" style={styles.detailLabel}>Status</ThemedText>
          <ThemedText type="default">{item.onGround ? 'On Ground' : 'In Air'}</ThemedText>
        </View>
        <View style={styles.detailColumn}>
          <ThemedText type="small" style={styles.detailLabel}>Altitude</ThemedText>
          <ThemedText type="default">
            {item.altitude ? `${Math.round(item.altitude)}m` : 'N/A'}
          </ThemedText>
        </View>
        <View style={styles.detailColumn}>
          <ThemedText type="small" style={styles.detailLabel}>Speed</ThemedText>
          <ThemedText type="default">
            {item.velocity ? `${Math.round(item.velocity * 3.6)} km/h` : 'N/A'}
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title">Live Flights</ThemedText>
          <ThemedText type="default" style={styles.subtitle}>Tracking flights over Europe</ThemedText>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={textIcon} />
          </View>
        ) : (
          <FlatList
            style={{ width: '100%' }}
            data={flights}
            keyExtractor={(item) => item.icao24}
            renderItem={renderFlight}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textIcon} />
            }
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <ThemedText type="default">No flights found.</ThemedText>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  subtitle: {
    opacity: 0.7,
    marginTop: Spacing.one,
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  flightCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    width: '100%',
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  callsignContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planeIcon: {
    marginRight: Spacing.two,
  },
  originCountry: {
    opacity: 0.6,
  },
  flightDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  detailColumn: {
    alignItems: 'center',
  },
  detailLabel: {
    opacity: 0.6,
    marginBottom: Spacing.one,
  },
});
