import React from 'react';

export default function Image(props: any) {
  const { src, alt, fill, ...rest } = props;
  return <img src={typeof src === 'string' ? src : src?.src} alt={alt || ''} {...rest} style={fill ? { width: '100%', height: '100%', objectFit: 'cover', ...rest.style} : rest.style} />;
}
