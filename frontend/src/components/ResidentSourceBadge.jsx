import { Badge } from '@mantine/core';

export function ResidentSourceBadge({ tone = 'official', children }) {
  return (
    <Badge component="span" className={`resident-source-pill is-${tone}`} radius="xl" size="sm" variant="light">
      {children}
    </Badge>
  );
}
