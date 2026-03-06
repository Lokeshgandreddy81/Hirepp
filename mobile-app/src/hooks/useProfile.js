import { useCallback, useState } from 'react';
import { fetchProfileCompletion } from '../services/authService';

export default function useProfile() {
    const [profileCompletion, setProfileCompletion] = useState(null);
    const [loadingProfileCompletion, setLoadingProfileCompletion] = useState(false);
    const [profileCompletionError, setProfileCompletionError] = useState('');

    const refreshProfileCompletion = useCallback(async () => {
        setLoadingProfileCompletion(true);
        setProfileCompletionError('');
        try {
            const { data } = await fetchProfileCompletion();
            setProfileCompletion(data?.completion || null);
        } catch (error) {
            setProfileCompletion(null);
            setProfileCompletionError(error?.message || 'Could not fetch profile completion.');
        } finally {
            setLoadingProfileCompletion(false);
        }
    }, []);

    return {
        profileCompletion,
        loadingProfileCompletion,
        profileCompletionError,
        refreshProfileCompletion,
    };
}
