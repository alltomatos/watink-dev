import React from "react";

export interface AccessStats {
  totalRoles: number;
  totalUsers: number;
  usersWithoutRole: number;
}

export interface NavCardDef {
  key: string;
  icon: React.ReactNode;
  color: string;
  getTitle: () => string;
  getDescription: () => string;
  getButtonLabel: () => string;
  getSubtitle: (stats: AccessStats) => string;
  route: string;
}

export interface LegacyCardDef {
  key: string;
  icon: React.ReactNode;
  color: string;
  getTitle: () => string;
  getDescription: () => string;
  getButtonLabel: () => string;
  route: string;
}

export interface KpiDef {
  key: keyof AccessStats;
  getValue: (stats: AccessStats) => number;
  labelKey: string;
  color: "primary" | "error" | "info";
  icon: React.ReactNode;
}
