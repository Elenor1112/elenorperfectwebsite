// Site-wide background — the hero's original visual layers promoted to the
// root layout so every page shares them: a solid black base with a soft
// baby-blue shade bleeding through, plus a readability scrim that darkens the
// top and bottom of the viewport to protect text contrast. Both layers are
// fixed and decorative; page content sits above them at z-10.
export function SiteBackground() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black"
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 25%, rgba(137,207,240,0.45), transparent 62%), radial-gradient(circle at 78% 72%, rgba(137,207,240,0.28), transparent 60%)',
          }}
        />
      </div>
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-ink/30 via-transparent to-ink"
        aria-hidden
      />
    </>
  );
}
