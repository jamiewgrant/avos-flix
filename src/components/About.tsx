export function About() {
  return (
    <section className="mb-20 border-t border-(--color-border) pt-12">
      <h2 className="text-2xl md:text-3xl font-semibold text-(--color-text) mb-4">
        About this project
      </h2>
      <div className="text-(--color-muted) max-w-2xl space-y-4 leading-relaxed">
        <p>
          <strong className="text-(--color-text)">avos+flix</strong> exists to settle one
          argument with public data: that younger generations' financial
          struggles aren't down to discretionary spending. Every series on this
          page is sourced from ONS, HM Land Registry, the Bank of England,
          DESNZ, Ofgem, or Nationwide.
        </p>
        <p>
          The visual rule is simple:{" "}
          <span className="text-(--color-text) font-medium">solid lines</span> are
          ONS-published National Statistics or equivalent observed values;{" "}
          <span className="text-(--color-text)">dashed lines</span> are modelled
          estimates, scaled proxies, or hand-curated historical figures. We{" "}
          <em>do not</em> backdate Netflix or avocado prices to years when the
          products didn't exist — visual completeness isn't worth fabrication.
        </p>
        <p>
          Built openly: the code, the ETL pipeline, and every seed file is at{" "}
          <a
            href="https://github.com/jamiewgrant/avos-flix"
            className="underline hover:text-(--color-text)"
            target="_blank"
            rel="noreferrer"
          >
            github.com/jamiewgrant/avos-flix
          </a>
          . Found a bug, a better data source, or a missing methodology caveat?
          Open an issue.
        </p>
        <p>
          Every URL state — the visible series, base year, view mode, year
          range, real-vs-nominal toggle — is encoded in the query string. Copy
          the URL to share a specific view.
        </p>
      </div>
    </section>
  )
}
