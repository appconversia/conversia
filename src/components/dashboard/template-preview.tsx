"use client";

export type TemplateForPreview = {
  name: string;
  language: string;
  components?: Array<{ type?: string; text?: string; buttons?: Array<{ type?: string; text?: string }> }>;
};

interface TemplatePreviewProps {
  template: TemplateForPreview;
  bodyParams?: string[];
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

function substituteVariables(text: string, params: string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const i = parseInt(n, 10) - 1;
    return params[i] !== undefined && params[i] !== "" ? params[i] : `{{${n}}}`;
  });
}

/** Construye el texto para mostrar en el chat a partir de una plantilla y sus parámetros */
export function buildTemplateDisplayContent(
  template: TemplateForPreview,
  bodyParams: string[] = []
): string {
  const comps = template.components ?? [];
  const header = comps.find((c) => c.type === "HEADER");
  const body = comps.find((c) => c.type === "BODY");
  const footer = comps.find((c) => c.type === "FOOTER");
  const buttons = comps.find((c) => c.type === "BUTTONS");

  const getText = (comp: { text?: string } | undefined) => {
    if (!comp?.text) return "";
    return bodyParams.length > 0 ? substituteVariables(comp.text, bodyParams) : comp.text;
  };

  const parts: string[] = [];
  const headerText = getText(header);
  const bodyText = getText(body);
  const footerText = footer?.text ?? "";
  const buttonList = buttons?.buttons ?? [];

  if (headerText) parts.push(headerText);
  if (bodyText) parts.push(bodyText);
  if (footerText) parts.push(`— ${footerText}`);
  if (buttonList.length > 0) {
    parts.push(buttonList.map((b) => `[${b.text ?? "Botón"}]`).join(" "));
  }
  return parts.join("\n\n");
}

function getComponentText(comp: { text?: string }, bodyParams: string[]): string {
  if (!comp.text) return "";
  if (bodyParams.length > 0) return substituteVariables(comp.text, bodyParams);
  return comp.text;
}

export function TemplatePreview({ template, bodyParams = [], compact, selected, onClick }: TemplatePreviewProps) {
  const comps = template.components ?? [];
  const header = comps.find((c) => c.type === "HEADER");
  const body = comps.find((c) => c.type === "BODY");
  const footer = comps.find((c) => c.type === "FOOTER");
  const buttons = comps.find((c) => c.type === "BUTTONS");

  const bodyText = body ? getComponentText(body, bodyParams) : "";
  const headerText = header?.text ? getComponentText(header, bodyParams) : "";
  const footerText = footer?.text ?? "";
  const buttonList = buttons?.buttons ?? [];

  const isCompact = compact ?? false;

  const cardClass = onClick
    ? `cursor-pointer transition-all duration-200 ${
        selected
          ? "ring-2 ring-[#25D366] ring-offset-2 border-[#25D366] bg-[#F0FFF4]"
          : "border-[#E9EDEF] bg-white hover:border-[#25D366]/50 hover:bg-[#FAFFFB]"
      }`
    : "";

  const bubble = (
    <div
      className={`rounded-lg border ${cardClass} ${isCompact ? "p-2" : "p-3"}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {!isCompact && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="truncate font-medium text-[#111B21]">{template.name}</span>
          <span className="shrink-0 rounded bg-[#E9EDEF] px-2 py-0.5 text-xs text-[#667781]">{template.language}</span>
        </div>
      )}
      <div className="rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-md bg-[#E7F5EC] p-3 shadow-sm">
        {headerText && (
          <div className={`mb-2 font-semibold text-[#111B21] ${isCompact ? "text-sm" : ""}`}>{headerText}</div>
        )}
        {bodyText ? (
          <div className={`whitespace-pre-wrap text-[#111B21] ${isCompact ? "text-sm" : "text-[15px]"}`}>{bodyText}</div>
        ) : (
          <div className={`text-[#667781] italic ${isCompact ? "text-xs" : "text-sm"}`}>Sin cuerpo</div>
        )}
        {footerText && (
          <div className={`mt-2 text-[#667781] ${isCompact ? "text-xs" : "text-sm"}`}>{footerText}</div>
        )}
        {buttonList.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {buttonList.map((btn, i) => (
              <span
                key={i}
                className={`
                  inline-flex items-center gap-1 rounded-lg border border-[#25D366] bg-white px-3 py-1.5 text-sm font-medium text-[#25D366]
                  ${isCompact ? "px-2 py-1 text-xs" : ""}
                `}
              >
                {btn.type === "URL" && (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
                {btn.text ?? "Botón"}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return bubble;
}
