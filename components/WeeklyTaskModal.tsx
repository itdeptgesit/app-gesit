'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, Tag, Loader2, Target, Info, CalendarRange, Cloud, Trash2, Globe, MapPin } from 'lucide-react';
import { WeeklyPlan } from '../types';
import { searchPeople, PeopleContact, DriveFile } from '../lib/googleApi';
import { GoogleDrivePickerModal } from './GoogleDrivePickerModal';

interface WeeklyTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<WeeklyPlan>) => Promise<void>;
  initialData?: WeeklyPlan | null;
  currentUserName?: string;
}

export const WeeklyTaskModal: React.FC<WeeklyTaskModalProps> = ({ isOpen, onClose, onSubmit, initialData, currentUserName }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [peopleSuggestions, setPeopleSuggestions] = useState<PeopleContact[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<Partial<WeeklyPlan>>({
    task: '',
    description: '',
    priority: 'Medium',
    status: 'To Do',
    category: 'Maintenance',
    assignee: currentUserName ? currentUserName.split(' ')[0] : 'IT',
    startDate: today,
    dueDate: today,
    location: '',
  });

  useEffect(() => {
    if (isOpen) {
      setShowSuggestions(false);
      setPeopleSuggestions([]);
      setDrivePickerOpen(false);
      if (initialData) {
        setFormData({
          ...initialData,
          description: initialData.description || initialData.remarks || '',
          startDate: initialData.startDate || initialData.dueDate || today,
          dueDate: initialData.dueDate || today,
          location: initialData.location || '',
        });
      } else {
        setFormData({
          task: '',
          description: '',
          priority: 'Medium',
          status: 'To Do',
          category: 'Maintenance',
          assignee: currentUserName ? currentUserName.split(' ')[0] : 'IT',
          startDate: today,
          dueDate: today,
          location: '',
        });
      }
      setIsSubmitting(false);
    }
  }, [isOpen, initialData, currentUserName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.task) return;

    // Ensure endDate >= startDate
    if (formData.startDate && formData.dueDate && formData.startDate > formData.dueDate) {
      alert('End date must be after start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error: any) {
      console.error("Submission error:", error?.message || error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssigneeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, assignee: val }));
    
    if (val.trim().length >= 2) {
      setLoadingSuggestions(true);
      try {
        const matches = await searchPeople(val);
        setPeopleSuggestions(matches);
        setShowSuggestions(matches.length > 0);
      } catch (err) {
        console.warn('People search failed:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    } else {
      setPeopleSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectPerson = (person: PeopleContact) => {
    setFormData(prev => ({
      ...prev,
      assignee: person.name,
      assigneeEmail: person.email,
      assigneeAvatar: person.avatar
    }));
    setShowSuggestions(false);
  };

  const handleSelectDriveFiles = (selectedFiles: DriveFile[]) => {
    const currentAttachments = formData.gdriveAttachments || [];
    const newAttachments = selectedFiles.map(f => ({
      id: f.id,
      name: f.name,
      url: f.webViewLink,
      mimeType: f.mimeType,
      iconUrl: f.iconLink
    }));
    
    // Deduplicate
    const merged = [...currentAttachments];
    newAttachments.forEach(n => {
      if (!merged.some(m => m.id === n.id)) {
        merged.push(n);
      }
    });
    
    setFormData(prev => ({ ...prev, gdriveAttachments: merged }));
  };

  const inputClass = "w-full border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mt-1 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100 transition-all font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600";
  const labelClass = "block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest";

  const isMultiDay = formData.startDate && formData.dueDate && formData.startDate !== formData.dueDate;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] border border-slate-200 dark:border-zinc-800">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shadow-sm">
              <Target size={16} className="text-zinc-50 dark:text-zinc-900" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {initialData ? 'Edit Event' : 'Add Event'}
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">
                {initialData ? 'Update task parameters' : 'Create a new calendar event'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="taskForm" onSubmit={handleSubmit} className="space-y-5">

            {/* Task Title */}
            <div>
              <label className={labelClass}>Event Title *</label>
              <input
                type="text"
                className={inputClass}
                value={formData.task || ''}
                onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                placeholder="What needs to be done?"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>Details / Notes</label>
              <textarea
                rows={3}
                className={`${inputClass} resize-none leading-relaxed`}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional context, steps, or requirements..."
              />
            </div>

            {/* Google Drive Attachments */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className={labelClass}>Google Drive Attachments</label>
                <button
                  type="button"
                  onClick={() => setDrivePickerOpen(true)}
                  className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1 uppercase tracking-wider transition-colors"
                >
                  <Cloud size={11} />
                  Add from Drive
                </button>
              </div>

              {formData.gdriveAttachments && formData.gdriveAttachments.length > 0 ? (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {formData.gdriveAttachments.map((file, idx) => (
                    <div key={file.id || idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-800/20 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        {file.iconUrl ? (
                          <img src={file.iconUrl} className="w-3.5 h-3.5 shrink-0" alt="" />
                        ) : (
                          <Cloud size={13} className="text-slate-400 shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <a
                           href={file.url}
                           target="_blank"
                           rel="noreferrer"
                           className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                           title="View file"
                        >
                          <Globe size={13} />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (formData.gdriveAttachments || []).filter((_, i) => i !== idx);
                            setFormData({ ...formData, gdriveAttachments: updated });
                          }}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove attachment"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-center py-4 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/30 dark:bg-zinc-800/10 text-slate-400 text-[11px] font-medium flex items-center justify-center gap-1.5">
                  <Cloud size={13} className="opacity-60 text-slate-400" />
                  No Google Drive files attached.
                </div>
              )}
            </div>

            {/* Date Range */}
            <div>
              <label className={cn(labelClass, "flex items-center gap-1.5 mb-1")}>
                <CalendarRange size={11} />
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 pl-1">Start Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      className={`${inputClass} pl-10 mt-0`}
                      value={formData.startDate || ''}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          startDate: newStart,
                          // Auto-adjust end date if it's before new start
                          dueDate: prev.dueDate && prev.dueDate < newStart ? newStart : prev.dueDate
                        }));
                      }}
                      required
                    />
                    <Calendar size={13} className="absolute left-3 top-3 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 pl-1">End Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      className={`${inputClass} pl-10 mt-0`}
                      value={formData.dueDate || ''}
                      min={formData.startDate || undefined}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      required
                    />
                    <Calendar size={13} className="absolute left-3 top-3 text-slate-400" />
                  </div>
                </div>
              </div>
              {isMultiDay && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
                  <CalendarRange size={11} />
                  Multi-day event: {formData.startDate} → {formData.dueDate}
                </div>
              )}
            </div>

            {/* Assignee + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className={labelClass}>Assignee</label>
                <div className="relative">
                  <input
                    type="text"
                    className={`${inputClass} pl-9`}
                    value={formData.assignee || ''}
                    onChange={handleAssigneeChange}
                    onFocus={() => { if (peopleSuggestions.length > 0) setShowSuggestions(true); }}
                    placeholder="Name"
                    required
                    autoComplete="off"
                  />
                  <User size={13} className="absolute left-3 top-3.5 text-slate-400" />
                  {loadingSuggestions && (
                    <Loader2 size={12} className="absolute right-3 top-3.5 animate-spin text-blue-500" />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl custom-scrollbar py-1">
                    {peopleSuggestions.map((person, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPerson(person)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors border-b border-slate-50 dark:border-zinc-800/30 last:border-b-0"
                      >
                        {person.avatar ? (
                          <img src={person.avatar} className="w-6 h-6 rounded-full object-cover shrink-0" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-black shrink-0">
                            {person.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{person.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{person.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select
                  className={inputClass}
                  value={formData.priority || 'Medium'}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High / Urgent</option>
                </select>
              </div>
            </div>

            {/* Category + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Category</label>
                <div className="relative">
                  <select
                    className={`${inputClass} pl-9`}
                    value={formData.category || 'Maintenance'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Maintenance">Maintenance</option>
                    <option value="Project">Project</option>
                    <option value="Support">Support</option>
                    <option value="Meeting">Meeting</option>
                  </select>
                  <Tag size={13} className="absolute left-3 top-3.5 text-slate-400" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  className={inputClass}
                  value={formData.status || 'To Do'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className={labelClass}>Location</label>
              <div className="relative">
                <input
                  type="text"
                  className={`${inputClass} pl-9`}
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Board Room, Site Office, Remote"
                />
                <MapPin size={13} className="absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50 rounded-b-xl flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-zinc-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="taskForm"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-zinc-900/90 dark:hover:bg-zinc-50/90 transition-all shadow-lg shadow-zinc-900/10 dark:shadow-none active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : null}
            {initialData ? 'Update Event' : 'Create Event'}
          </button>
        </div>

        {/* Google Drive Picker Modal */}
        <GoogleDrivePickerModal
          isOpen={drivePickerOpen}
          onClose={() => setDrivePickerOpen(false)}
          onSelectFiles={handleSelectDriveFiles}
        />
      </div>
    </div>,
    document.body
  );
};

// Helper (inline cn since it's used in JSX)
function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
