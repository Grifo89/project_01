import { db, User, Project } from '../services/db';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Plus, Trash2, Mail, Shield, MoreVertical, Loader2, Users as UsersIcon, UserPlus } from 'lucide-preact';
import { Modal } from '../components/Modal';

export const TeamView = ({ currentProject }: { currentProject: Project | null }) => {
  const [team, setTeam] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Member');

  const fetchData = async () => {
    if (!currentProject) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [teamData, usersData] = await Promise.all([
        db.getProjectTeam(currentProject.id),
        db.getUsers()
      ]);
      setTeam(teamData);
      setAllUsers(usersData);
    } catch (err) {
      console.error('Failed to fetch team:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentProject?.id]);

  const handleAddExistingUser = async (userId: string) => {
    if (!currentProject) return;
    await db.addUserToProject(currentProject.id, userId);
    setIsAddUserModalOpen(false);
    fetchData();
  };

  const handleInviteNewUser = async (e: Event) => {
    e.preventDefault();
    if (!newUserName.trim() || !currentProject) return;
    
    const initials = newUserName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    
    const userId = await db.addUser({
      name: newUserName,
      email: newUserEmail,
      avatarColor,
      initials,
      role: newUserRole
    });
    
    await db.addUserToProject(currentProject.id, userId, newUserRole);
    
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('Member');
    setIsInviteModalOpen(false);
    fetchData();
  };

  const handleRemoveFromTeam = async (userId: string) => {
    if (!currentProject) return;
    if (confirm('Remove this member from the project?')) {
      await db.removeUserFromProject(currentProject.id, userId);
      fetchData();
    }
  };

  if (!currentProject) {
    return <div className="flex-1 flex items-center justify-center text-app-text-secondary">Please select a project first.</div>;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  const nonTeamUsers = allUsers.filter(u => !team.find(t => t.id === u.id));

  return (
    <div className="flex-1 px-6 lg:px-10 py-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-app-text-primary">{currentProject.name} Team</h1>
            <p className="text-app-text-secondary text-sm mt-1">Manage project members and assignments.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsAddUserModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-app-surface border border-app-border text-app-text-primary rounded-xl font-bold hover:bg-app-background transition-all"
            >
              <UserPlus size={18} />
              <span>Add Member</span>
            </button>
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              <Plus size={18} />
              <span>Invite New</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map(user => (
            <Card key={user.id} className="p-6 hover:shadow-lg transition-all group">
              <div className="flex items-start justify-between mb-6">
                <Avatar initials={user.initials} size="lg" className="ring-4 ring-primary/10" />
                <div className="flex items-center gap-1">
                  <button className="p-2 text-app-text-secondary hover:bg-app-background rounded-xl transition-all">
                    <MoreVertical size={18} />
                  </button>
                  <button 
                    onClick={() => handleRemoveFromTeam(user.id)}
                    className="p-2 text-app-text-secondary hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Remove from project"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-app-text-primary">{user.name}</h3>
                  <div className="flex items-center gap-2 text-app-text-secondary text-sm mt-1">
                    <Mail size={14} />
                    <span>{user.email || 'No email provided'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-app-border">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-primary" />
                    <span className="text-xs font-bold text-app-text-secondary uppercase tracking-wider">{user.role}</span>
                  </div>
                  <Badge variant={user.role === 'Admin' ? 'primary' : 'slate'}>Member</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {team.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-app-surface/50 rounded-[40px] border-2 border-dashed border-app-border">
            <div className="size-20 bg-app-background rounded-full flex items-center justify-center mb-6">
              <UsersIcon size={40} className="text-app-text-secondary" />
            </div>
            <h2 className="text-xl font-bold text-app-text-primary mb-2">The team is empty</h2>
            <p className="text-app-text-secondary max-w-sm mb-8">
              Add existing users or invite new ones to start collaborating.
            </p>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isAddUserModalOpen} 
        onClose={() => setIsAddUserModalOpen(false)} 
        title="Add Existing User"
      >
        <div className="space-y-4 max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
          {nonTeamUsers.length > 0 ? nonTeamUsers.map(user => (
            <div key={user.id} className="flex items-center justify-between p-3 hover:bg-app-background rounded-2xl border border-app-border transition-all">
              <div className="flex items-center gap-3">
                <Avatar initials={user.initials} size="sm" />
                <div>
                  <p className="text-sm font-bold text-app-text-primary">{user.name}</p>
                  <p className="text-xs text-app-text-secondary">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={() => handleAddExistingUser(user.id)}
                className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
          )) : (
            <p className="text-center text-app-text-secondary py-4">No other users found.</p>
          )}
        </div>
      </Modal>

      <Modal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        title="Invite New Member"
      >
        <form onSubmit={handleInviteNewUser} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Full Name</label>
            <input 
              autoFocus
              type="text"
              value={newUserName}
              onInput={(e) => setNewUserName((e.target as HTMLInputElement).value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Email Address</label>
            <input 
              type="email"
              value={newUserEmail}
              onInput={(e) => setNewUserEmail((e.target as HTMLInputElement).value)}
              placeholder="e.g. john@example.com"
              className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Role</label>
            <select 
              value={newUserRole}
              onChange={(e) => setNewUserRole((e.target as HTMLSelectElement).value)}
              className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
            >
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
              <option value="Viewer">Viewer</option>
              <option value="Manager">Manager</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="flex-1 px-4 py-3 bg-app-background border border-app-border rounded-2xl text-sm font-bold text-app-text-secondary hover:bg-app-border transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-3 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              Invite to Project
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
