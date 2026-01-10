import React from 'react';
import { Video, StopCircle } from 'lucide-react';

const Controls = ({ recording, onStart, onStop }) => {
    return (
        <div className="flex justify-center items-center gap-4 mt-4">
            {!recording ? (
                <button
                    onClick={onStart}
                    className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-red-700 transition-all"
                >
                    <Video size={24} />
                    Start Recording
                </button>
            ) : (
                <button
                    onClick={onStop}
                    className="flex items-center gap-2 bg-gray-800 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-gray-900 transition-all border-2 border-red-500 animate-pulse"
                >
                    <StopCircle size={24} />
                    Stop Recording
                </button>
            )}
        </div>
    );
};

export default Controls;
