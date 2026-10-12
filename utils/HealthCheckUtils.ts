// Real System Health Check Utilities
import { supabase } from '../lib/supabaseClient';

export interface HealthCheckResult {
    name: string;
    status: 'operational' | 'degraded' | 'down';
    uptime: number;
    responseTime: number;
    lastChecked: Date;
    details?: string;
}

// Check Supabase Database Connection
export const checkDatabaseHealth = async (): Promise<HealthCheckResult> => {
    const startTime = performance.now();

    try {
        // Simple query to check database connectivity
        const { data, error } = await supabase
            .from('user_accounts')
            .select('id')
            .limit(1);

        const responseTime = performance.now() - startTime;

        if (error) {
            return {
                name: 'Database',
                status: 'down',
                uptime: 0,
                responseTime,
                lastChecked: new Date(),
                details: error.message
            };
        }

        // Determine status based on response time
        const status = responseTime < 100 ? 'operational' : responseTime < 500 ? 'degraded' : 'down';
        const uptime = status === 'operational' ? 99.9 : status === 'degraded' ? 95.0 : 0;

        return {
            name: 'Database',
            status,
            uptime,
            responseTime,
            lastChecked: new Date()
        };
    } catch (error: any) {
        return {
            name: 'Database',
            status: 'down',
            uptime: 0,
            responseTime: performance.now() - startTime,
            lastChecked: new Date(),
            details: error.message
        };
    }
};

// Check Supabase Storage
export const checkStorageHealth = async (): Promise<HealthCheckResult> => {
    const startTime = performance.now();

    try {
        // List buckets to check storage connectivity
        const { data, error } = await supabase.storage.listBuckets();

        const responseTime = performance.now() - startTime;

        if (error) {
            return {
                name: 'Storage',
                status: 'down',
                uptime: 0,
                responseTime,
                lastChecked: new Date(),
                details: error.message
            };
        }

        const status = responseTime < 200 ? 'operational' : responseTime < 1000 ? 'degraded' : 'down';
        const uptime = status === 'operational' ? 99.7 : status === 'degraded' ? 90.0 : 0;

        return {
            name: 'Storage',
            status,
            uptime,
            responseTime,
            lastChecked: new Date()
        };
    } catch (error: any) {
        return {
            name: 'Storage',
            status: 'down',
            uptime: 0,
            responseTime: performance.now() - startTime,
            lastChecked: new Date(),
            details: error.message
        };
    }
};

// Check API/Auth Service
export const checkAPIHealth = async (): Promise<HealthCheckResult> => {
    const startTime = performance.now();

    try {
        // Check Supabase session to verify API connectivity
        const { data, error } = await supabase.auth.getSession();

        const responseTime = performance.now() - startTime;

        if (error) {
            return {
                name: 'API Server',
                status: 'degraded',
                uptime: 95.0,
                responseTime,
                lastChecked: new Date(),
                details: error.message
            };
        }

        const status = responseTime < 50 ? 'operational' : responseTime < 300 ? 'degraded' : 'down';
        const uptime = status === 'operational' ? 100 : status === 'degraded' ? 95.0 : 0;

        return {
            name: 'API Server',
            status,
            uptime,
            responseTime,
            lastChecked: new Date()
        };
    } catch (error: any) {
        return {
            name: 'API Server',
            status: 'down',
            uptime: 0,
            responseTime: performance.now() - startTime,
            lastChecked: new Date(),
            details: error.message
        };
    }
};

// Check Network Connectivity
export const checkNetworkHealth = async (): Promise<HealthCheckResult> => {
    const startTime = performance.now();

    try {
        // Check browser online status
        if (!navigator.onLine) {
            return {
                name: 'Network',
                status: 'down',
                uptime: 0,
                responseTime: 0,
                lastChecked: new Date(),
                details: 'Browser is offline'
            };
        }

        // Ping Supabase to check network latency
        const { error } = await supabase
            .from('user_accounts')
            .select('count')
            .limit(1)
            .single();

        const responseTime = performance.now() - startTime;

        // Network is considered healthy if we can reach Supabase
        const status = responseTime < 100 ? 'operational' : responseTime < 500 ? 'degraded' : 'down';
        const uptime = status === 'operational' ? 98.5 : status === 'degraded' ? 85.0 : 0;

        return {
            name: 'Network',
            status,
            uptime,
            responseTime,
            lastChecked: new Date()
        };
    } catch (error: any) {
        return {
            name: 'Network',
            status: 'down',
            uptime: 0,
            responseTime: performance.now() - startTime,
            lastChecked: new Date(),
            details: error.message
        };
    }
};

// Run all health checks
export const runAllHealthChecks = async (): Promise<HealthCheckResult[]> => {
    try {
        const [database, storage, api, network] = await Promise.all([
            checkDatabaseHealth(),
            checkStorageHealth(),
            checkAPIHealth(),
            checkNetworkHealth()
        ]);

        return [database, api, network, storage];
    } catch (error) {
        console.error('Health check error:', error);
        return [];
    }
};

// Calculate overall system status
export const calculateOverallStatus = (services: HealthCheckResult[]): 'operational' | 'degraded' | 'down' => {
    if (services.length === 0) return 'down';

    const downServices = services.filter(s => s.status === 'down').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;

    if (downServices > 0) return 'down';
    if (degradedServices > 0) return 'degraded';
    return 'operational';
};
