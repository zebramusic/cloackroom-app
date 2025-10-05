export const metadata = { title: "Not allowed" };
export default function NotAllowedPage() {
  return (
    <main
      className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-bold">Access restricted</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Your current role does not have permission to view this page. Choose
          an option below.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href="/handover"
            className="rounded-full bg-accent text-accent-foreground px-5 py-2 text-sm font-medium shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            Go to Handover
          </a>
          <a
            href="/admin/login"
            className="text-sm rounded-full border border-border px-5 py-2 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            Switch account
          </a>
        </div>
      </div>
    </main>
  );
}
