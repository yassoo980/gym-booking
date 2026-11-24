import Link from 'next/link';
import { BRAND } from '../lib/config';

export default function Home() {
  return (
    <main className="split" style={{ position: 'relative' }}>
      <span className="brand">{BRAND}</span>
      <Link href="/admin" className="adminlink">Staff</Link>
      <Link href="/gym" className="tile gym">
        <h2>Gym</h2>
        <p>Our private mini gym. See membership plans and join.</p>
      </Link>
      <Link href="/classes" className="tile cls">
        <h2>Classes</h2>
        <p>Yoga, kickboxing and more. Pick a class and book your spot.</p>
      </Link>
    </main>
  );
}
