import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Check, RotateCcw } from 'lucide-react';
import { UserAccount, UserGroup } from '../types';
import { APP_MENU_STRUCTURE, MOCK_GROUPS } from '../constants';

interface MenuPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  onSave: (menus: string[]) => void;
  groupDefinitions?: UserGroup[];
}

export const MenuPermissionsModal: React.FC<MenuPermissionsModalProps> = ({ isOpen, onClose, user, onSave, groupDefinitions }) => {
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);

  const profiles = groupDefinitions && groupDefinitions.length > 0 ? groupDefinitions : MOCK_GROUPS;

  useEffect(() => {
    if (user && isOpen) {
      const next = new Set<string>();
      (user.groups || []).forEach(g => {
        next.add(g);
        const cfg = profiles.find(p => p.id === g);
        if (cfg?.allowedMenus) cfg.allowedMenus.forEach(m => next.add(m));
      });
      setSelectedMenus([...next]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOpen]);

  const toggleMenu = (id: string) => {
    setSelectedMenus(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const applyProfile = (allowedMenus: string[]) => {
    setSelectedMenus(allowedMenus || []);
  };

  if (!user) return null;

  const parentMenus = APP_MENU_STRUCTURE.filter(m => !m.parentId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2 text-primary mb-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold text-foreground">Access Control Matrix</span>
          </div>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Menu Permissions - {user.fullName?.split(' ')[0]}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Grant or revoke menu access rights specifically<br/>for account <span className="text-foreground font-medium">{user.email}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Quick Presets */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-foreground mb-3">Apply Quick Preset</h3>
            <div className="flex flex-wrap gap-2">
              {profiles.map(p => (
                <Button
                  key={p.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyProfile(p.allowedMenus)}
                  className="text-xs font-medium"
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> {p.name}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMenus([])}
                className="text-xs font-medium"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Clear
              </Button>
            </div>
          </div>

          {/* Module & Menu Toggles */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-4">Module & Menu Toggles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parentMenus.map(parent => {
                const children = APP_MENU_STRUCTURE.filter(m => m.parentId === parent.id);
                const isParentChecked = selectedMenus.includes(parent.id);

                return (
                  <div key={parent.id} className={`border rounded-xl p-4 transition-all ${isParentChecked ? 'border-primary/30 bg-primary/5 dark:border-primary/40' : 'border-border/60 bg-card'}`}>
                    <div
                      onClick={() => toggleMenu(parent.id)}
                      className="flex items-center gap-3 cursor-pointer mb-3"
                    >
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${isParentChecked ? 'bg-primary border-primary text-primary-foreground shadow-sm' : 'bg-background border-border'}`}>
                        {isParentChecked && <Check size={14} strokeWidth={3} />}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{parent.label}</span>
                    </div>

                    {children.length > 0 && (
                      <div className="ml-8 space-y-2.5 border-l-2 border-border/60 pl-4 py-1">
                        {children.map(child => {
                          const isChildChecked = selectedMenus.includes(child.id);
                          return (
                            <div
                              key={child.id}
                              onClick={() => toggleMenu(child.id)}
                              className="flex items-center gap-3 cursor-pointer group/child"
                            >
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isChildChecked ? 'bg-primary border-primary text-primary-foreground shadow-sm' : 'bg-background border-border group-hover/child:border-primary/50'}`}>
                                {isChildChecked && <Check size={10} strokeWidth={4} />}
                              </div>
                              <span className={`text-xs font-medium ${isChildChecked ? 'text-foreground' : 'text-muted-foreground'} group-hover/child:text-foreground`}>{child.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-3.5 border-t border-border/40 gap-2 flex sm:justify-end bg-muted/10">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-medium">
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(selectedMenus)} className="text-xs font-medium">
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};