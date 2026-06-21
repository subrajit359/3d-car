import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface HUDProps {
  speed: number;
  gear: number;
  fuel: number;
}

const GEAR_LABEL: Record<number, string> = {
  '-1': 'R', 0: 'N', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6',
};

export default function HUD({ speed, gear, fuel }: HUDProps) {
  const fuelColor = fuel < 20 ? '#ff4422' : fuel < 40 ? '#ffaa22' : '#22ee66';

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Speed */}
      <View style={styles.speedometer}>
        <Text style={styles.speedValue}>{speed}</Text>
        <Text style={styles.speedUnit}>KM/H</Text>
      </View>

      {/* Gear */}
      <View style={styles.gearBox}>
        <Text style={styles.gearLabel}>GEAR</Text>
        <Text style={styles.gearValue}>{GEAR_LABEL[gear] ?? '1'}</Text>
      </View>

      {/* Fuel bar */}
      <View style={styles.fuelContainer}>
        <Text style={styles.fuelLabel}>FUEL</Text>
        <View style={styles.fuelBarBg}>
          <View style={[styles.fuelBar, { width: `${fuel}%` as any, backgroundColor: fuelColor }]} />
        </View>
      </View>

      {/* Part label */}
      <View style={styles.partLabel}>
        <Text style={styles.partText}>OPEN WORLD · PART 1</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  speedometer: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 34 + 90 : 90,
    left: '50%',
    transform: [{ translateX: -50 }],
    alignItems: 'center',
  },
  speedValue: {
    color: '#ffffff',
    fontSize: 52,
    fontFamily: 'Inter_700Bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    lineHeight: 56,
  },
  speedUnit: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 2,
    marginTop: -4,
  },
  gearBox: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 67 + 16 : 24,
    left: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  gearLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    letterSpacing: 1.5,
    fontFamily: 'Inter_500Medium',
  },
  gearValue: {
    color: '#f97316',
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    lineHeight: 36,
  },
  fuelContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 67 + 100 : 110,
    left: 24,
    width: 80,
  },
  fuelLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    letterSpacing: 1.5,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  fuelBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fuelBar: {
    height: '100%',
    borderRadius: 3,
  },
  partLabel: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 67 + 16 : 24,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  partText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 1.5,
  },
});
