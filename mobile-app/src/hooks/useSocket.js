import { useEffect } from 'react';
import SocketService from '../services/socket';

export default function useSocket(event, handler) {
    useEffect(() => {
        if (!event || typeof handler !== 'function') return undefined;
        SocketService.on(event, handler);
        return () => {
            SocketService.off(event, handler);
        };
    }, [event, handler]);
}
