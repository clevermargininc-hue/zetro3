import Link from "next/link";

export function LandingSocialProof() {
  return (
    <section className="industry-section">
      <div>
        <h2 className="industry-heading">Built for teams where every conversation matters</h2>
        <p className="industry-description">Connect quality assurance with a clearer understanding of your customers.</p>
        <div className="industry-list" aria-label="Industries supported">
          <span>Telecom &amp; Mobile Money</span><span>Financial Services</span><span>Customer Support</span><span>BPO &amp; Contact Centers</span>
        </div>
        <div className="outcome-banner">
          <div>
            <small>Quality + Customer Intelligence</small>
            <h2>Every call tells a story.<br />See the whole customer journey.</h2>
            <p>Understand how your agents handled the call, whether the issue was resolved, and why a customer needed to call again.</p>
          </div>
          <div className="outcome-action">
            <h2>Bring better service<br />into focus.</h2>
            <p>Explore Zetro with your own scorecard and customer conversations.</p>
            <Link href="/talk-sales">Request a Demo →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
