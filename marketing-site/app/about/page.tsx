import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About Us - HireApp',
    description: 'Learn more about the team behind HireApp and our mission to revolutionize recruiting.',
};

export default function About() {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-8">About HireApp</h1>
            <div className="prose prose-lg text-gray-500 mx-auto">
                <p className="mb-4">
                    At HireApp, we believe that the traditional hiring process is broken. Resumes are static, interviews are biased, and the time-to-hire is painstakingly long.
                </p>
                <p className="mb-4">
                    That's why we built an AI-powered matchmaking platform. By leveraging Smart Video Interviews and state-of-the-art Natural Language Processing (via Gemini and Python models), we extract the true potential of a candidate. No more guessing.
                </p>
                <p>
                    Our mission is to instantly connect talent with opportunity, empowering both employers and job seekers to make better decisions, faster.
                </p>
            </div>
        </div>
    );
}
