import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';

export default function ProfilesScreen({ navigation }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Edit Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingIndex, setEditingIndex] = useState(-1);
    const [editForm, setEditForm] = useState({
        roleName: '',
        experienceInRole: '',
        expectedSalary: '',
        skills: ''
    });

    const fetchProfile = useCallback(async () => {
        try {
            const { data } = await client.get('/api/users/profile');
            if (data.profile) {
                setProfile(data.profile);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            if (error.response?.status === 401) {
                // Logout if token invalid
                await SecureStore.deleteItemAsync('userInfo');
                // Reset to Login Stack by triggering logout logic effectively
                navigation.getParent()?.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                });
            } else {
                Alert.alert('Error', 'Could not fetch profile');
            }
        } finally {
            setLoading(false);
        }
    }, [navigation]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleLogout = async () => {
        await SecureStore.deleteItemAsync('userInfo');
        navigation.getParent()?.reset({
            index: 0,
            routes: [{ name: 'RoleSelection' }],
        });
    };

    const openEditModal = (role, index) => {
        setEditingIndex(index);
        setEditForm({
            roleName: role.roleName,
            experienceInRole: String(role.experienceInRole || 0),
            expectedSalary: String(role.expectedSalary || 0),
            skills: role.skills ? role.skills.join(', ') : ''
        });
        setIsModalVisible(true);
    };

    const handleSave = async () => {
        try {
            // Construct the updating roles array
            const updatedRoles = [...profile.roleProfiles];
            updatedRoles[editingIndex] = {
                ...updatedRoles[editingIndex],
                roleName: editForm.roleName,
                experienceInRole: parseInt(editForm.experienceInRole) || 0,
                expectedSalary: parseInt(editForm.expectedSalary) || 0,
                skills: editForm.skills.split(',').map(s => s.trim()).filter(s => s.length > 0)
            };

            // Optimistic UI Update (optional, but good for UX)
            // setProfile({ ...profile, roleProfiles: updatedRoles });

            const { data } = await client.put('/api/users/profile', { roleProfiles: updatedRoles });

            if (data.profile) {
                setProfile(data.profile);
                setIsModalVisible(false);
                Alert.alert('Success', 'Profile updated successfully!');
            }
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert('Error', 'Failed to update profile.');
        }
    };

    const handleDelete = (index) => {
        Alert.alert(
            'Delete Role',
            'Are you sure you want to delete this profile?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const updatedRoles = [...profile.roleProfiles];
                            updatedRoles.splice(index, 1);

                            // Optimistic update
                            const optimisticProfile = { ...profile, roleProfiles: updatedRoles };
                            setProfile(optimisticProfile);

                            const { data } = await client.put('/api/users/profile', { roleProfiles: updatedRoles });
                            if (data.profile) {
                                setProfile(data.profile);
                            }
                        } catch (error) {
                            console.error('Delete error:', error);
                            Alert.alert('Error', 'Failed to delete profile.');
                            // Revert on error would be ideal, but simple alert for now
                            fetchProfile();
                        }
                    }
                }
            ]
        );
    };

    const renderRoleCard = ({ item: role, index }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.roleTitle}>{role.roleName}</Text>
                    <Text style={styles.salary}>₹{role.expectedSalary ? role.expectedSalary.toLocaleString() : 0} / month</Text>
                    {/* Experience moved down here */}
                    <Text style={styles.experienceText}>
                        {role.experienceInRole || 0} years experience
                    </Text>
                </View>

                <View style={styles.headerActions}>
                    {index === 0 && (
                        <View style={styles.defaultBadge}>
                            <Text style={styles.defaultText}>DEFAULT</Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={() => handleDelete(index)} style={styles.deleteButton}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Description removed as requested to separate data */}

            <View style={styles.skillsContainer}>
                {role.skills?.map((skill, i) => (
                    <View key={i} style={styles.skillBadge}>
                        <Text style={styles.skillText}>{skill}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.locationContainer}>
                    <Ionicons name="location-outline" size={16} color="#9CA3AF" />
                    {/* Only Location here */}
                    <Text style={styles.locationText}>
                        {profile?.city || 'Location not set'}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => openEditModal(role, index)}>
                    <Text style={styles.editText}>EDIT</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>My Profiles</Text>
                    <Text style={styles.headerSubtitle}>Manage your skillsets</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={profile?.roleProfiles || []}
                renderItem={renderRoleCard}
                keyExtractor={(item) => item._id || Math.random().toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No profiles found.</Text>
                        <Text style={styles.emptySubtext}>Create one using the button below!</Text>
                    </View>
                }
            />

            {/* Floating Action Button for Create New (Video) */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('VideoRecord')}
            >
                <Ionicons name="videocam" size={28} color="#FFF" />
            </TouchableOpacity>

            {/* Edit Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Role Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.roleName}
                                    onChangeText={(t) => setEditForm({ ...editForm, roleName: t })}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.label}>Experience (Yrs)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editForm.experienceInRole}
                                        keyboardType="numeric"
                                        onChangeText={(t) => setEditForm({ ...editForm, experienceInRole: t })}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                    <Text style={styles.label}>Salary (₹/mo)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editForm.expectedSalary}
                                        keyboardType="numeric"
                                        onChangeText={(t) => setEditForm({ ...editForm, expectedSalary: t })}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Skills (Comma Separated)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={editForm.skills}
                                    multiline
                                    onChangeText={(t) => setEditForm({ ...editForm, skills: t })}
                                />
                            </View>

                            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280'
    },
    logoutButton: {
        padding: 8,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100, // Space for FAB
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    roleTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    salary: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7C3AED', // Purple
        marginTop: 4
    },
    experienceText: {
        fontSize: 14,
        color: '#4B5563',
        marginTop: 4,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    deleteButton: {
        padding: 4
    },
    defaultBadge: {
        backgroundColor: '#F5F3FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    defaultText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#7C3AED',
        textTransform: 'uppercase',
    },
    description: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
        marginBottom: 16,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    skillBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    skillText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#374151',
        textTransform: 'uppercase',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginLeft: 4,
        fontWeight: '500',
    },
    editText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#7C3AED',
        textTransform: 'uppercase',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        backgroundColor: '#7C3AED',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    row: {
        flexDirection: 'row',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: '#7C3AED',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
