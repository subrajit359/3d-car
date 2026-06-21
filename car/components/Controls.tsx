import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, PanResponder, TouchableOpacity, Text, Platform } from 'react-native';
import { CarInput } from '@/game/Car';

interface ControlsProps {
  onInput: (input: Partial<CarInput>) => void;
  onCameraSwitch: () => void;
}

// Virtual joystick for steering
function Joystick({ onSteer }: { onSteer: (v: number) => void }) {
  const center = useRef({ x: 0, y: 0 });
  const knobPos = useRef({ x: 0, y: 0 });
  const knobRef = useRef<View>(null);
  const RADIUS = 44;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      center.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
    },
    onPanResponderMove: (evt) => {
      const dx = evt.nativeEvent.pageX - center.current.x;
      const dist = Math.sqrt(dx * dx);
      const clampedX = Math.max(-RADIUS, Math.min(RADIUS, dx));
      knobPos.current = { x: clampedX, y: 0 };
      const steer = clampedX / RADIUS;
      onSteer(steer);
      if (knobRef.current) {
        knobRef.current.setNativeProps({ style: { transform: [{ translateX: clampedX }] } });
      }
    },
    onPanResponderRelease: () => {
      knobPos.current = { x: 0, y: 0 };
      onSteer(0);
      if (knobRef.current) {
        knobRef.current.setNativeProps({ style: { transform: [{ translateX: 0 }] } });
      }
    },
  });

  return (
    <View style={styles.joystickContainer} {...panResponder.panHandlers}>
      <View style={styles.joystickBase}>
        <View ref={knobRef} style={styles.joystickKnob} />
      </View>
      <Text style={styles.controlLabel}>STEER</Text>
    </View>
  );
}

// Gas / Brake button
function ActionButton({
  label,
  color,
  onPress,
  onRelease,
}: {
  label: string;
  color: string;
  onPress: () => void;
  onRelease: () => void;
}) {
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: onPress,
    onPanResponderRelease: onRelease,
    onPanResponderTerminate: onRelease,
  });

  return (
    <View
      style={[styles.actionButton, { backgroundColor: color + '33', borderColor: color }]}
      {...panResponder.panHandlers}
    >
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </View>
  );
}

export default function Controls({ onInput, onCameraSwitch }: ControlsProps) {
  const onSteer = useCallback((v: number) => onInput({ steer: v }), [onInput]);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Left: Joystick */}
      <View style={styles.leftSide}>
        <Joystick onSteer={onSteer} />
      </View>

      {/* Right: Gas / Brake */}
      <View style={styles.rightSide}>
        <ActionButton
          label="GAS"
          color="#22cc55"
          onPress={() => onInput({ throttle: 1 })}
          onRelease={() => onInput({ throttle: 0 })}
        />
        <View style={{ height: 12 }} />
        <ActionButton
          label="BRAKE"
          color="#ff4422"
          onPress={() => onInput({ brake: 1 })}
          onRelease={() => onInput({ brake: 0 })}
        />
      </View>

      {/* Top-right mini buttons */}
      <View style={styles.topRight}>
        <TouchableOpacity style={styles.miniButton} onPress={onCameraSwitch} activeOpacity={0.7}>
          <Text style={styles.miniLabel}>CAM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'web' ? 34 : 20,
    paddingHorizontal: 20,
  },
  leftSide: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rightSide: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  joystickContainer: {
    alignItems: 'center',
  },
  joystickBase: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joystickKnob: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  controlLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 1,
  },
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
  },
  topRight: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 67 : 20,
    right: 20,
    gap: 8,
  },
  miniButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  miniLabel: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
  },
});
