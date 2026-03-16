import { User } from 'lucide-preact';

export const ProfileSettingsView = () => {
  // Phase 0 stub — full implementation in Phase 1 after auth is wired.
  // Profile data will come from the Firebase AuthUser object, not the database.
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
      <div className="size-20 bg-app-surface rounded-full flex items-center justify-center mb-6 border border-app-border">
        <User size={40} className="text-app-text-secondary" />
      </div>
      <h2 className="text-xl font-bold text-app-text-primary mb-2">Profile Settings</h2>
      <p className="text-app-text-secondary max-w-sm">
        Profile management is available after sign-in. Your name and photo are managed by your identity provider.
      </p>
    </div>
  );
};
