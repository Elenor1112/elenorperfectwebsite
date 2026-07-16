import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="grid min-h-[80vh] place-items-center px-6 text-center">
      <div>
        <p className="font-display text-7xl font-bold text-gradient md:text-9xl">404</p>
        <h1 className="mt-6 font-display text-2xl font-semibold">This pixel scattered.</h1>
        <p className="mx-auto mt-3 max-w-md text-white/55">
          The page you’re looking for isn’t here. Let’s get you back to something solid.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/" className="btn-primary">Back home</Link>
          <Link href="/services" className="btn-ghost">Browse services</Link>
        </div>
      </div>
    </section>
  );
}
