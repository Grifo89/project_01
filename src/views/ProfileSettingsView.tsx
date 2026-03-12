import { useState, useEffect } from 'preact/hooks';
import { db, User } from '../services/db';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Loader2, Camera, User as UserIcon, Mail, Shield, Save } from 'lucide-preact';

export const ProfileSettingsView = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>('');
  const [saving, setSaving] = useState(false);

  const handleImageUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const users = await db.getUsers();
        // For local profiles, we'll just use the first user as "me" or store an ID in localStorage
        let myId = localStorage.getItem('myUserId');
        let me = users.find(u => u.id === myId);
        
        if (!me && users.length > 0) {
          me = users[0];
          localStorage.setItem('myUserId', me.id);
        } else if (!me) {
          // Create a default user if none exists
          const id = await db.addUser({
            name: 'New User',
            email: '',
            avatarColor: '#3b82f6',
            initials: 'NU',
            role: 'Admin'
          });
          const allUsers = await db.getUsers();
          me = allUsers.find(u => u.id === id) || null;
          if (me) localStorage.setItem('myUserId', me.id);
        }
        
        setCurrentUser(me);
        if (me) {
          setName(me.name);
          setEmail(me.email || '');
          setRole(me.role || '');
          setAvatarUrl(me.avatarUrl);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setSaving(true);
    try {
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      await db.updateUser(currentUser.id, {
        name,
        email,
        role,
        initials,
        avatarUrl
      });
      setCurrentUser({ ...currentUser, name, email, role, initials, avatarUrl });
      // In a real app, we'd have a global user state or event bus to update other components
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 lg:px-10 py-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-text-primary">Profile Settings</h1>
          <p className="text-app-text-secondary text-sm mt-1">Manage your personal information and how you appear to others.</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSave} className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center gap-8 pb-8 border-b border-app-border">
              <div className="relative group">
                <Avatar initials={currentUser?.initials || '??'} src={avatarUrl} size="xl" className="ring-4 ring-primary/10" />
                <label className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-all cursor-pointer">
                  <Camera size={16} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>
              <div className="text-center sm:text-left space-y-1">
                <h3 className="text-xl font-bold text-app-text-primary">{name || 'Your Name'}</h3>
                <p className="text-app-text-secondary text-sm">{role || 'Member'}</p>
                <p className="text-xs text-app-text-secondary opacity-60">ID: {currentUser?.id}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-app-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <UserIcon size={14} />
                  Full Name
                </label>
                <input 
                  type="text"
                  value={name}
                  onInput={(e) => setName((e.target as HTMLInputElement).value)}
                  className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-app-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Mail size={14} />
                  Email Address
                </label>
                <input 
                  type="email"
                  value={email}
                  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                  className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-app-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Shield size={14} />
                  Role / Title
                </label>
                <input 
                  type="text"
                  value={role}
                  onInput={(e) => setRole((e.target as HTMLInputElement).value)}
                  className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="e.g. Senior Developer"
                />
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <Button 
                type="submit" 
                disabled={saving}
                className="px-8 py-3 flex items-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                <span>Save Changes</span>
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-8 border-rose-500/20 bg-rose-500/5">
          <h3 className="text-lg font-bold text-rose-500 mb-2">Danger Zone</h3>
          <p className="text-app-text-secondary text-sm mb-6">Once you delete your local profile, there is no going back. Please be certain.</p>
          <Button variant="outline" className="text-rose-500 border-rose-500/30 hover:bg-rose-500 hover:text-white">
            Delete Local Profile
          </Button>
        </Card>
      </div>
    </div>
  );
};
