import React from 'react';
import { NavigationBar, Tab } from '../organisms/NavigationBar';

interface MainLayoutTemplateProps {
  // Navigation
  brandTitle: string;
  activeTab: Tab;
  onTabChange: (_tab: Tab) => void;

  // Page Content
  children: React.ReactNode;
}

export function MainLayoutTemplate({
  brandTitle,
  activeTab,
  onTabChange,
  children,
}: MainLayoutTemplateProps) {
  return (
    <div className="app">
      <NavigationBar brandTitle={brandTitle} activeTab={activeTab} onTabChange={onTabChange} />
      <main className="main-content">{children}</main>
    </div>
  );
}
