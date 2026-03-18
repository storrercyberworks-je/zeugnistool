import React from 'react';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-10 border-t border-border/60">
            {/* Subtle Glow Line for Dark Mode */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col items-center gap-1.5 text-center">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">
                        NotenMeister – Zeugnisverwaltungssystem
                    </div>

                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                        Konzeption, Entwicklung und Design:
                        <span className="font-semibold text-foreground/80 ml-1">STORRER Cyberworks & Guidance</span>
                    </div>

                    <div className="text-[10px] text-muted-foreground/60 font-medium">
                        © {currentYear} Alle Rechte vorbehalten.
                    </div>
                </div>
            </div>
        </footer>
    );
}
