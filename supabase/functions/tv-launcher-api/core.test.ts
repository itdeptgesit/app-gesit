import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScheduleStatus, extractDeviceToken, routeAction } from './core.ts';

test('extractDeviceToken accepts explicit device token header', () => {
  const headers = new Headers({ 'x-device-token': 'gesit_tv_secret' });
  assert.equal(extractDeviceToken(headers), 'gesit_tv_secret');
});

test('extractDeviceToken rejects missing token', () => {
  assert.equal(extractDeviceToken(new Headers()), null);
});

test('routeAction resolves final URL path segment', () => {
  assert.equal(routeAction('https://project.supabase.co/functions/v1/tv-launcher-api/schedule'), 'schedule');
  assert.equal(routeAction('https://project.supabase.co/functions/v1/tv-launcher-api'), 'config');
});

test('buildScheduleStatus returns current and next meeting', () => {
  const result = buildScheduleStatus([
    { id: 'old', summary: 'Old', start: { dateTime: '2026-09-22T07:00:00+07:00' }, end: { dateTime: '2026-09-22T08:00:00+07:00' } },
    { id: 'now', summary: 'Daily Meeting', start: { dateTime: '2026-09-22T08:00:00+07:00' }, end: { dateTime: '2026-09-22T09:00:00+07:00' } },
    { id: 'next', summary: 'Weekly Review', start: { dateTime: '2026-09-22T10:00:00+07:00' }, end: { dateTime: '2026-09-22T11:00:00+07:00' } },
  ], new Date('2026-09-22T08:30:00+07:00'));

  assert.equal(result.status, 'occupied');
  assert.equal(result.current_meeting?.title, 'Daily Meeting');
  assert.equal(result.next_meeting?.title, 'Weekly Review');
});

test('buildScheduleStatus hides private event title', () => {
  const result = buildScheduleStatus([
    { id: 'private', summary: 'Board Confidential', visibility: 'private', start: { dateTime: '2026-09-22T08:00:00+07:00' }, end: { dateTime: '2026-09-22T09:00:00+07:00' } },
  ], new Date('2026-09-22T08:30:00+07:00'));

  assert.equal(result.current_meeting?.title, 'Private meeting');
});
