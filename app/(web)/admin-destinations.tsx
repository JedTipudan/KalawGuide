import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AdminShell } from '../../components/web/AdminShell';
import AdminDestinationsScreen from '../(admin)/destinations';

export default function WebAdminDestinationsScreen() {
  return (
    <AdminShell activeLabel="Destination Management">
      <View style={styles.workspace}>
        <AdminDestinationsScreen />
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  workspace: { flex: 1, padding: 32 },
});
