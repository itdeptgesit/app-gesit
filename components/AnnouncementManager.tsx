'use client';

import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Save, Send, Clock, Calendar, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface Announcement {
    id?: number;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'error' | 'success';
    is_active: boolean;
    created_at?: string;
    expires_at?: string;
}

export const AnnouncementManager: React.FC = () => {
    const { showToast } = useToast();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const [formData, setFormData] = useState<Announcement>({
        title: '',
        content: '',
        type: 'info',
        is_active: true
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            if (data) setAnnouncements(data);
        } catch (err: any) {
            console.warn("Announcement fetch error:", err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setStatusMsg(null);
        try {
            const { error } = await supabase.from('announcements').insert([formData]);
            if (error) throw error;

            setStatusMsg({ text: 'Broadcast deployment successful!', type: 'success' });
            setIsFormOpen(false);
            setFormData({ title: '', content: '', type: 'info', is_active: true });
            fetchData();
        } catch (err: any) {
            setStatusMsg({ text: `Deployment failed: ${err.message}. (Make sure 'announcements' table exists)`, type: 'error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setStatusMsg(null), 5000);
        }
    };

    const toggleStatus = async (id: number, currentStatus: boolean) => {
        try {
            const { error } = await supabase.from('announcements').update({ is_active: !currentStatus }).eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (err) {
            showToast("Failed to update status", "error");
        }
    };

    const confirmDelete = async () => {
        if (deleteId === null) return;
        try {
            const { error } = await supabase.from('announcements').delete().eq('id', deleteId);
            if (error) throw error;
            fetchData();
        } catch (err) {
            showToast("Failed to delete record", "error");
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <PageHeader title="System Broadcasts" description="Emergency & Info Center">
                <Button
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    variant={isFormOpen ? "outline" : "default"}
                    className="shrink-0"
                >
                    {isFormOpen ? 'Cancel Protocol' : <><Plus className="mr-2 h-4 w-4" /> New Broadcast</>}
                </Button>
            </PageHeader>

            {statusMsg && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 ${statusMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/20' : 'bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/20'}`}>
                    {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <p className="text-sm font-medium">{statusMsg.text}</p>
                </div>
            )}

            {isFormOpen && (
                <div className="bg-card p-6 rounded-xl border border-border/40 shadow-sm animate-in zoom-in-95 duration-200">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1.5">Broadcast Title</label>
                                    <Input
                                        required
                                        type="text"
                                        placeholder="Identification of the message..."
                                        className="bg-input/30 dark:bg-zinc-800"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1.5">Signal Type</label>
                                    <select
                                        className="w-full h-9 px-3 py-2 bg-input/30 dark:bg-zinc-800 border border-input rounded-md text-sm text-foreground outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    >
                                        <option value="info">Info (Blue)</option>
                                        <option value="warning">Warning (Amber)</option>
                                        <option value="error">Critical (Rose)</option>
                                        <option value="success">Success (Emerald)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground block mb-1.5">Message Content</label>
                                <Textarea
                                    required
                                    rows={5}
                                    placeholder="Enter full protocol details..."
                                    className="bg-input/30 dark:bg-zinc-800 resize-none min-h-[8rem]"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-border/40 bg-muted/10">
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="min-w-[150px]"
                            >
                                {isSaving ? <Clock className="animate-spin mr-2" size={16} /> : <Send size={16} className="mr-2" />}
                                Initiate Broadcast
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-10 text-center"><Clock className="animate-spin text-slate-300 mx-auto" size={24} /></div>
                ) : announcements.length === 0 ? (
                    <div className="col-span-full py-20 bg-muted/20 rounded-xl border border-dashed border-border/40 flex flex-col items-center justify-center text-muted-foreground">
                        <Megaphone size={32} className="opacity-20 mb-4" />
                        <p className="text-sm font-medium">No active communications</p>
                    </div>
                ) : announcements.map((ann) => (
                    <div key={ann.id} className="bg-card border border-border/40 rounded-xl p-6 shadow-sm flex flex-col justify-between group">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <Badge variant="outline" className={`text-xs font-medium ${ann.type === 'info' ? 'text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/10' :
                                    ann.type === 'warning' ? 'text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/10' :
                                        ann.type === 'error' ? 'text-rose-600 dark:text-rose-400 border-rose-500/20 bg-rose-500/10' :
                                            'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                                    }`}>
                                    {ann.type} Signal
                                </Badge>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(ann.id!)} className="h-7 w-7 text-muted-foreground hover:text-rose-600"><Trash2 size={14} /></Button>
                                </div>
                            </div>
                            <h3 className="font-semibold text-sm text-foreground tracking-tight mb-2">{ann.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-6 line-clamp-3">{ann.content}</p>
                        </div>

                        <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar size={12} />
                                <span className="text-xs">{ann.created_at ? new Date(ann.created_at).toLocaleDateString() : 'New'}</span>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => toggleStatus(ann.id!, ann.is_active)}
                                className={`h-8 rounded-md px-3 text-xs font-medium ${ann.is_active ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-0' : 'bg-muted text-muted-foreground hover:bg-muted/70 border-0'}`}
                            >
                                {ann.is_active ? 'Online' : 'Dark'}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently terminate this broadcast and remove the data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-rose-500 hover:bg-rose-600 text-white">Terminate</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

