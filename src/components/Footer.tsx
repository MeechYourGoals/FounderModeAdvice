import { Link } from "react-router-dom";

const LINKS: { to: string; label: string }[] = [
  { to: "/faq", label: "FAQ" },
  { to: "/privacy-policy", label: "Privacy" },
  { to: "/terms-of-service", label: "Terms" },
  { to: "/cookies", label: "Cookies" },
  { to: "/account-deletion", label: "Delete Account" },
  { to: "/contact", label: "Contact" },
];

export const Footer = () => {
  return (
    <footer
      className="border-t border-border py-6 sm:py-8"
      style={{ paddingBottom: "calc(1.5rem + var(--safe-area-bottom))" }}
    >
      <div className="container mx-auto px-4 space-y-4 text-center">
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs sm:text-sm text-muted-foreground">
          {LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-primary transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs sm:text-sm text-muted-foreground">
          © {new Date().getFullYear()} Founder Mode Advice. Built for founders, by founders.
        </p>
      </div>
    </footer>
  );
};
