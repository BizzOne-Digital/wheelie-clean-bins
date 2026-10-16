import Link from "next/link";

export default function NotFound() {
  return (
    <section className="py-24">
      <div className="container-x max-w-xl text-center">
        <p className="font-display text-6xl font-black text-brand">404</p>
        <h1 className="mt-3 font-display text-3xl font-black">Page not found</h1>
        <p className="mt-3 text-soft/90">The page you are looking for does not exist or has moved.</p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/" className="btn btn-primary btn-md">Go Home</Link>
          <Link href="/contact" className="btn btn-ghost btn-md">Contact Us</Link>
        </div>
      </div>
    </section>
  );
}
