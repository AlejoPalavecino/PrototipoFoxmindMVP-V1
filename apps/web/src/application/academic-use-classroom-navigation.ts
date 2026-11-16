import { useEffect, useRef } from 'react';
import type { Detail } from '../../../../src/core/contracts/classrooms.ts';
import type { NotificationTarget } from '../../../../src/core/contracts/notifications.ts';

export function useClassroomNavigation(tab: string, room: Detail | null, wallTarget: NotificationTarget | null | undefined,
  rosterLoaded: boolean, memberCount: number) {
  const tabs = useRef<HTMLElement>(null);
  const roster = useRef<HTMLUListElement>(null);
  const rosterRevealPending = useRef(true);
  const teacher = room?.role === 'teacher';
  useEffect(() => {
    const nav = tabs.current;
    if (!nav) return;
    const reveal = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) return;
      const bounds = nav.getBoundingClientRect(), selected = active.getBoundingClientRect();
      if (selected.left < bounds.left) nav.scrollLeft += Math.floor(selected.left - bounds.left);
      else if (selected.right > bounds.right) nav.scrollLeft += Math.ceil(selected.right - bounds.right);
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [tab, room?.id, room?.role, wallTarget]);
  useEffect(() => { rosterRevealPending.current = true; }, [tab]);
  useEffect(() => {
    if (!teacher || tab !== 'members' || !rosterLoaded || !rosterRevealPending.current) return;
    rosterRevealPending.current = false;
    // Keep the heading and tabs stable when entering from the top of the classroom.
    if (window.scrollY <= 1) return;
    const button = roster.current?.querySelector<HTMLButtonElement>('[data-open-summary]');
    if (!button) return;
    const bounds = button.getBoundingClientRect();
    if (bounds.top < 140 || bounds.bottom > window.innerHeight - 100) {
      button.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  }, [tab, teacher, rosterLoaded, memberCount]);
  return { tabs, roster };
}
