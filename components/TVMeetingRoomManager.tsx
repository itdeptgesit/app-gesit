import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  CloudUpload,
  Copy,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface TVInputSource {
  id: string;
  type: 'hdmi' | 'airplay';
  port: string | null;
  label: string;
  label_en?: string;
  enabled: boolean;
}

interface TVDevice {
  id: string;
  device_code: string;
  room_name: string;
  location: string | null;
  calendar_id: string | null;
  timezone: string;
  hdmi_label: string;
  input_sources: TVInputSource[];
  default_language: 'id' | 'en';
  wallpaper_url: string | null;
  hero_messages: string[];
  hero_messages_en: string[];
  menu_flags: Record<string, boolean>;
  emergency_contact: string | null;
  sync_interval_seconds: number;
  is_active: boolean;
  last_seen_at: string | null;
  app_version: string | null;
  updated_at: string;
}

type DeviceDraft = Omit<TVDevice, 'id' | 'last_seen_at' | 'app_version' | 'updated_at'>;

const MENU_OPTIONS = [
  ['corporate_tv', 'Corporate TV'],
  ['presentation', 'Presentasi'],
  ['screen_cast', 'Screen Cast'],
  ['schedule', 'Jadwal Ruang'],
  ['settings', 'Pengaturan'],
  ['emergency', 'Emergency'],
] as const;

const DEFAULT_MENU_FLAGS = Object.fromEntries(MENU_OPTIONS.map(([key]) => [key, true]));

const createDraft = (): DeviceDraft => ({
  device_code: '',
  room_name: '',
  location: '',
  calendar_id: '',
  timezone: 'Asia/Jakarta',
  hdmi_label: 'HDMI 2',
  input_sources: [],
  default_language: 'id',
  wallpaper_url: '',
  hero_messages: [
    'Selamat datang di ruang meeting GESIT.',
    'Rapat lebih nyaman, kolaborasi lebih cepat.',
  ],
  hero_messages_en: [
    'Welcome to the GESIT meeting room.',
    'More comfortable meetings, faster collaboration.',
  ],
  menu_flags: { ...DEFAULT_MENU_FLAGS },
  emergency_contact: '',
  sync_interval_seconds: 60,
  is_active: true,
});

const toDraft = (device: TVDevice): DeviceDraft => ({
  device_code: device.device_code,
  room_name: device.room_name,
  location: device.location ?? '',
  calendar_id: device.calendar_id ?? '',
  timezone: device.timezone || 'Asia/Jakarta',
  hdmi_label: device.hdmi_label || 'HDMI 2',
  input_sources: Array.isArray(device.input_sources) ? device.input_sources : [],
  default_language: device.default_language === 'en' ? 'en' : 'id',
  wallpaper_url: device.wallpaper_url ?? '',
  hero_messages: Array.isArray(device.hero_messages) ? device.hero_messages : [],
  hero_messages_en: Array.isArray(device.hero_messages_en) ? device.hero_messages_en : [],
  menu_flags: { ...DEFAULT_MENU_FLAGS, ...(device.menu_flags || {}) },
  emergency_contact: device.emergency_contact ?? '',
  sync_interval_seconds: device.sync_interval_seconds || 60,
  is_active: device.is_active,
});

const isOnline = (lastSeen: string | null) => {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 3 * 60 * 1000;
};

const inputLabel = 'text-[11px] font-black uppercase tracking-[0.12em] text-slate-500';
const panel = 'rounded-2xl border border-border/60 bg-card';

export const TVMeetingRoomManager: React.FC<{ currentUser?: any }> = ({ currentUser }) => {
  const { showToast } = useToast();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [devices, setDevices] = useState<TVDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DeviceDraft>(createDraft());
  const [heroText, setHeroText] = useState(draft.hero_messages.join('\n'));
  const [heroTextEn, setHeroTextEn] = useState(draft.hero_messages_en.join('\n'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const selected = useMemo(
    () => devices.find((device) => device.id === selectedId) ?? null,
    [devices, selectedId],
  );

  const onlineCount = devices.filter((device) => isOnline(device.last_seen_at)).length;
  const calendarCount = devices.filter((device) => Boolean(device.calendar_id)).length;

  const loadDevices = async (preferredId?: string | null) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tv_devices')
      .select('*')
      .order('room_name', { ascending: true });

    if (error) {
      showToast(`Data TV gagal dimuat: ${error.message}`, 'error');
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as TVDevice[];
    setDevices(rows);
    const nextId = preferredId ?? selectedId ?? rows[0]?.id ?? null;
    setSelectedId(nextId);
    setLoading(false);
  };

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (!selected || showEditor) return;
    const next = toDraft(selected);
    setDraft(next);
    setHeroText(next.hero_messages.join('\n'));
    setHeroTextEn(next.hero_messages_en.join('\n'));
  }, [selected, showEditor]);

  const beginCreate = () => {
    const next = createDraft();
    setSelectedId(null);
    setDraft(next);
    setHeroText(next.hero_messages.join('\n'));
    setHeroTextEn(next.hero_messages_en.join('\n'));
    setShowEditor(true);
  };

  const beginEdit = (device: TVDevice) => {
    const next = toDraft(device);
    setSelectedId(device.id);
    setDraft(next);
    setHeroText(next.hero_messages.join('\n'));
    setHeroTextEn(next.hero_messages_en.join('\n'));
    setShowEditor(true);
  };

  const cancelEditor = () => {
    setShowEditor(false);
    if (selected) {
      const next = toDraft(selected);
      setDraft(next);
      setHeroText(next.hero_messages.join('\n'));
      setHeroTextEn(next.hero_messages_en.join('\n'));
    }
  };

  const saveDevice = async () => {
    const deviceCode = draft.device_code.trim().toUpperCase().replace(/\s+/g, '-');
    const roomName = draft.room_name.trim();
    const messages = heroText.split('\n').map((line) => line.trim()).filter(Boolean);
    const messagesEn = heroTextEn.split('\n').map((line) => line.trim()).filter(Boolean);

    if (!deviceCode || !roomName) {
      showToast('Device ID dan nama ruang wajib diisi.', 'error');
      return;
    }
    if (messages.length === 0) {
      showToast('Isi minimal satu hero text.', 'error');
      return;
    }
    if (draft.input_sources.some((source) => !source.label.trim() || (source.type === 'hdmi' && !source.port))) {
      showToast('Setiap sumber aktif harus memiliki nama dan port HDMI.', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      ...draft,
      device_code: deviceCode,
      room_name: roomName,
      location: draft.location?.trim() || null,
      calendar_id: draft.calendar_id?.trim() || null,
      wallpaper_url: draft.wallpaper_url?.trim() || null,
      emergency_contact: draft.emergency_contact?.trim() || null,
      hero_messages: messages,
      hero_messages_en: messagesEn,
      sync_interval_seconds: Number(draft.sync_interval_seconds),
      updated_by: currentUser?.email || currentUser?.fullName || null,
    };

    const query = selectedId
      ? supabase.from('tv_devices').update(payload).eq('id', selectedId).select().single()
      : supabase.from('tv_devices').insert(payload).select().single();
    const { data, error } = await query;

    if (error) {
      showToast(`Konfigurasi gagal disimpan: ${error.message}`, 'error');
      setSaving(false);
      return;
    }

    await supabase.from('tv_device_audit_logs').insert({
      device_id: data.id,
      device_code: data.device_code,
      action: selectedId ? 'config_updated' : 'device_created',
      changed_by: currentUser?.email || currentUser?.fullName || null,
      changes: payload,
    });

    setShowEditor(false);
    await loadDevices(data.id);
    showToast('Konfigurasi TV berhasil dipublikasikan.', 'success');
    setSaving(false);
  };

  const deleteDevice = async (device: TVDevice) => {
    if (!window.confirm(`Hapus ${device.room_name} (${device.device_code})?`)) return;
    const { error } = await supabase.from('tv_devices').delete().eq('id', device.id);
    if (error) {
      showToast(`Perangkat gagal dihapus: ${error.message}`, 'error');
      return;
    }
    setShowEditor(false);
    setSelectedId(null);
    await loadDevices(null);
    showToast('Perangkat TV dihapus.', 'success');
  };

  const uploadWallpaper = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Format wallpaper harus JPG, PNG, atau WEBP.', 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('Ukuran wallpaper maksimal 8 MB.', 'error');
      return;
    }

    setUploading(true);
    const safeCode = (draft.device_code || 'new-device').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${safeCode}/wallpaper-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from('tv-wallpapers').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

    if (error) {
      showToast(`Wallpaper gagal diunggah: ${error.message}`, 'error');
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('tv-wallpapers').getPublicUrl(path);
    setDraft((current) => ({ ...current, wallpaper_url: data.publicUrl }));
    setUploading(false);
    showToast('Wallpaper siap. Klik Publish untuk menyimpan.', 'success');
  };

  const copyDeviceId = async (deviceCode: string) => {
    await navigator.clipboard.writeText(deviceCode);
    showToast('Device ID disalin.', 'success');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <PageHeader title="TV Meeting Room" description="Konfigurasi launcher, kalender ruang, dan status perangkat">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadDevices()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={beginCreate}><Plus className="mr-2 h-4 w-4" /> Tambah TV</Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat title="Perangkat" value={devices.length} subtitle={`${devices.filter((item) => item.is_active).length} aktif`} icon={<Monitor />} tone="blue" />
        <Stat title="Online" value={onlineCount} subtitle="Heartbeat < 3 menit" icon={<Wifi />} tone="emerald" />
        <Stat title="Calendar" value={calendarCount} subtitle={`${devices.length - calendarCount} belum terhubung`} icon={<CalendarDays />} tone="amber" />
      </div>

      <div className="grid min-h-[620px] gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className={`${panel} overflow-hidden`}>
          <div className="border-b border-border/60 px-5 py-4">
            <p className="text-sm font-black text-foreground">Daftar ruang</p>
            <p className="text-xs text-muted-foreground">Pilih perangkat untuk melihat konfigurasi</p>
          </div>
          <div className="max-h-[680px] space-y-2 overflow-y-auto p-3">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat perangkat</div>
            ) : devices.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center px-5 text-center">
                <Monitor className="mb-3 h-9 w-9 text-slate-300" />
                <p className="text-sm font-bold">Belum ada perangkat</p>
                <p className="mt-1 text-xs text-muted-foreground">Jalankan migration lalu tambah TV pertama.</p>
              </div>
            ) : devices.map((device) => {
              const online = isOnline(device.last_seen_at);
              const active = selectedId === device.id;
              return (
                <button
                  key={device.id}
                  type="button"
                  onClick={() => { setSelectedId(device.id); setShowEditor(false); }}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${active ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-transparent hover:border-border hover:bg-muted/50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-foreground">{device.room_name}</p>
                      <p className="mt-0.5 truncate font-mono text-[10px] font-bold tracking-wide text-muted-foreground">{device.device_code}</p>
                    </div>
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    <span>{device.hdmi_label}</span>
                    <span>{online ? 'Online' : 'Offline'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`${panel} overflow-hidden`}>
          {showEditor ? (
            <DeviceEditor
              draft={draft}
              setDraft={setDraft}
              heroText={heroText}
              setHeroText={setHeroText}
              heroTextEn={heroTextEn}
              setHeroTextEn={setHeroTextEn}
              saving={saving}
              uploading={uploading}
              uploadRef={uploadRef}
              onUpload={uploadWallpaper}
              onSave={saveDevice}
              onCancel={cancelEditor}
              title={selectedId ? 'Edit konfigurasi TV' : 'Daftarkan TV baru'}
            />
          ) : selected ? (
            <DeviceDetail
              device={selected}
              onEdit={() => beginEdit(selected)}
              onDelete={() => deleteDevice(selected)}
              onCopy={() => copyDeviceId(selected.device_code)}
            />
          ) : (
            <div className="flex min-h-[620px] flex-col items-center justify-center p-8 text-center">
              <Monitor className="mb-4 h-12 w-12 text-slate-300" />
              <p className="text-lg font-black">Pilih perangkat TV</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Konfigurasi ruang, kalender, HDMI, wallpaper, menu, dan teks launcher dari panel ini.</p>
              <Button className="mt-5" onClick={beginCreate}><Plus className="mr-2 h-4 w-4" /> Tambah TV</Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const Stat = ({ title, value, subtitle, icon, tone }: { title: string; value: number; subtitle: string; icon: React.ReactNode; tone: 'blue' | 'emerald' | 'amber' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  };
  return (
    <div className={`${panel} flex items-center gap-4 p-5`}>
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl [&>svg]:h-5 [&>svg]:w-5 ${colors[tone]}`}>{icon}</div>
      <div><p className="text-2xl font-black leading-none">{value}</p><p className="mt-1 text-xs font-bold text-foreground">{title}</p><p className="text-[10px] text-muted-foreground">{subtitle}</p></div>
    </div>
  );
};

const DeviceDetail = ({ device, onEdit, onDelete, onCopy }: { device: TVDevice; onEdit: () => void; onDelete: () => void; onCopy: () => void }) => {
  const online = isOnline(device.last_seen_at);
  const wallpaper = device.wallpaper_url || '/image/layout.png';
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-5">
        <div>
          <div className="flex items-center gap-2"><h2 className="text-xl font-black">{device.room_name}</h2><Badge variant={device.is_active ? 'default' : 'secondary'}>{device.is_active ? 'Aktif' : 'Nonaktif'}</Badge></div>
          <button type="button" onClick={onCopy} className="mt-1 flex items-center gap-1.5 font-mono text-xs font-bold text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" />{device.device_code}</button>
        </div>
        <div className="flex gap-2"><Button variant="outline" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4 text-rose-500" /> Hapus</Button><Button onClick={onEdit}><Save className="mr-2 h-4 w-4" /> Edit konfigurasi</Button></div>
      </div>

      <div className="grid gap-6 p-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Status" value={online ? 'Online' : 'Offline'} icon={online ? <Wifi /> : <WifiOff />} good={online} />
            <Info label="HDMI default" value={device.hdmi_label} />
            <Info label="Versi APK" value={device.app_version || 'Belum dilaporkan'} />
            <Info label="Sinkronisasi" value={`${device.sync_interval_seconds} detik`} />
          </div>
          <div className={`${panel} p-5`}>
            <p className="text-sm font-black">Google Calendar</p>
            <div className="mt-3 rounded-xl bg-muted/50 p-4">
              <p className={inputLabel}>Calendar ID</p>
              <p className="mt-1 break-all text-sm font-bold">{device.calendar_id || 'Belum terhubung'}</p>
              <p className="mt-2 text-xs text-muted-foreground">Timezone: {device.timezone}</p>
            </div>
          </div>
          <div className={`${panel} p-5`}>
            <p className="text-sm font-black">Menu launcher</p>
            <div className="mt-3 flex flex-wrap gap-2">{MENU_OPTIONS.map(([key, label]) => <Badge key={key} variant={device.menu_flags?.[key] ? 'default' : 'secondary'}>{label}</Badge>)}</div>
          </div>
          <div className={`${panel} p-5`}>
            <p className="text-sm font-black">Hero text</p>
            <div className="mt-3 space-y-2">{device.hero_messages.map((message, index) => <div key={`${message}-${index}`} className="flex gap-3 rounded-xl bg-muted/50 px-4 py-3 text-sm"><span className="font-black text-blue-600">{String(index + 1).padStart(2, '0')}</span><span>{message}</span></div>)}</div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Preview launcher</p>
          <div className="aspect-video overflow-hidden rounded-2xl border border-slate-700 bg-[#0a1f40] bg-cover bg-center text-white" style={{ backgroundImage: `linear-gradient(90deg, rgba(5,20,48,.96), rgba(12,52,103,.72), rgba(12,52,103,.22)), url(${JSON.stringify(wallpaper).slice(1, -1)})` }}>
            <div className="flex h-full flex-col justify-between p-5">
              <div className="flex items-start justify-between"><div className="text-xs font-black tracking-[0.18em] text-[#e3c95c]">GESIT</div><div className="text-right text-[9px] text-slate-200"><p className="text-sm font-black">08:30</p><p>{device.room_name}</p></div></div>
              <div><p className="max-w-[76%] text-lg font-black leading-tight">{device.hero_messages[0] || 'Selamat datang di ruang meeting GESIT.'}</p><p className="mt-1 text-[8px] text-slate-300">Pilih fungsi menggunakan remote TV.</p></div>
              <div className="grid grid-cols-6 gap-1.5">{MENU_OPTIONS.filter(([key]) => device.menu_flags?.[key]).map(([, label], index) => <div key={label} className={`truncate rounded border px-1 py-2 text-center text-[6px] font-bold ${index === 0 ? 'border-[#e3c95c] bg-[#234e89]' : 'border-white/15 bg-[#15366d]/80'}`}>{label}</div>)}</div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-border/60 p-4 text-xs text-muted-foreground"><p><strong className="text-foreground">Lokasi:</strong> {device.location || 'Belum diisi'}</p><p className="mt-2"><strong className="text-foreground">Emergency:</strong> {device.emergency_contact || 'Belum diisi'}</p><p className="mt-2"><strong className="text-foreground">Terakhir online:</strong> {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString('id-ID') : 'Belum pernah'}</p></div>
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value, icon, good }: { label: string; value: string; icon?: React.ReactNode; good?: boolean }) => (
  <div className="rounded-xl border border-border/60 p-4"><div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${good ? 'text-emerald-600' : 'text-muted-foreground'}`}>{icon && <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}{label}</div><p className="mt-2 truncate text-sm font-black">{value}</p></div>
);

interface DeviceEditorProps {
  draft: DeviceDraft;
  setDraft: React.Dispatch<React.SetStateAction<DeviceDraft>>;
  heroText: string;
  setHeroText: (value: string) => void;
  heroTextEn: string;
  setHeroTextEn: (value: string) => void;
  saving: boolean;
  uploading: boolean;
  uploadRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (file?: File) => void;
  onSave: () => void;
  onCancel: () => void;
  title: string;
}

const DeviceEditor = ({ draft, setDraft, heroText, setHeroText, heroTextEn, setHeroTextEn, saving, uploading, uploadRef, onUpload, onSave, onCancel, title }: DeviceEditorProps) => (
  <div>
    <div className="flex items-center justify-between border-b border-border/60 px-6 py-5"><div><h2 className="text-xl font-black">{title}</h2><p className="text-xs text-muted-foreground">Perubahan diterima launcher pada sinkronisasi berikutnya.</p></div><Button variant="ghost" size="icon" onClick={onCancel}><X className="h-5 w-5" /></Button></div>
    <div className="space-y-6 p-6">
      <EditorSection title="Identitas perangkat" description="Device ID harus sama dengan ID enrollment pada APK.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Device ID"><Input value={draft.device_code} onChange={(event) => setDraft((current) => ({ ...current, device_code: event.target.value.toUpperCase() }))} placeholder="MEETING-ROOM-01" /></Field>
          <Field label="Nama ruang"><Input value={draft.room_name} onChange={(event) => setDraft((current) => ({ ...current, room_name: event.target.value }))} placeholder="Ruang Meeting 1" /></Field>
          <Field label="Lokasi"><Input value={draft.location ?? ''} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Lantai 8, Kantor GESIT" /></Field>
          <Field label="Kontak emergency"><Input value={draft.emergency_contact ?? ''} onChange={(event) => setDraft((current) => ({ ...current, emergency_contact: event.target.value }))} placeholder="Security / General Affairs" /></Field>
        </div>
      </EditorSection>

      <EditorSection title="Google Calendar" description="Masukkan Calendar ID resource ruang. Credential Google tetap di backend.">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_190px_160px]">
          <Field label="Calendar ID"><Input value={draft.calendar_id ?? ''} onChange={(event) => setDraft((current) => ({ ...current, calendar_id: event.target.value }))} placeholder="room@resource.calendar.google.com" /></Field>
          <Field label="Timezone"><Input value={draft.timezone} onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))} /></Field>
          <Field label="Refresh"><select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={draft.sync_interval_seconds} onChange={(event) => setDraft((current) => ({ ...current, sync_interval_seconds: Number(event.target.value) }))}><option value={30}>30 detik</option><option value={60}>1 menit</option><option value={300}>5 menit</option><option value={600}>10 menit</option></select></Field>
        </div>
      </EditorSection>

      <EditorSection title="Tampilan launcher" description="Wallpaper dan pesan akan disimpan sebagai konfigurasi online.">
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <div className="aspect-video overflow-hidden rounded-xl border border-border bg-[#0a1f40] bg-cover bg-center" style={draft.wallpaper_url ? { backgroundImage: `url(${JSON.stringify(draft.wallpaper_url).slice(1, -1)})` } : undefined} />
            <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => onUpload(event.target.files?.[0])} />
            <Button type="button" variant="outline" className="mt-3 w-full" disabled={uploading} onClick={() => uploadRef.current?.click()}>{uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />} Upload wallpaper</Button>
          </div>
          <div className="space-y-4">
            <Field label="Wallpaper URL"><Input value={draft.wallpaper_url ?? ''} onChange={(event) => setDraft((current) => ({ ...current, wallpaper_url: event.target.value }))} placeholder="https://..." /></Field>
            <Field label="Hero text — satu pesan per baris"><Textarea rows={5} value={heroText} onChange={(event) => setHeroText(event.target.value)} /></Field>
            <Field label="Hero text English — one message per line"><Textarea rows={5} value={heroTextEn} onChange={(event) => setHeroTextEn(event.target.value)} /></Field>
            <Field label="Bahasa default"><select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={draft.default_language} onChange={(event) => setDraft((current) => ({ ...current, default_language: event.target.value as 'id' | 'en' }))}><option value="id">Indonesia</option><option value="en">English</option></select></Field>
          </div>
        </div>
      </EditorSection>

      <EditorSection title="Sumber input dan menu" description="Nama tombol, port HDMI, AirPlay, urutan, dan visibilitas diatur per ruang.">
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between gap-3"><p className={inputLabel}>Sumber input launcher</p><Button type="button" size="sm" variant="outline" onClick={() => setDraft((current) => ({ ...current, input_sources: [...current.input_sources, { id: `source-${Date.now()}`, type: 'hdmi', port: 'HDMI 1', label: 'Input baru', enabled: true }] }))}><Plus className="mr-2 h-4 w-4" />Tambah input</Button></div>
            <div className="mt-3 space-y-2">
              {draft.input_sources.length === 0 && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Belum ada sumber input. Tambahkan HDMI atau AirPlay.</p>}
              {draft.input_sources.map((source, index) => <div key={source.id} className="grid gap-2 rounded-xl border border-border/60 p-3 md:grid-cols-[46px_150px_150px_minmax(180px,1fr)_90px_42px]">
                <div className="flex flex-col gap-1"><Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => setDraft((current) => { const sources = [...current.input_sources]; [sources[index - 1], sources[index]] = [sources[index], sources[index - 1]]; return { ...current, input_sources: sources }; })}>↑</Button><Button type="button" size="icon" variant="ghost" disabled={index === draft.input_sources.length - 1} onClick={() => setDraft((current) => { const sources = [...current.input_sources]; [sources[index], sources[index + 1]] = [sources[index + 1], sources[index]]; return { ...current, input_sources: sources }; })}>↓</Button></div>
                <Field label="Jenis"><select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={source.type} onChange={(event) => setDraft((current) => ({ ...current, input_sources: current.input_sources.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as TVInputSource['type'], port: event.target.value === 'airplay' ? null : item.port || 'HDMI 1' } : item) }))}><option value="hdmi">HDMI</option><option value="airplay">AirPlay</option></select></Field>
                <Field label="Port"><select disabled={source.type !== 'hdmi'} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm disabled:opacity-50" value={source.port || ''} onChange={(event) => setDraft((current) => ({ ...current, input_sources: current.input_sources.map((item, itemIndex) => itemIndex === index ? { ...item, port: event.target.value } : item) }))}><option>HDMI 1</option><option>HDMI 2</option><option>HDMI 3</option><option>HDMI 4</option></select></Field>
                <div className="space-y-2"><Field label="Nama Indonesia"><Input value={source.label} onChange={(event) => setDraft((current) => ({ ...current, input_sources: current.input_sources.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} placeholder="Laptop Langsung" /></Field><Field label="English name"><Input value={source.label_en || ''} onChange={(event) => setDraft((current) => ({ ...current, input_sources: current.input_sources.map((item, itemIndex) => itemIndex === index ? { ...item, label_en: event.target.value } : item) }))} placeholder="Direct Laptop" /></Field></div>
                <label className="flex items-center gap-2 pt-6 text-sm font-bold"><input type="checkbox" checked={source.enabled} onChange={(event) => setDraft((current) => ({ ...current, input_sources: current.input_sources.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item) }))} className="h-4 w-4 accent-blue-600" />Aktif</label>
                <Button type="button" size="icon" variant="ghost" className="mt-5 text-rose-600" onClick={() => setDraft((current) => ({ ...current, input_sources: current.input_sources.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 className="h-4 w-4" /></Button>
              </div>)}
            </div>
          </div>
          <div><p className={inputLabel}>Menu sistem tambahan</p><div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{MENU_OPTIONS.map(([key, label]) => <label key={key} className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold ${draft.menu_flags[key] ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300' : 'border-border text-muted-foreground'}`}><span>{label}</span><input type="checkbox" checked={draft.menu_flags[key]} onChange={(event) => setDraft((current) => ({ ...current, menu_flags: { ...current.menu_flags, [key]: event.target.checked } }))} className="h-4 w-4 accent-blue-600" /></label>)}</div></div>
        </div>
      </EditorSection>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm font-bold"><input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft((current) => ({ ...current, is_active: event.target.checked }))} className="h-4 w-4 accent-blue-600" />Perangkat aktif dan boleh mengambil konfigurasi</label>
        <div className="flex gap-2"><Button variant="outline" onClick={onCancel}>Batal</Button><Button onClick={onSave} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Publish konfigurasi</Button></div>
      </div>
    </div>
  </div>
);

const EditorSection = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => <section className="rounded-2xl border border-border/60 p-5"><div className="mb-4"><p className="text-sm font-black">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div>{children}</section>;
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block space-y-2"><span className={inputLabel}>{label}</span>{children}</label>;

export default TVMeetingRoomManager;
