import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebLayout } from '../../components/web/WebLayout';
import BudgetResultsScreen from '../(tourist)/budget-results';

export default function WebBudgetResultsScreen() {
  return (
    <View style={styles.root}>
      <WebLayout navVariant="tourist" scrollable={false}>
        <View style={styles.workspace}>
          <BudgetResultsScreen />
        </View>
      </WebLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  workspace: { flex: 1, maxWidth: 900, alignSelf: 'center', width: '100%' as any, paddingHorizontal: 40 },
});
