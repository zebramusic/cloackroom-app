export default function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto mb-10 text-center max-w-2xl">
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 text-base/7 text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
