declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

import * as React from 'react';
declare module 'react' {
  interface StyleHTMLAttributes<T> {
    jsx?: boolean;
    global?: boolean;
  }
}

