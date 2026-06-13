/* @jsxImportSource react */
import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * PageContainer — substitui MainContainer.
 * Fornece o layout base para páginas, com scroll interno opcional e padding padrão.
 */
export const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <div 
      className={cn(
        "wt-page-container flex flex-col h-full w-full overflow-hidden bg-background",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * PageHeader — substitui MainHeader + Title + MainHeaderButtonsWrapper.
 * Fornece o cabeçalho da página com título e ações.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  children, 
  className,
  ...props 
}) => {
  return (
    <header 
      className={cn(
        "wt-page-header flex items-center justify-between px-6 py-4 border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-10",
        className
      )}
      {...props}
    >
      {title && (
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
      )}
      <div className="flex items-center gap-2 ml-auto">
        {children}
      </div>
    </header>
  );
};

interface PageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * PageContent — área de conteúdo principal com scroll.
 */
export const PageContent: React.FC<PageContentProps> = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <main 
      className={cn(
        "wt-page-content flex-1 overflow-y-auto overflow-x-hidden p-6",
        className
      )}
      {...props}
    >
      {children}
    </main>
  );
};
