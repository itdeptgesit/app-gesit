import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, Loader2, Sparkles, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { UserAccount } from '../types';
import { supabase } from '../lib/supabaseClient';

interface SystemStats {
  totalAssets: number;
  openTickets: number;
  totalUsers: number;
  totalDepts: number;
  totalSpend: number;
  activePorts: number;
  activeAnnouncements: number;
  totalExtensions: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantProps {
  currentUser?: UserAccount;
  variant?: 'floating' | 'inline';
}

export const AIAssistant = ({ currentUser, variant = 'floating' }: AIAssistantProps) => {
  const [isOpen, setIsOpen] = useState(variant === 'inline');
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Halo! Saya asisten AI Gesit ERP. Ada yang bisa saya bantu hari ini?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<SystemStats>({
    totalAssets: 0,
    openTickets: 0,
    totalUsers: 0,
    totalDepts: 0,
    totalSpend: 0,
    activePorts: 0,
    activeAnnouncements: 0,
    totalExtensions: 0
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { count: assetCount },
          { count: ticketCount },
          { count: userCount },
          { count: deptCount },
          { data: purchaseData },
          { count: portCount },
          { count: announcementCount },
          { count: extensionCount }
        ] = await Promise.all([
          supabase.from('it_assets').select('*', { count: 'exact', head: true }),
          supabase.from('helpdesk_tickets').select('*', { count: 'exact', head: true }).eq('status', 'Open'),
          supabase.from('user_accounts').select('*', { count: 'exact', head: true }),
          supabase.from('departments').select('*', { count: 'exact', head: true }),
          supabase.from('purchase_records').select('total_va').eq('status', 'Paid'),
          supabase.from('switch_ports').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
          supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('extension_directory').select('*', { count: 'exact', head: true })
        ]);

        const totalSpend = (purchaseData || []).reduce((sum, r) => sum + (Number(r.total_va) || 0), 0);

        setStats({
          totalAssets: assetCount || 0,
          openTickets: ticketCount || 0,
          totalUsers: userCount || 0,
          totalDepts: deptCount || 0,
          totalSpend,
          activePorts: portCount || 0,
          activeAnnouncements: announcementCount || 0,
          totalExtensions: extensionCount || 0
        });
      } catch (err) {
        console.error('Error fetching stats for AI:', err);
      }
    };

    fetchStats();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = `Anda adalah asisten cerdas untuk sistem Gesit ERP. Berikan jawaban yang ringkas, profesional, dan gunakan bahasa Indonesia yang baik.
Konteks Pengguna yang Sedang Mengobrol:
- Nama: ${currentUser?.fullName || 'Pengguna'}
- Peran (Role): ${currentUser?.role || 'User Biasa'}
- Departemen: ${currentUser?.department || 'Tidak diketahui'}

Statistik Sistem Saat Ini (Ground Truth):
- Total Aset IT: ${stats.totalAssets}
- Tiket Helpdesk Terbuka: ${stats.openTickets}
- Jumlah Pengguna Terdaftar: ${stats.totalUsers}
- Jumlah Departemen: ${stats.totalDepts}
- Total Pengeluaran Terverifikasi: Rp ${new Intl.NumberFormat('id-ID').format(stats.totalSpend)}
- Port Jaringan Aktif: ${stats.activePorts}
- Pengumuman Aktif: ${stats.activeAnnouncements}
- Total Kontak di Phone Directory: ${stats.totalExtensions}

Tugas Anda:
1. Berikan jawaban yang hangat, informatif, dan "pintar". Jangan hanya menyebutkan angka, tapi berikan sedikit konteks jika memungkinkan (misal: "Saat ini kita mengelola total **${stats.totalAssets} aset IT**...").
2. Gunakan format Markdown yang cantik (bold, list, atau tabel jika perlu) agar jawaban mudah dibaca.
3. Selalu gunakan data statistik yang diberikan sebagai dasar kebenaran utama. Jangan pernah katakan "saya tidak punya akses ke database".
4. Jika pengguna bertanya hal umum, hubungkan dengan fitur-fitur yang ada di Gesit ERP (Helpdesk, Asset Management, Weekly Plan, dll).

Instruksi Khusus Berdasarkan Role:
- **Admin / IT Support**: Berikan data secara transparan dan detail. Anda adalah rekan kerja yang handal bagi mereka. Bantu mereka melakukan analisis data cepat.
- **Staff / User**: Berikan jawaban yang membantu mereka melakukan tugas sehari-hari. Fokus pada "how-to" dan informasi umum. Jaga kerahasiaan data finansial yang sangat sensitif kecuali mereka berhak melihatnya.

Contoh Gaya Bahasa: "Berdasarkan data terbaru di sistem, saat ini kita memiliki **${stats.totalAssets} aset** yang tersebar di **${stats.totalDepts} departemen**. Ada juga **${stats.openTickets} tiket helpdesk** yang sedang menunggu penanganan Anda hari ini."`;

      const response = await supabase.functions.invoke('ai-chat', {
        body: {
          model: 'deepseek/deepseek-v4-flash:free',
          systemPrompt,
          messages: messages.map(m => ({ role: m.role, content: m.content })).concat({ role: 'user', content: userMsg.content })
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'AI service error');
      }

      const data = response.data;

      if (!data?.success) {
        throw new Error(data?.error || 'AI service returned an error');
      }

      const aiReply = data.content;

      if (!aiReply) {
        throw new Error('Empty response from AI');
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiReply
      }]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Terjadi kesalahan saat menghubungi server AI. Silakan coba lagi.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    if(confirm('Hapus semua riwayat obrolan?')) {
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: 'Halo! Saya asisten AI Gesit ERP. Ada yang bisa saya bantu hari ini?'
        }]);
    }
  };

  if (variant === 'inline') {
    return (
      <Card className="flex flex-col h-[650px] w-full shadow-2xl border-border/40 overflow-hidden bg-white/40 dark:bg-zinc-950/40 backdrop-blur-3xl rounded-2xl relative">
        {/* Decorative Background Elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/10 bg-white/20 dark:bg-white/5 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Bot className="size-5" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-foreground uppercase">Gesit Intelligence</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Operational & Data-Aware
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={clearChat} className="text-muted-foreground hover:bg-muted/50 h-9 w-9 rounded-xl transition-all" title="Clear Chat">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0 custom-scrollbar relative z-10">
          <div className="flex flex-col gap-6 pb-4">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-4 max-w-[85%]", msg.role === 'user' ? "self-end flex-row-reverse" : "self-start")}>
                <div className={cn(
                  "flex shrink-0 h-9 w-9 items-center justify-center rounded-xl shadow-lg transition-transform hover:scale-110",
                  msg.role === 'user' ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                )}>
                  {msg.role === 'user' ? <User className="size-4" /> : <Bot className="size-4" />}
                </div>
                <div className={cn(
                  "px-5 py-3.5 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm border",
                  msg.role === 'user' 
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent rounded-tr-sm" 
                    : "bg-white/80 dark:bg-zinc-900/80 border-border/40 rounded-tl-sm text-foreground prose prose-sm max-w-full dark:prose-invert prose-p:leading-relaxed"
                )}>
                  {msg.role === 'user' ? msg.content : <ReactMarkdown>{msg.content}</ReactMarkdown>}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 max-w-[80%] self-start">
                <div className="flex shrink-0 h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg animate-pulse">
                  <Bot className="size-4" />
                </div>
                <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-white/80 dark:bg-zinc-900/80 border border-border/40 shadow-sm flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-black uppercase tracking-widest">Analyzing ERP Cloud...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-5 border-t border-border/10 bg-white/20 dark:bg-white/5 shrink-0 relative z-10">
          <div className="relative flex items-center gap-3">
            <div className="relative flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about assets, tickets, or system health..."
                className="pr-12 h-14 rounded-2xl border-border/40 bg-white/50 dark:bg-zinc-900/50 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-0 text-sm font-semibold transition-all shadow-inner"
                disabled={isLoading}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/50 px-1.5 py-0.5 rounded">Enter</span>
              </div>
            </div>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white shadow-xl shadow-indigo-500/30 transition-all active:scale-95"
            >
              <Send className="size-5" strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Floating Button */}
      <div className={cn(
        "fixed bottom-6 right-6 z-50 transition-all duration-500 ease-in-out",
        isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
      )}>
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 hover:scale-110 transition-transform"
        >
          <Sparkles className="h-6 w-6 text-white" />
        </Button>
      </div>

      {/* Chat Window */}
      <div className={cn(
        "fixed z-50 transition-all duration-300 ease-in-out origin-bottom-right",
        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none",
        isExpanded 
            ? "bottom-0 right-0 w-full h-full sm:bottom-6 sm:right-6 sm:w-[800px] sm:h-[80vh] sm:rounded-2xl" 
            : "bottom-6 right-6 w-[380px] h-[600px] rounded-2xl max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)]"
      )}>
        <Card className="flex flex-col h-full w-full shadow-2xl border-border/20 overflow-hidden bg-background/95 backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Bot className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-none">Gesit AI Assistant</h3>
                <p className="text-[10px] text-white/70 mt-1">Powered by OpenRouter</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={clearChat} className="text-white hover:bg-white/20 h-8 w-8 rounded-lg" title="Clear Chat">
                <Trash2 className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="text-white hover:bg-white/20 hidden sm:flex h-8 w-8 rounded-lg">
                {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 h-8 w-8 rounded-lg">
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 bg-muted/10 overflow-y-auto min-h-0 custom-scrollbar">
            <div className="flex flex-col gap-4 pb-4">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-3 max-w-[85%]", msg.role === 'user' ? "self-end flex-row-reverse" : "self-start")}>
                  <div className={cn(
                    "flex shrink-0 h-8 w-8 items-center justify-center rounded-full shadow-sm",
                    msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
                  )}>
                    {msg.role === 'user' ? <User className="size-4" /> : <Bot className="size-4" />}
                  </div>
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm overflow-hidden",
                    msg.role === 'user' 
                      ? "bg-primary text-primary-foreground rounded-tr-sm break-words" 
                      : "bg-white dark:bg-slate-800 border shadow-sm rounded-tl-sm text-foreground prose prose-sm max-w-full dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted prose-pre:text-muted-foreground prose-pre:overflow-x-auto break-words"
                  )}>
                    {msg.role === 'user' ? (
                        msg.content
                    ) : (
                        <div className="overflow-x-auto">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 max-w-[80%] self-start">
                  <div className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
                    <Bot className="size-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border shadow-sm flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-indigo-500" />
                    <span className="text-xs text-muted-foreground font-medium">Sedang berpikir...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-3 border-t bg-background shrink-0">
            <div className="relative flex items-center">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanya sesuatu..."
                className="pr-12 h-12 rounded-xl border-muted-foreground/20 focus-visible:ring-indigo-500"
                disabled={isLoading}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 h-9 w-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};
