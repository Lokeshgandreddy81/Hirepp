import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Features - HireApp',
    description: 'Explore the powerful features of HireApp including Smart Video Interviews and AI Matchmaking.',
};

export default function Features() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Platform Features</h2>
                <p className="mt-4 text-xl text-gray-500">Everything you need to hire better and faster.</p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
                {/* Feature 1 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Video Profiles</h3>
                    <p className="text-gray-500">Candidates record a 60-second video. Our AI extracts skills, experience, and location instantly.</p>
                </div>
                {/* Feature 2 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">AI Matchmaking</h3>
                    <p className="text-gray-500">Our Python-powered engine scores applicants against your job descriptions using semantic matching.</p>
                </div>
                {/* Feature 3 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Real-time Analytics</h3>
                    <p className="text-gray-500">Track your hiring funnel, view bottleneck insights, and optimize your recruiting pipeline.</p>
                </div>
            </div>
        </div>
    );
}
