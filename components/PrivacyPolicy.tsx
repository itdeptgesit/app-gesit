import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PrivacyPolicy: React.FC = () => {
    const navigate = useNavigate();
    
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 p-6 md:p-12 lg:p-24 selection:bg-blue-100 transition-colors duration-300">
            <div className="max-w-4xl mx-auto space-y-8">
                <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors">
                    <ArrowLeft size={16} /> Back to Sign In
                </button>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-xl shadow-xl border border-slate-200 dark:border-zinc-800">
                    <h1 className="text-3xl md:text-4xl font-black mb-8">Privacy Policy</h1>
                    <div className="prose dark:prose-invert max-w-none space-y-6">
                        <p><strong>Effective Date:</strong> January 2026</p>
                        
                        <h3 className="text-xl font-bold">1. Introduction</h3>
                        <p>Welcome to GESIT PORTAL (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our application. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.</p>
                        
                        <h3 className="text-xl font-bold">2. Information We Collect</h3>
                        <p>We may collect information about you in a variety of ways. The information we may collect via the Application includes:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information that you voluntarily give to us when you register with the Application.</li>
                            <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Application, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Application.</li>
                        </ul>
                        
                        <h3 className="text-xl font-bold">3. Use of Your Information</h3>
                        <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Create and manage your account.</li>
                            <li>Email you regarding your account or order.</li>
                            <li>Fulfill and manage purchases, orders, payments, and other transactions related to the Application.</li>
                            <li>Increase the efficiency and operation of the Application.</li>
                        </ul>
                        
                        <h3 className="text-xl font-bold">4. Security of Your Information</h3>
                        <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>
                        
                        <h3 className="text-xl font-bold">5. Contact Us</h3>
                        <p>If you have questions or comments about this Privacy Policy, please contact us at: <br/><strong>it@gesit.co.id</strong></p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

