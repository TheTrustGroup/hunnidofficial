/**
 * Product list thumbnail — reliable on desktop Safari/Chrome with large legacy base64 images.
 * Uses blob URLs for data: sources (some desktop browsers fail on very long data: img src).
 */
import { useEffect, useState } from 'react';
import {
  EMPTY_IMAGE_DATA_URL,
  getSafeProductImageUrlSized,
  isBase64,
  productImageUrlWithoutTransform,
} from '../../lib/imageUpload';

type Props = {
  src: string;
  alt: string;
  className?: string;
  onFailed?: () => void;
};

function toDisplaySrc(raw: string): string {
  if (!raw || raw === EMPTY_IMAGE_DATA_URL) return '';
  if (isBase64(raw)) return raw;
  return getSafeProductImageUrlSized(raw, 'thumb');
}

export function ProductThumbnail({ src, alt, className, onFailed }: Props) {
  const [resolved, setResolved] = useState(() => toDisplaySrc(src));
  const [failed, setFailed] = useState(false);
  const [useDirectStorageUrl, setUseDirectStorageUrl] = useState(false);

  useEffect(() => {
    setFailed(false);
    setUseDirectStorageUrl(false);
    const display = toDisplaySrc(src);
    setResolved(display);

    if (!display || !isBase64(display)) return;

    let revoked: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(display);
        const blob = await res.blob();
        if (cancelled) return;
        revoked = URL.createObjectURL(blob);
        setResolved(revoked);
      } catch {
        if (!cancelled) {
          setFailed(true);
          onFailed?.();
        }
      }
    })();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src, onFailed]);

  useEffect(() => {
    if (failed) onFailed?.();
  }, [failed, onFailed]);

  const imgSrc =
    useDirectStorageUrl && resolved.includes('/storage/v1/render/image/')
      ? productImageUrlWithoutTransform(resolved)
      : resolved;

  if (!imgSrc || failed) return null;

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (!useDirectStorageUrl && imgSrc.includes('/storage/v1/render/image/')) {
          setUseDirectStorageUrl(true);
          setFailed(false);
          return;
        }
        setFailed(true);
        onFailed?.();
      }}
    />
  );
}
