// pages/product/[slug].tsx
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function ProductPage() {
  const { query } = useRouter();
  const slug = query.slug || 'unknown';
  return (
    <main style={{ padding: 24 }}>
      <h1>Product: {slug}</h1>
      <p>This is a placeholder product page used to verify routing in production.</p>
      <p>
        <Link href="/shop">Back to shop</Link>
      </p>
    </main>
  );
}
