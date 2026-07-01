import { Link } from 'react-router-dom';

export function NotFoundRoute() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
      <p className="mb-6 text-muted-foreground">
        Pagina non trovata.
      </p>
      <Link
        to="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 min-h-[44px] inline-flex items-center"
      >
        Torna alla lista rapporti
      </Link>
    </div>
  );
}
