import React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';

/**
 * Exemplo de uso do componente Button do Watink Design System.
 * O componente real é baseado no shadcn/ui + Tailwind CSS.
 *
 * @dsCard group="Components" name="Button" subtitle="Primary, outlined, ghost, danger — 3 sizes"
 */
export function ButtonExample() {
  return (
    <div className="flex flex-col gap-6 p-4">
      {/* CTAs Principais */}
      <section className="flex flex-wrap gap-4 items-center">
        <Button variant="default">Entrar</Button>
        <Button variant="outline">Cancelar</Button>
        <Button variant="ghost">Navegar</Button>
        <Button variant="destructive">Excluir</Button>
      </section>

      {/* Tamanhos */}
      <section className="flex flex-wrap gap-4 items-end">
        <Button size="sm">Pequeno (sm)</Button>
        <Button size="default">Médio (default)</Button>
        <Button size="lg">Grande (lg)</Button>
      </section>

      {/* Com Ícones e asChild (padrão shadcn) */}
      <section className="flex flex-wrap gap-4 items-center">
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" /> Nova Conversa
        </Button>
        <Button variant="outline" size="icon">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </section>

      {/* Estado Desabilitado */}
      <section className="flex flex-wrap gap-4">
        <Button disabled>Ação Desabilitada</Button>
      </section>
    </div>
  );
}

// Mock de ícones para exemplo
const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default ButtonExample;
