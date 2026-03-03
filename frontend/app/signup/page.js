'use client';

import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">LetsStud</h1>
        <p>No signup required. Start generating notes now.</p>
        <Link href="/" className="underline">Go to home</Link>
      </div>
    </div>
  );
}
