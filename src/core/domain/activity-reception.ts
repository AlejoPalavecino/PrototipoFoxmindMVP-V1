/** Reception uses current server receipt time; historical timeliness remains a separate recorded fact. */
export function activityReceptionPolicy(general: Date | null, individual: Date | null, allowLate: boolean, now: Date) {
  const deadline = individual && (!general || individual > general) ? individual : general;
  const late = deadline !== null && now.getTime() >= deadline.getTime();
  return { deadline, open: !late || allowLate, late };
}
