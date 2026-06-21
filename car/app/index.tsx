import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Text, Platform } from 'react-native';
import Controls from '@/components/Controls';
import HUD from '@/components/HUD';
import { CarInput } from '@/game/Car';

// Lazy-load GLView only on native to avoid web crash
let GLView: any = null;
let GameEngine: any = null;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  GLView = require('expo-gl').GLView;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  GameEngine = require('@/game/GameEngine').GameEngine;
}

function WebFallback() {
  return (
    <View style={styles.webFallback}>
      <Text style={styles.gameTitle}>3D CAR GAME</Text>
      <Text style={styles.webIcon}>🎮</Text>
      <Text style={styles.webMessage}>Scan the QR code with</Text>
      <Text style={styles.webHighlight}>Expo Go</Text>
      <Text style={styles.webSub}>to play on your Android device</Text>
      <View style={styles.webDivider} />
      <Text style={styles.webFeatures}>
        {'✓  Open-world terrain\n✓  Driveable car\n✓  Day/night cycle\n✓  Touch + tilt controls'}
      </Text>
    </View>
  );
}

function NativeGame() {
  const engineRef = useRef<InstanceType<typeof GameEngine> | null>(null);
  const inputRef   = useRef<CarInput>({ steer: 0, throttle: 0, brake: 0, handbrake: false, headlights: true });
  const animRef    = useRef<number>(0);

  const [hud, setHud] = useState({ speed: 0, gear: 1, fuel: 100 });
  const [ready, setReady] = useState(false);

  const onContextCreate = useCallback(async (gl: any) => {
    const engine = new GameEngine();
    await engine.init(gl, gl.drawingBufferWidth, gl.drawingBufferHeight);
    engineRef.current = engine;
    setReady(true);

    let lastTime = 0;
    let frame = 0;

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      frame++;

      engine.setInput(inputRef.current);
      engine.update(dt);
      engine.render(gl);

      if (frame % 8 === 0) {
        setHud({ speed: engine.speedKmh, gear: engine.gear, fuel: engine.fuel });
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      engineRef.current?.dispose();
    };
  }, []);

  const handleInput = useCallback((partial: Partial<CarInput>) => {
    inputRef.current = { ...inputRef.current, ...partial };
  }, []);

  const handleCameraSwitch = useCallback(() => {
    engineRef.current?.cycleCam();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <GLView style={styles.gl} onContextCreate={onContextCreate} />

      {!ready && (
        <View style={styles.loading}>
          <Text style={styles.loadingTitle}>3D CAR GAME</Text>
          <Text style={styles.loadingText}>Building world…</Text>
        </View>
      )}

      {ready && (
        <>
          <HUD speed={hud.speed} gear={hud.gear} fuel={hud.fuel} />
          <Controls onInput={handleInput} onCameraSwitch={handleCameraSwitch} />
        </>
      )}
    </View>
  );
}

export default function GameScreen() {
  if (Platform.OS === 'web') return <WebFallback />;
  return <NativeGame />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gl: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingTitle: {
    color: '#f97316',
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 4,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 1,
  },
  webFallback: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 32,
  },
  gameTitle: {
    color: '#f97316',
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 4,
    marginBottom: 4,
  },
  webIcon: {
    fontSize: 64,
    marginVertical: 8,
  },
  webMessage: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  webHighlight: {
    color: '#f97316',
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  webSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 8,
  },
  webDivider: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  webFeatures: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 26,
    textAlign: 'left',
  },
});
