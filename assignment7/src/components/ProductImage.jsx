import { useState } from 'react';
export default function ProductImage({ src, alt, loading }) {
  const [failedSource, setFailedSource] = useState(null);
  if (!src || failedSource === src) return <span role="img" aria-label={alt}>Image unavailable</span>;
  return <img src={src} alt={alt} loading={loading} onError={() => setFailedSource(src)} />;
}
