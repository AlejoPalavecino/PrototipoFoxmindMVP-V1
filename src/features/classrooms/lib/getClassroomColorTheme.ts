export const getClassroomColorTheme = (color?: string, subject?: string) => {
  const c = (color || '').toLowerCase();
  const s = (subject || '').toLowerCase();

  if (c.includes('purple') || s.includes('literatura')) {
    return {
      bar: 'bg-fox-purple',
      badgeBg: 'bg-fox-purple/10',
      badgeText: 'text-fox-purple',
      bullet: 'bg-fox-purple',
      border: 'border-fox-purple/20',
      textAccent: 'text-fox-purple',
      fill: '#827397'
    };
  }
  if (c.includes('blue') || s.includes('historia')) {
    return {
      bar: 'bg-fox-blue',
      badgeBg: 'bg-fox-blue/10',
      badgeText: 'text-fox-blue',
      bullet: 'bg-fox-blue',
      border: 'border-fox-blue/20',
      textAccent: 'text-fox-blue',
      fill: '#2563eb'
    };
  }
  if (c.includes('orange') || s.includes('matemática') || s.includes('matematica')) {
    return {
      bar: 'bg-fox-orange',
      badgeBg: 'bg-fox-orange/10',
      badgeText: 'text-fox-orange',
      bullet: 'bg-fox-orange',
      border: 'border-fox-orange/20',
      textAccent: 'text-fox-orange',
      fill: '#f68d2c'
    };
  }
  if (c.includes('green') || s.includes('ciencia') || s.includes('biolog')) {
    return {
      bar: 'bg-fox-green',
      badgeBg: 'bg-fox-green/10',
      badgeText: 'text-fox-green',
      bullet: 'bg-fox-green',
      border: 'border-fox-green/20',
      textAccent: 'text-fox-green',
      fill: '#52a874'
    };
  }
  return {
    bar: 'bg-fox-primary',
    badgeBg: 'bg-fox-primary/10',
    badgeText: 'text-fox-primary',
    bullet: 'bg-fox-primary',
    border: 'border-fox-primary/20',
    textAccent: 'text-fox-primary',
    fill: '#489980'
  };
};
