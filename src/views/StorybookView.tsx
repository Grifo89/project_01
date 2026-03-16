import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { TaskCard } from '../components/TaskCard';
import { StatCard } from '../components/StatCard';
import { CheckCircle } from 'lucide-preact';

export const StorybookView = () => {
  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-950">
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold text-primary mb-2">Design System</h1>
        <p className="text-slate-500">Project Tracker UI Components & Views</p>
      </header>

      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Link</Button>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Badges</h2>
        <div className="flex flex-wrap gap-4">
          <Badge variant="primary">UI Design</Badge>
          <Badge variant="amber">Review</Badge>
          <Badge variant="emerald">Released</Badge>
          <Badge variant="rose">High Priority</Badge>
          <Badge variant="slate">To Do</Badge>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase text-slate-400">Task Card</h3>
            <TaskCard
              title="Refactor API Authentication"
              tag="High Priority"
              tagVariant="rose"
              dueDate="Oct 24"
              assignees={[
                { displayName: 'John Doe' },
                { displayName: 'Alice Smith' },
              ]}
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase text-slate-400">Stat Card</h3>
            <StatCard
              title="Completed Tasks"
              value="1,284"
              trend="+12%"
              icon={CheckCircle}
              iconVariant="primary"
            />
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">Avatars</h2>
        <div className="flex gap-4 items-center">
          <Avatar displayName="John Doe" size="xs" />
          <Avatar displayName="John Doe" size="sm" />
          <Avatar displayName="John Doe" size="md" />
          <Avatar displayName="Alice Smith" size="lg" />
          <Avatar displayName="Jane Smith" size="xl" />
          <Avatar
            displayName="Photo User"
            photoUrl="https://i.pravatar.cc/100?u=storybook"
            size="md"
          />
        </div>
      </section>
    </div>
  );
};
