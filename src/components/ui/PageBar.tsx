import type { ReactNode } from 'react';

/**
 * Testata fissa di ogni pagina elenco: titolo, pulsanti e filtri restano in cima mentre scorre solo l'elenco.
 * Va messa come primo figlio del contenitore della pagina (quello con padding p-4 md:p-8): i margini negativi
 * la fanno aderire ai bordi. Su telefono pulsanti e campi sono più compatti.
 */
export function PageBar({
  title,
  actions,
  filters,
}: {
  title: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 -mt-4 flex flex-col gap-2 border-b border-lc-border/60 bg-lc-bg px-4 pb-2.5 pt-3 md:-mx-8 md:-mt-8 md:gap-3 md:px-8 md:pb-4 md:pt-8">
      <div className="flex items-center justify-between gap-x-3 gap-y-2">
        <h1 className="font-display text-xl font-semibold md:text-3xl">{title}</h1>
        {actions && (
          <div className="flex flex-wrap justify-end gap-1.5 md:gap-2 max-md:[&_button]:!px-3 max-md:[&_button]:!py-1.5 max-md:[&_button]:!text-sm max-md:[&_svg]:h-3.5 max-md:[&_svg]:w-3.5">
            {actions}
          </div>
        )}
      </div>
      {filters && (
        <div className="flex flex-wrap gap-2 md:gap-3 max-md:[&_input]:!py-1.5 max-md:[&_input]:!text-sm max-md:[&_select]:!py-1.5 max-md:[&_select]:!text-sm">
          {filters}
        </div>
      )}
    </div>
  );
}
