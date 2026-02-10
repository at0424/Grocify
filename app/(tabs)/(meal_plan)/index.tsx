import { fetchUserMealPlan } from '@/services/api';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, ClipboardList } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function MealPlanEmptyScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [mealPlan, setMealPlan] = useState(null);

    useEffect(() => {
        loadPlan();
    }, []);

    const loadPlan = async () => {
        setLoading(true);
        try {
            const data = await fetchUserMealPlan();
            setMealPlan(data);
        } catch (error) {
            console.error("Failed to load plan", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#7A9B6B" />
                <Text style={styles.loadingText}>Checking your schedule...</Text>
            </View>
        );
    };

    if (mealPlan) {
        return (
            <MealPlanDashboard plan={mealPlan} />
        );
    }

    // 4. Render: If No Plan -> Show Empty State (Your requested UI)
    return (
        <EmptyState router={router} />
    );
};

// --- SUB-COMPONENT: EMPTY STATE (Screen 1) ---
const EmptyState = ({ router }) => (
    <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft color="#FFFFFF" size={28} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Meal Plan</Text>
            <View style={{ width: 28 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
            <View style={styles.iconCircle}>
                {/* Using a placeholder image or icon for the clipboard/apple */}
                <ClipboardList color="#8E8E8E" size={64} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyText}>
                There is no meal plan now, create one!
            </Text>
        </View>

        {/* Footer Action */}
        <View style={styles.footer}>
            <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/create')} // Goes to Date Selection
            >
                <Text style={styles.primaryButtonText}>Create Plan</Text>
            </TouchableOpacity>
        </View>
    </SafeAreaView>
);

// --- SUB-COMPONENT: DASHBOARD (Screen 5 Placeholder) ---
const MealPlanDashboard = ({ plan }) => (
    <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
            <View style={{ width: 28 }} />
            <Text style={styles.headerTitle}>My Plan</Text>
            <View style={{ width: 28 }} />
        </View>
        <View style={styles.content}>
            <Text style={styles.emptyText}>Active Plan Found: {plan.title}</Text>
            <Text style={{ marginTop: 10, color: '#7A9B6B' }}>Dashboard UI coming soon...</Text>
        </View>
    </SafeAreaView>
);

// --- STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        marginTop: 12,
        color: '#8E8E8E',
        fontSize: 14,
    },
    // Header
    header: {
        backgroundColor: '#7A9B6B', // Sage Green
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    // Empty State Content
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: -40,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F5F5F5', // Light gray circle bg
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 16,
        color: '#8E8E8E',
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 24,
    },
    // Footer
    footer: {
        padding: 24,
        paddingBottom: 40,
    },
    primaryButton: {
        backgroundColor: '#7A9B6B',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#7A9B6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});