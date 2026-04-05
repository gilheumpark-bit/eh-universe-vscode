import React from 'react';

export default function Link(props: any) {
  const { href, as, children, ...rest } = props;
  return (
    <a href={as || href || '#'} {...rest}>
      {children}
    </a>
  );
}
