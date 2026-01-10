import React from 'react';

const QuestionOverlay = () => {
    return (
        <div className="absolute top-4 left-4 right-4 bg-black/60 backdrop-blur-sm p-4 rounded-xl border border-white/20 text-white z-10">
            <h3 className="text-sm uppercase tracking-wider text-gray-300 mb-1">Current Question</h3>
            <p className="text-lg font-medium leading-relaxed">
                "Tell us about yourself and your relevant experience."
            </p>
        </div>
    );
};

export default QuestionOverlay;
