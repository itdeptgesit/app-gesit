export interface CalendarEvent {
  id: string;
  summary?: string;
  visibility?: string;
  status?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

export interface MeetingSummary {
  id: string;
  title: string;
  start: string;
  end: string;
}

const eventTime = (value: { dateTime?: string; date?: string }) =>
  new Date(value.dateTime || `${value.date}T00:00:00Z`);

const summarize = (event: CalendarEvent): MeetingSummary => ({
  id: event.id,
  title: event.visibility === 'private' ? 'Private meeting' : event.summary || 'Meeting',
  start: event.start.dateTime || event.start.date || '',
  end: event.end.dateTime || event.end.date || '',
});

export function buildScheduleStatus(events: CalendarEvent[], now = new Date()) {
  const active = events.find((event) => {
    if (event.status === 'cancelled') return false;
    return eventTime(event.start).getTime() <= now.getTime() && eventTime(event.end).getTime() > now.getTime();
  });
  const upcoming = events.find((event) => {
    if (event.status === 'cancelled') return false;
    return eventTime(event.start).getTime() > now.getTime();
  });

  const todayEvents = events
    .filter((event) => event.status !== 'cancelled')
    .map(summarize);

  return {
    status: active ? 'occupied' : 'available',
    current_meeting: active ? summarize(active) : null,
    next_meeting: upcoming ? summarize(upcoming) : null,
    today_events: todayEvents,
  };
}

export function extractDeviceToken(headers: Headers): string | null {
  const explicit = headers.get('x-device-token')?.trim();
  if (explicit) return explicit;
  const authorization = headers.get('authorization')?.trim();
  if (!authorization?.toLowerCase().startsWith('bearer ')) return null;
  return authorization.slice(7).trim() || null;
}

export function routeAction(url: string): 'config' | 'schedule' | 'heartbeat' | 'devices' | 'unknown' {
  const segments = new URL(url).pathname.split('/').filter(Boolean);
  const index = segments.lastIndexOf('tv-launcher-api');
  const action = index >= 0 ? segments[index + 1] : undefined;
  if (!action) return 'config';
  if (action === 'config' || action === 'schedule' || action === 'heartbeat' || action === 'devices') return action;
  return 'unknown';
}
