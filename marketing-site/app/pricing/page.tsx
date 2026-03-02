import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pricing - HireApp',
    description: 'Simple, transparent pricing for teams of all sizes.',
};

export default function Pricing() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Transparent Pricing</h2>
                <p className="mt-4 text-xl text-gray-500">Start for free, upgrade when you need to scale.</p>
            </div>
            <div className="mt-16 grid gap-8 lg:grid-cols-3">
                {/* Starter Plan */}
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
                    <h3 className="text-2xl font-bold text-gray-900">Free</h3>
                    <p className="mt-4 text-gray-500">Perfect for exploring the platform.</p>
                    <div className="mt-6 text-5xl font-extrabold text-gray-900">$0</div>
                    <p className="mt-2 text-gray-500">3 free credits included</p>
                    <a href="#" className="mt-8 block w-full bg-blue-100 text-blue-700 rounded-md py-3 font-medium hover:bg-blue-200">Get Started</a>
                </div>

                {/* Pro Plan */}
                <div className="bg-blue-600 p-8 rounded-lg shadow-md border border-blue-700 text-center transform scale-105">
                    <h3 className="text-2xl font-bold text-white">Pro</h3>
                    <p className="mt-4 text-blue-100">Best for growing startups.</p>
                    <div className="mt-6 text-5xl font-extrabold text-white">$49<span className="text-2xl font-medium text-blue-200">/mo</span></div>
                    <p className="mt-2 text-blue-100">Unlimited jobs & matches</p>
                    <a href="#" className="mt-8 block w-full bg-white text-blue-600 rounded-md py-3 font-medium hover:bg-gray-50">Upgrade to Pro</a>
                </div>

                {/* Enterprise Plan */}
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
                    <h3 className="text-2xl font-bold text-gray-900">Enterprise</h3>
                    <p className="mt-4 text-gray-500">For high-volume recruiting teams.</p>
                    <div className="mt-6 text-5xl font-extrabold text-gray-900">Custom</div>
                    <p className="mt-2 text-gray-500">Dedicated account manager</p>
                    <a href="#" className="mt-8 block w-full bg-blue-100 text-blue-700 rounded-md py-3 font-medium hover:bg-blue-200">Contact Sales</a>
                </div>
            </div>
        </div>
    );
}
