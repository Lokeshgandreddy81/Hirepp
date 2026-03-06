import { useCallback, useState } from 'react';
import { fetchCandidateMatches } from '../services/jobService';

export default function useJobs() {
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [jobsError, setJobsError] = useState('');

    const refreshJobs = useCallback(async (params = {}) => {
        setLoadingJobs(true);
        setJobsError('');
        try {
            const { data } = await fetchCandidateMatches(params);
            const rows = Array.isArray(data) ? data : (Array.isArray(data?.matches) ? data.matches : []);
            setJobs(rows);
        } catch (error) {
            setJobs([]);
            setJobsError(error?.message || 'Could not fetch jobs.');
        } finally {
            setLoadingJobs(false);
        }
    }, []);

    return {
        jobs,
        loadingJobs,
        jobsError,
        refreshJobs,
    };
}
