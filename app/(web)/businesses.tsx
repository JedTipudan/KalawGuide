import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebLayout } from '../../components/web/WebLayout';
import { KalawAssistanceFAB } from '../../components/assistant/KalawAssistanceFAB';
import BusinessesScreen from '../(tourist)/(tabs)/businesses';

export default function WebBusinessesScreen() {
  return (
    <View style={styles.root}>
      <WebLayout navVariant="tourist" scrollable={false}>
        <View style={styles.workspace}>
          <BusinessesScreen />
        </View>
      </WebLayout>
      <KalawAssistanceFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  workspace: { flex: 1, maxWidth: 1100, alignSelf: 'center', width: '100%' as any, paddingHorizontal: 40 },
});
