import React from 'react';
import './PageLayout.scss';

interface PageLayoutProps {
  children: React.ReactNode;
}

interface PageHeaderProps {
  title: string;
  left?: React.ReactNode;
  children?: React.ReactNode;
}

interface PageBodyProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return <div className="page-layout">{children}</div>;
}

export function PageHeader({ title, left, children }: PageHeaderProps) {
  return (
    <div className="page-header">
      {left}
      <span className="page-header-title">{title}</span>
      {children}
    </div>
  );
}

export function PageBody({ children }: PageBodyProps) {
  return <div className="page-body">{children}</div>;
}
