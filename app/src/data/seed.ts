import { hoursAgo } from '../lib/time';
import type { Item } from '../types';

export function seedItems(now: Date = new Date()): Item[] {
  const at = (daysAhead: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const nextSunday = (() => {
    const delta = (7 - now.getDay()) % 7 || 7;
    return at(delta, 10);
  })();

  return [
    { id: 's1', thing: 'keys', rawText: 'keys in the bowl by the front door', location: 'in the bowl by the front door', remindAt: null, isSecret: false, createdAt: hoursAgo(2, now), color: 'blue' },
    { id: 's2', thing: 'parking spot', rawText: 'parking spot is level 3, row G', location: 'level 3, row G', remindAt: null, isSecret: false, createdAt: hoursAgo(3, now), color: 'yellow' },
    { id: 's3', thing: 'call the dentist', rawText: 'call the dentist tomorrow 9am', location: null, remindAt: at(1, 9), isSecret: false, createdAt: hoursAgo(14, now), color: 'black' },
    { id: 's4', thing: 'water the fern', rawText: 'water the fern Sunday 10am', location: null, remindAt: nextSunday, isSecret: false, createdAt: hoursAgo(50, now), color: 'red' },
    { id: 's5', thing: 'passport', rawText: 'passport in the blue suitcase, front zip', location: 'in the blue suitcase, front zip', remindAt: null, isSecret: false, createdAt: hoursAgo(72, now), color: 'green' },
    { id: 't1', unread: true, thing: 'wifi password', rawText: 'private: wifi password is taped inside the router cabinet', location: 'inside the router cabinet', remindAt: null, isSecret: true, createdAt: hoursAgo(96, now), color: 'yellow' },
    { id: 't2', thing: 'gift for mom', rawText: "secret: mom's birthday gift is behind the garage shelf", location: 'behind the garage shelf', remindAt: null, isSecret: true, createdAt: hoursAgo(120, now), color: 'black' },
    { id: 't3', thing: 'spare key', rawText: 'private spare key under the fern pot', location: 'under the fern pot', remindAt: null, isSecret: true, createdAt: hoursAgo(312, now), color: 'red' },
    { id: 's6', thing: 'scissors', rawText: 'scissors in the kitchen junk drawer', location: 'in the kitchen junk drawer', remindAt: null, isSecret: false, createdAt: hoursAgo(144, now), color: 'blue' },
    { id: 's7', thing: 'umbrella', rawText: 'umbrella in the car trunk', location: 'in the car trunk', remindAt: null, isSecret: false, createdAt: hoursAgo(200, now), color: 'green' },
    { id: 's8', thing: 'batteries', rawText: 'batteries in the hall closet', location: 'in the hall closet', remindAt: null, isSecret: false, createdAt: hoursAgo(230, now), color: 'yellow' },
  ];
}
