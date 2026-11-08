import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebLayout } from '../../components/web/WebLayout';
import AddExpenseScreen from '../(tourist)/add-expense';

export default function WebAddExpenseScreen() {
  return (
    <View style={styles.root}>
      <WebLayout navVariant="tourist" scrollable={false}>
        <View style={styles.workspace}>
          <AddExpenseScreen />
        </View>
      </WebLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  workspace: { flex: 1, maxWidth: 700, alignSelf: 'center', width: '100%' as any, paddingHorizontal: 40 },
});
