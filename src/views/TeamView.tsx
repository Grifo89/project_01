import { useState, useEffect } from 'preact/hooks';
import { Project } from '../services/db';
import { Users } from 'lucide-preact';

export const TeamView = ({ currentProject }: { currentProject: Project | null }) => {
  // Phase 0 stub — full implementation in Phase 1 after auth is wired.
  // Team management requires real Firebase UIDs from the auth provider.
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
      <div className="size-20 bg-app-surface rounded-full flex items-center justify-center mb-6 border border-app-border">
        <Users size={40} className="text-app-text-secondary" />
      </div>
      <h2 className="text-xl font-bold text-app-text-primary mb-2">Team Management</h2>
      <p className="text-app-text-secondary max-w-sm">
        Team management is available after sign-in. Members are added automatically when they authenticate with the project.
      </p>
    </div>
  );
};
