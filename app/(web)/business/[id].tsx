import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebLayout } from '../../../components/web/WebLayout';
import { KalawAssistanceFAB } from '../../../components/assistant/KalawAssistanceFAB';
import BusinessDetailScreen from '../../(tourist)/business/[id]';
import { rw } from '../../../utils/responsive';

/**
 * Business detail on the website. The phone screen opened bare used to stretch across the whole
 * desktop window (full-width photo, no navigation); here it sits in a readable centered column.
 */
export default function WebBusinessDetailScreen() {
  return (
    <View style={styles.root}>
      <WebLayout navVariant="tourist" scrollable={false}>
        <View {...rw('pad0')} style={styles.workspace}>
          <BusinessDetailScreen />
        </View>
      </WebLayout>
      <KalawAssistanceFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  workspace: { flex: 1, maxWidth: 860, alignSelf: 'center', width: '100%' as any, paddingHorizontal: 24 },
});
