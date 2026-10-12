import React from 'react';
import {
    X, Package, Tag, Building2, Cpu, MapPin, ShieldCheck,
    Calendar, FileText, User, HardDrive, Monitor, Zap
} from 'lucide-react';
import { ITAsset } from '../types';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AssetDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: ITAsset | null;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ isOpen, onClose, asset }) => {
    if (!asset) return null;

    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
        'Active': { variant: 'default', label: 'OPERATIONAL' },
        'Used': { variant: 'default', label: 'IN PRODUCTION' },
        'Idle': { variant: 'secondary', label: 'STANDBY' },
        'Broken': { variant: 'destructive', label: 'OFFLINE' },
        'Disposed': { variant: 'outline', label: 'DECOMMISSIONED' }
    };

    const currentStatus = statusConfig[asset.status] || { variant: 'outline', label: asset.status.toUpperCase() };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="sm:max-w-3xl p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl outline-none">
                <div className="flex flex-col max-h-[82vh] h-full">
                    {/* Standard Shadcn Header */}
                    <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between shrink-0 bg-muted/20">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Package size={16} className="text-primary" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Asset Intelligence</h3>
                                <p className="text-xs font-mono text-muted-foreground">{asset.assetId}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={currentStatus.variant as any} className="text-xs font-medium h-6">
                                {currentStatus.label}
                            </Badge>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="w-8 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={16} />
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 w-full bg-background overflow-hidden">
                        <div className="p-6 space-y-8">
                            {/* Hero Section */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                                <div className="md:col-span-12 lg:col-span-5">
                                    <div className="relative w-full aspect-square bg-muted/30 rounded-lg border flex items-center justify-center overflow-hidden p-6">
                                        {asset.image_url ? (
                                            <img src={asset.image_url} alt={asset.item} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 opacity-20">
                                                <Package size={80} className="text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">No Image</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="md:col-span-12 lg:col-span-7 space-y-6">
                                    <div className="space-y-1">
                                        <h1 className="text-2xl font-bold text-foreground leading-none">{asset.item}</h1>
                                        <span className="text-xs text-muted-foreground font-mono">S/N: {asset.serialNumber || 'UNIDENTIFIED'}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2">
                                        <DataPoint icon={Tag} label="Classification" value={asset.category} />
                                        <DataPoint icon={Building2} label="Operating Entity" value={asset.company} />
                                        <DataPoint icon={Cpu} label="Hardware Model" value={asset.brand} />
                                        <DataPoint icon={MapPin} label="Logical Location" value={asset.location} />
                                        <DataPoint icon={ShieldCheck} label="Current Health" value={asset.condition} />
                                        <DataPoint icon={Calendar} label="Lifecycle Start" value={asset.purchaseDate} />
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Details */}
                            <div className="grid grid-cols-3 gap-6 py-6 border-y bg-muted/10 px-4 rounded-md">
                                <ExtraDetail label="Vendor Access" value={asset.vendor} />
                                <ExtraDetail label="Warranty Valid" value={asset.warrantyExp} />
                                <ExtraDetail label="Physical Remarks" value={asset.remarks} />
                            </div>

                            {/* Technical Specs */}
                            {asset.specs && (Object.values(asset.specs).some(v => !!v)) && (
                                <Card className="border shadow-sm rounded-lg overflow-hidden">
                                    <CardContent className="p-6 space-y-6">
                                        <div className="flex items-center gap-2">
                                            <Zap size={14} className="text-primary" />
                                            <h3 className="text-sm font-semibold text-foreground">Machine Core Profiling</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Spec icon={Cpu} label="Processor" value={asset.specs.processor} />
                                            <Spec icon={HardDrive} label="Memory" value={asset.specs.ram} />
                                            <Spec icon={HardDrive} label="Storage" value={asset.specs.storage} />
                                            <Spec icon={Monitor} label="Visual Engine" value={asset.specs.vga} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Custodian Segment */}
                            <div className="flex items-center gap-4 p-4 bg-muted/20 border rounded-lg">
                                <Avatar className="w-12 h-12 rounded-md border bg-background">
                                    <AvatarFallback className="font-bold text-muted-foreground uppercase">
                                        {asset.user?.charAt(0).toUpperCase() || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <span className="text-xs font-medium text-muted-foreground block mb-0.5">Personnel Assigned</span>
                                    <h4 className="text-base font-semibold text-foreground truncate leading-tight">{asset.user || 'SYSTEM POOL'}</h4>
                                    <span className="text-xs text-muted-foreground">{asset.department || 'GENERAL SECTOR'}</span>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const DataPoint = ({ icon: Icon, label, value }: any) => (
    <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
            <Icon size={12} />
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className="text-sm font-medium text-foreground truncate">
            {(!value || value === '-' || value.toString().toLowerCase() === 'nan') ? '--' : value}
        </p>
    </div>
);

const ExtraDetail = ({ label, value }: any) => (
    <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <p className="text-sm font-medium text-foreground truncate leading-tight">
            {(!value || value === '-' || value.toString().toLowerCase() === 'nan') ? 'N/A' : value}
        </p>
    </div>
);

const Spec = ({ icon: Icon, label, value }: any) => (
    <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center border">
            <Icon size={14} className="text-muted-foreground" />
        </div>
        <div className="min-w-0">
            <span className="text-xs font-medium text-muted-foreground block mb-0.5">{label}</span>
            <p className="text-sm font-medium text-foreground truncate leading-tight">{value || 'UNSPECIFIED'}</p>
        </div>
    </div>
);
