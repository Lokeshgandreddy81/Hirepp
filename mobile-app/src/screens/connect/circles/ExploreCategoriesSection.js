import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconSearch } from '../../../components/Icons';
import CircleCard from './CircleCard';
import { theme } from '../../../theme/theme';

function ExploreCategoriesSectionComponent({ circles, onJoinCircle }) {
    const cards = useMemo(() => (
        circles.map((item) => (
            <CircleCard
                key={item._id}
                variant="explore"
                circle={item}
                onJoinCircle={onJoinCircle}
            />
        ))
    ), [circles, onJoinCircle]);

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
                <IconSearch size={16} color={theme.textMuted} />
                <Text style={styles.sectionTitle}>EXPLORE CATEGORIES</Text>
            </View>
            {cards}
        </View>
    );
}

export default memo(ExploreCategoriesSectionComponent);

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: theme.textPrimary,
        letterSpacing: 1,
    },
});
