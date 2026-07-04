import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";

const LINK_GROUPS: { heading: string; links: { to: string; label: string }[] }[] = [
  {
    heading: "Explore",
    links: [
      { to: "/scenarios", label: "Scenarios" },
      { to: "/blog", label: "Blog" },
      { to: "/founders", label: "Operators" },
    ],
  },
  {
    heading: "Product",
    links: [
      { to: "/faq", label: "FAQ" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { to: "/privacy-policy", label: "Privacy" },
      { to: "/terms-of-service", label: "Terms" },
      { to: "/cookies", label: "Cookies" },
      { to: "/refund-policy", label: "Refunds" },
    ],
  },
  {
    heading: "Account",
    links: [{ to: "/account-deletion", label: "Delete Account" }],
  },
];

export const Footer = () => {
  return (
    <footer
      className="border-t border-border/60 pt-10 pb-6 sm:pt-14 sm:pb-8"
      style={{ paddingBottom: "calc(1.5rem + var(--safe-area-bottom))" }}
    >
      <div className="container mx-auto px-4">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))] sm:gap-6">
          <div className="space-y-3">
            <BrandLogo className="h-9 w-auto" />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Transcript-grounded founder intelligence. Turn the best founder and operator videos into company-specific
              operating memos, risks, and action plans.
            </p>
          </div>
          {LINK_GROUPS.map((group) => (
            <nav key={group.heading} aria-label={group.heading} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
                {group.heading}
              </p>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Founder Mode Advice. Source-grounded intelligence for founders and operators.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Independent analysis of public content — not endorsement or financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
};
