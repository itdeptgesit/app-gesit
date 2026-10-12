import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TermsOfService: React.FC = () => {
    const navigate = useNavigate();
    
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 p-6 md:p-12 lg:p-24 selection:bg-blue-100 transition-colors duration-300">
            <div className="max-w-4xl mx-auto space-y-8">
                <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors">
                    <ArrowLeft size={16} /> Back to Sign In
                </button>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-xl shadow-xl border border-slate-200 dark:border-zinc-800">
                    <h1 className="text-3xl md:text-4xl font-black mb-8">Terms of Service</h1>
                    <div className="prose dark:prose-invert max-w-none space-y-6">
                        <p><strong>Effective Date:</strong> January 2026</p>
                        
                        <h3 className="text-xl font-bold">1. Agreement to Terms</h3>
                        <p>These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and GESIT PORTAL ("we," "us," or "our"), concerning your access to and use of our application as well as any other media form, media channel, mobile website, or mobile application related, linked, or otherwise connected thereto.</p>
                        
                        <h3 className="text-xl font-bold">2. User Representations</h3>
                        <p>By using the Site, you represent and warrant that:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>All registration information you submit will be true, accurate, current, and complete.</li>
                            <li>You will maintain the accuracy of such information and promptly update such registration information as necessary.</li>
                            <li>You have the legal capacity and you agree to comply with these Terms of Service.</li>
                            <li>You will not access the Site through automated or non-human means, whether through a bot, script, or otherwise.</li>
                        </ul>
                        
                        <h3 className="text-xl font-bold">3. Acceptable Use</h3>
                        <p>You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.</p>
                        
                        <h3 className="text-xl font-bold">4. Modifications and Interruptions</h3>
                        <p>We reserve the right to change, modify, or remove the contents of the Site at any time or for any reason at our sole discretion without notice. However, we have no obligation to update any information on our Site. We will not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the Site.</p>
                        
                        <h3 className="text-xl font-bold">5. Governing Law</h3>
                        <p>These Terms shall be governed by and defined following the laws of Indonesia. GESIT PORTAL and yourself irrevocably consent that the courts of Indonesia shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these terms.</p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

