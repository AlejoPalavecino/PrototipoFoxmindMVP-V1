/** Daily AI quota day: the Buenos Aires calendar day, the same zone as the monthly quota period. */
export const aiQuotaZone = 'America/Argentina/Buenos_Aires';
export const aiOperationalDaySql = `(transaction_timestamp() AT TIME ZONE '${aiQuotaZone}')::date`;
