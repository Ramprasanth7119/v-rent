/**
 * One block of structured data.
 *
 * `JSON.stringify` and then close every `<` that could end the script early —
 * a listing description containing `</script>` would otherwise break out of
 * the block and into the page. The escape is the standard one and costs
 * nothing, and the alternative is a stranger's typed text deciding where our
 * markup ends.
 */

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
