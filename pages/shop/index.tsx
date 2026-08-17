// pages/shop/index.tsx
import Link from 'next/link';

export default function Shop() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Shop (placeholder)</h1>
      <p>The shop page is currently a placeholder to verify routing. Replace with your product list implementation.</p>
      <p>
        Example: <Link href="/product/example-product">Open example product</Link>
      </p>
    </main>
  );
}
