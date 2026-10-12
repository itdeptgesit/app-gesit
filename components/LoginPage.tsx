'use client';

import React, { useState, useEffect } from 'react';
import { 
    AlertCircle, ShieldCheck, CheckCircle2, ArrowRight, Loader2,
    Mail, Lock, Eye, EyeOff, Sun, Moon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../translations';
import { sendPasswordResetNotificationEmail } from '../utils/EmailSystemUtils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface LoginPageProps {
    onLogin: (email: string) => void;
    appName?: string;
    logoUrl?: string;
    primaryColor?: string;
    userGroups?: string[];
}

export const LoginPage: React.FC<LoginPageProps> = ({
    onLogin,
    userGroups = [],
    appName = 'GESIT PORTAL',
    logoUrl = '/image/logo.png',
    primaryColor = '#0a2558'
}) => {
    const { t } = useLanguage();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isResetMode, setIsResetMode] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [isDark, setIsDark] = useState(false);


    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        if (newTheme) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            let finalEmail = identifier.trim();
            if (!finalEmail.includes('@')) {
                const { data: userData, error: userError } = await supabase
                    .from('user_accounts')
                    .select('email')
                    .eq('username', finalEmail.toLowerCase())
                    .maybeSingle();

                if (userError) throw new Error(`Directory error: ${userError.message}`);
                if (!userData) throw new Error("Identity not recognized.");
                finalEmail = userData.email;
            }

            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: finalEmail,
                password: password,
            });

            if (authError) throw authError;
            if (data.session?.user?.email) {
                onLogin(data.session.user.email);
            }
        } catch (err: any) {
            console.error("LoginPage: Login failure detail:", err);
            setError(err.message || "Access denied.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
                redirectTo: `${window.location.origin}/`,
            });
            if (error) throw error;
            
            // Send additional explicit notification via Resend API
            await sendPasswordResetNotificationEmail(identifier);
            
            setResetSent(true);
        } catch (err: any) {
            setError(err.message || "Could not send reset link.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/login',
                    queryParams: {
                        prompt: 'select_account' // Forces Google to show the account picker
                    }
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || "Could not initiate Google login.");
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-full bg-background text-foreground flex flex-col font-sans selection:bg-blue-100 transition-colors duration-300 overflow-hidden">
            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.35; transform: scale(1.05); }
                    50% { opacity: 0.5; transform: scale(1); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 8s ease-in-out infinite;
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .text-shimmer {
                    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%);
                    background-size: 200% 100%;
                    animation: shimmer 3s infinite;
                    -webkit-background-clip: padding-box;
                    background-clip: padding-box;
                }
            `}</style>
            <main className="flex-1 flex items-stretch overflow-hidden">
                {/* Left Hero Side - Background Image */}
                <div className="hidden lg:flex w-[45%] relative overflow-hidden flex-col justify-between p-24">
                    {/* Background Layer */}
                    <div className="absolute inset-0" style={{ backgroundColor: primaryColor }}>
                        <motion.img
                            initial={{ scale: 1.1, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.6 }}
                            transition={{ duration: 2, ease: "easeOut" }}
                            src="/image/bg.jpeg"
                            alt="Background"
                            fetchPriority="high"
                            loading="eager"
                            className="w-full h-full object-cover mix-blend-multiply"
                        />
                        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom right, ${primaryColor}66, ${primaryColor}E6)` }}></div>

                        {/* Glass Overlay for depth */}
                        <div className="absolute inset-0 backdrop-blur-[2px] pointer-events-none"></div>

                        {/* Dynamic Light Orbs */}
                        <motion.div
                            animate={{
                                opacity: [0.1, 0.2, 0.1],
                                scale: [1, 1.1, 1],
                            }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-[-5%] right-[-5%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] transform-gpu"
                        ></motion.div>
                        <motion.div
                            animate={{
                                opacity: [0.1, 0.3, 0.1],
                                scale: [1, 1.2, 1],
                            }}
                            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                            className="absolute bottom-[5%] left-[-5%] w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px] transform-gpu"
                        ></motion.div>
                    </div>

                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            {/* Logo Section */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="mb-16"
                            >
                                <div className="w-28 h-28 flex items-center justify-center hover:scale-110 transition-transform duration-500 group relative">
                                    <div className="absolute inset-0 bg-white/5 rounded-xl blur-2xl group-hover:bg-white/10 transition-colors"></div>
                                    <img src={logoUrl} alt="Logo" fetchPriority="high" loading="eager" className="w-full h-full object-contain filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-hover:brightness-110 transition-all z-10" />
                                </div>
                            </motion.div>

                            <div className="space-y-12 max-w-full">
                                <div>
                                    <motion.h1
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                                        className="text-4xl lg:text-6xl font-black text-white leading-tight tracking-tighter mb-4"
                                    >
                                        <span className="block opacity-40 text-xl tracking-widest font-medium mb-1 uppercase">Welcome to</span>
                                        <span className="bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/60 drop-shadow-2xl uppercase">
                                            {appName}
                                        </span>
                                    </motion.h1>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.6, delay: 0.5 }}
                                        className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                        <span className="text-[10px] font-medium text-white/80 tracking-wide">
                                            Integrated business ecosystem
                                        </span>
                                    </motion.div>
                                </div>

                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.8 }}
                                    transition={{ duration: 1, delay: 0.7 }}
                                    className="text-white text-base leading-relaxed font-medium max-w-lg drop-shadow-lg"
                                >
                                    Empowering your professional workflow with integrated management tools — designed for growth and operational excellence.
                                </motion.p>

                                <div className="flex gap-6">
                                    {[
                                        { emoji: '⚡', label: 'Performance', value: 'High Speed' },
                                        { emoji: '🛡️', label: 'Protection', value: 'Deep Security' }
                                    ].map((badge, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.6, delay: 0.8 + (i * 0.1) }}
                                            className="bg-white/[0.03] backdrop-blur-3xl px-5 py-4 rounded-xl border border-white/10 flex items-center gap-3 hover:bg-white/[0.08] transition-all group"
                                        >
                                            <span className="text-2xl group-hover:scale-110 transition-transform">{badge.emoji}</span>
                                            <div>
                                                <div className="text-[9px] font-medium text-white/40 mb-0.5">{badge.label}</div>
                                                <div className="text-[11px] font-bold text-white tracking-tight">{badge.value}</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 1.2 }}
                            className="flex flex-col gap-6"
                        >
                            <div className="flex gap-3 items-center">
                                <div className="h-px w-10 bg-white/20"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
                            </div>
                            <div className="space-y-1 opacity-20">
                                <p className="text-[9px] font-medium text-white tracking-wide">
                                    © 2026 Gesit Portal Ecosystem
                                </p>
                                <p className="text-[9px] font-medium text-white">
                                    <span className="uppercase">{appName}</span> v3.0.1 — Create IT Dev Gesit
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Right Login Side */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background/50 relative overflow-hidden transition-all duration-500">
                    {/* Animated Background Orbs */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <motion.div
                            animate={{
                                x: [0, 50, 0],
                                y: [0, 30, 0],
                            }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute top-20 -right-20 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] transform-gpu"
                        />
                        <motion.div
                            animate={{
                                x: [0, -50, 0],
                                y: [0, -30, 0],
                            }}
                            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                            className="absolute -bottom-20 -left-20 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] transform-gpu"
                        />
                    </div>

                    {/* Theme Toggle Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="absolute top-8 right-8 w-12 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 z-50 transition-all duration-300"
                    >
                        {isDark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
                    </Button>

                    <div className="w-full max-w-[460px] relative z-10 mx-auto">
                        <AnimatePresence mode="wait">
                            {resetSent ? (
                                <motion.div
                                    key="reset-success"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <Card className="border-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-xl overflow-hidden">
                                        <CardContent className="pt-12 pb-12 px-10 text-center space-y-8">
                                            <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-500/5">
                                                <CheckCircle2 size={48} className="animate-in zoom-in duration-500" />
                                            </div>
                                            <div className="space-y-4">
                                                <h4 className="text-3xl font-black text-slate-950 dark:text-white tracking-tighter leading-none">Email Sent</h4>
                                                <p className="text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
                                                    A recovery link has been sent to your inbox. Please check your email and follow the instructions.
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => { setResetSent(false); setIsResetMode(false); }}
                                                className="w-full font-medium transition-all"
                                            >
                                                Return to Login Page
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={isResetMode ? "reset-mode" : "login-mode"}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                >
                                    <Card className="border border-slate-200 dark:border-white/5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-xl overflow-hidden">
                                        <CardHeader className="pt-8 px-10 pb-6">
                                            {/* Mobile/Tablet Logo */}
                                            <div className="lg:hidden mb-8 flex flex-col items-center text-center gap-4">
                                                <div className="w-20 h-20 p-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl flex items-center justify-center">
                                                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                                </div>
                                                <div>
                                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{appName}</h2>
                                                    <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.3em] mt-1">Infrastructure Access</p>
                                                </div>
                                            </div>
                                            
                                            <CardTitle className="text-3xl font-black tracking-tighter mb-2">
                                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-950 via-slate-800 to-slate-700 dark:from-white dark:via-white dark:to-slate-400">
                                                    {isResetMode ? 'Recovery' : 'Sign In'}
                                                </span>
                                            </CardTitle>
                                            <CardDescription className="text-slate-500 dark:text-zinc-400 text-xs font-medium leading-relaxed">
                                                {isResetMode 
                                                    ? 'Identity verification required for restoration.' 
                                                    : 'Welcome back! Enter credentials to access ecosystem.'}
                                            </CardDescription>
                                        </CardHeader>
                                        
                                        <CardContent className="px-10 pb-6">
                                            {error && (
                                                <Alert variant="destructive" className="mb-6 bg-rose-500/10 border-rose-500/20 rounded-xl p-3">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertDescription className="text-[10px] font-bold leading-relaxed ml-1">{error}</AlertDescription>
                                                </Alert>
                                            )}

                                            <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-5">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 ml-1">Identity identifier</Label>
                                                    <div className="relative group">
                                                        <Mail size={18} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-950 dark:group-focus-within:text-white transition-all z-10" />
                                                        <Input
                                                            className="h-12 pl-12 pr-4 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] focus:ring-2 focus:ring-primary/5 font-bold text-xs"
                                                            placeholder="Email or username"
                                                            type="text"
                                                            value={identifier}
                                                            onChange={(e) => setIdentifier(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                {!isResetMode && (
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 ml-1">Key authority</Label>
                                                        <div className="relative group">
                                                            <Lock size={18} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-950 dark:group-focus-within:text-white transition-all z-10" />
                                                            <Input
                                                                className="h-12 pl-12 pr-12 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] focus:ring-2 focus:ring-primary/5 font-bold text-xs"
                                                                placeholder="Password"
                                                                type={showPassword ? "text" : "password"}
                                                                value={password}
                                                                onChange={(e) => setPassword(e.target.value)}
                                                                required
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                type="button"
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                            >
                                                                {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                <Button
                                                    type="submit"
                                                    disabled={isLoading}
                                                    className="w-full font-bold text-[13px] tracking-tight transition-all hover:translate-y-[-1px]"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Sign in now'}
                                                </Button>
                                            </form>

                                            <div className="mt-8 flex flex-col items-center gap-6">
                                                <Button
                                                    variant="link"
                                                    onClick={() => setIsResetMode(!isResetMode)}
                                                    className="h-auto text-[10px] font-bold tracking-tight"
                                                    style={{ color: primaryColor }}
                                                >
                                                    {isResetMode ? 'Return to login' : 'Forgot your password?'}
                                                </Button>

                                                <div className="w-full flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
                                                    <span className="text-[8px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">Connect</span>
                                                    <div className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    onClick={handleGoogleLogin}
                                                    disabled={isLoading}
                                                    className="w-full border-slate-200 dark:border-white/10 gap-2 text-[10px] font-bold uppercase tracking-widest"
                                                >
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                        <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
                                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.18l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                    </svg>
                                                    Google Account
                                                </Button>
                                            </div>
                                        </CardContent>

                                        <CardFooter className="px-10 pb-10 pt-0 flex flex-col gap-4">
                                            <div className="w-full h-px bg-slate-100 dark:bg-white/5" />
                                            <div className="flex flex-col items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => window.location.href = 'mailto:it@gesit.co.id'}
                                                    className="text-[9px] font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-all"
                                                >
                                                    Support Division
                                                </button>
                                                <div className="flex items-center gap-4 text-slate-400/50">
                                                    <a href="/privacy" className="text-[8px] font-bold hover:text-primary transition-all uppercase tracking-widest">Privacy</a>
                                                    <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-zinc-800" />
                                                    <a href="/terms" className="text-[8px] font-bold hover:text-primary transition-all uppercase tracking-widest">Terms</a>
                                                </div>
                                            </div>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

            </main>
        </div>
    );
};
