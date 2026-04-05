import React, { Suspense, lazy } from 'react';

export default function dynamic(dynamicOptions: any, options?: any) {
  const loadFn = typeof dynamicOptions === 'function' ? dynamicOptions : dynamicOptions?.loader;
  
  if (!loadFn) {
    return (props: any) => <div {...props}>Failed to load dynamic component</div>;
  }

  const LazyComponent = lazy(async () => {
    try {
      const mod = await loadFn();
      if (mod.default) {
         return { default: mod.default };
      }
      const firstExport = Object.keys(mod)[0];
      if (firstExport) {
         return { default: mod[firstExport] };
      }
      return { default: () => <div>Import error: no default or named export</div> };
    } catch(e) {
      console.error('next/dynamic error:', e);
      return { default: () => <div>Error loading component</div> };
    }
  });

  return function DynamicComponent(props: any) {
    const LoadingComponent = options?.loading;
    return (
      <Suspense fallback={LoadingComponent ? <LoadingComponent /> : null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
