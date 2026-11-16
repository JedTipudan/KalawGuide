import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebLayout } from '../../components/web/WebLayout';
import MapScreen from '../(tourist)/map';
import { rw } from '../../utils/responsive';

export default function WebMapScreen() {
  return (
    <View style={styles.root}>
      <WebLayout navVariant="tourist" scrollable={false}>
        <View {...rw('pad0')} style={styles.workspace}>
          <MapScreen />
        </View>
      </WebLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  workspace: { flex: 1, maxWidth: 1200, alignSelf: 'center', width: '100%' as any, paddingHorizontal: 40, paddingVertical: 16 },
});
