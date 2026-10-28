import Link from "next/link";
import { ALT_EVIDENCE, type QA } from "../../lib/content/alt-evidence";
import { RichText } from "./RichText";

export function AltEvidence({ faq }: { faq: QA[] }) {
  return (
    <>
      <section className="isec" id="evidence">
        <div className="isec-text">
          <h2>{ALT_EVIDENCE.title}</h2>
          <p>{ALT_EVIDENCE.lead}</p>
          <ul className="ievidence">
            {ALT_EVIDENCE.items.map((e) => (
              <li key={e.href}>
                {e.fact} <Link href={e.href}>{e.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="isec ifaq" id="faq">
        <div className="isec-text">
          <h2>{ALT_EVIDENCE.faqTitle}</h2>
          {faq.map((item) => (
            <div key={item.q}>
              <h3>{item.q}</h3>
              <p><RichText p={item.a} /></p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
