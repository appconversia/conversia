"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useUser, useCanEditBotConfig } from "@/contexts/user-context";
import {
  DashboardHero,
  DashboardHeroGhostLink,
  DashboardHeroPrimaryLink,
} from "@/components/dashboard/dashboard-hero";

type HubCard = {
  href: string;
  title: string;
  description: string;
  adminOnly: boolean;
  icon: ReactNode;
};

function CardIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-conversia-primary/15 text-conversia-primary">
      {children}
    </div>
  );
}

export default function ConfiguracionHubPage() {
  const user = useUser();
  const canEditIntegration = useCanEditBotConfig();
  const role = String(user?.role ?? "").toLowerCase();
  const isAdmin = role === "admin" || role === "super_admin";

  const cards: HubCard[] = [
    {
      href: "/dashboard/billing",
      title: "Facturación",
      description: "Plan, pagos y estado de tu suscripción.",
      adminOnly: false,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/categorias",
      title: "Categorías",
      description: "Organiza productos y conversaciones por categoría.",
      adminOnly: true,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7a2 2 0 010-2.828l7-7A2 2 0 0112 3h5c2.828 0 5 2.172 5 5v1H7V3z"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/etiquetas",
      title: "Etiquetas",
      description: "Etiquetas de conversaciones y flujos del bot.",
      adminOnly: true,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7a2 2 0 010-2.828l7-7A2 2 0 0112 3h5c2.828 0 5 2.172 5 5v1H7V3z"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/productos",
      title: "Productos",
      description: "Catálogo, precios e imágenes para el bot.",
      adminOnly: true,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/plantillas",
      title: "Plantillas",
      description: "Plantillas de mensajes y WhatsApp.",
      adminOnly: true,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      href: "/dashboard/documentacion",
      title: "Documentación",
      description: "Manuales y guías de uso de Conversia.",
      adminOnly: true,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
    },
  ];

  const integrationCard: HubCard = {
    href: "/dashboard/configuracion/integracion",
    title: "Integración WhatsApp y bot",
    description: "Cloud API, perfil de negocio, horario y claves del bot.",
    adminOnly: true,
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  };

  const visible = cards.filter((c) => !c.adminOnly || isAdmin);
  const showIntegration = canEditIntegration;

  return (
    <div className="space-y-6">
      <DashboardHero
        overline="Centro de control"
        title="Configuración"
        description="Accede a facturación, integración, contenido y documentación desde un solo lugar."
        actions={
          <>
            <DashboardHeroPrimaryLink href="/dashboard/billing">Facturación</DashboardHeroPrimaryLink>
            {showIntegration ? (
              <DashboardHeroGhostLink href="/dashboard/configuracion/integracion">Integración WhatsApp</DashboardHeroGhostLink>
            ) : null}
            <DashboardHeroGhostLink href="/dashboard/documentacion" muted>
              Manuales y guías
            </DashboardHeroGhostLink>
          </>
        }
      />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="group flex h-full flex-col gap-4 rounded-xl border border-[#E9EDEF] bg-[#FAFBFC] p-5 shadow-sm transition hover:border-conversia-primary/40 hover:bg-white hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <CardIcon>{card.icon}</CardIcon>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-[#111B21] group-hover:text-conversia-primary transition-colors">
                    {card.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#667781]">{card.description}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-conversia-primary group-hover:underline">
                Abrir módulo →
              </span>
            </Link>
          </li>
        ))}
        {showIntegration && (
          <li key={integrationCard.href}>
            <Link
              href={integrationCard.href}
              className="group flex h-full flex-col gap-4 rounded-xl border border-[#E9EDEF] bg-[#FAFBFC] p-5 shadow-sm transition hover:border-conversia-primary/40 hover:bg-white hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <CardIcon>{integrationCard.icon}</CardIcon>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-[#111B21] group-hover:text-conversia-primary transition-colors">
                    {integrationCard.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#667781]">{integrationCard.description}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-conversia-primary group-hover:underline">
                Abrir integración →
              </span>
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
