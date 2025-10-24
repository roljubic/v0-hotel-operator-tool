# TheBell - Hotel Operations Management System

A comprehensive hotel operations management system built with Next.js, Supabase, and TypeScript. TheBell enables hotel staff to efficiently manage tasks, track activities, and coordinate operations in real-time.

## Features

- **Role-Based Access Control**: Different interfaces for Admin, Manager, Operator, Bell Staff, and Bellman roles
- **Real-Time Task Management**: Live updates across all connected users
- **Activity Logging**: Comprehensive tracking of all system activities
- **PDF Reports**: Export detailed reports and activity logs
- **User Management**: Admin interface for managing staff accounts
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Styling**: Tailwind CSS v4, Radix UI
- **Deployment**: Vercel (recommended)

## Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account

### 1. Clone and Install

\`\`\`bash
git clone <your-repo-url>
cd thebell-hotel-app
pnpm install
\`\`\`

### 2. Environment Setup

Create a `.env.local` file in the root directory:

\`\`\`env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Development Redirect URL (for email confirmations)
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/dashboard
\`\`\`

### 3. Database Setup

Run the SQL scripts in order:

1. `scripts/001_create_database_schema.sql` - Creates tables and RLS policies
2. `scripts/002_create_user_profile_trigger.sql` - Sets up user profile automation
3. `scripts/003_seed_sample_data.sql` - Adds sample data (optional)
4. `scripts/004_enable_realtime.sql` - Enables real-time subscriptions

### 4. Run Development Server

\`\`\`bash
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the application.

## User Roles & Permissions

### Admin
- Full system access
- User management
- All reports and analytics
- System configuration

### Manager  
- User management (limited)
- All reports and analytics
- Task oversight
- Activity monitoring

### Operator
- Create and assign tasks
- View all tasks
- Generate reports
- Monitor activities

### Bell Staff
- View assigned and available tasks
- Take and complete tasks
- Update task status
- Limited task creation

### Bellman
- View assigned tasks
- Take available tasks (delivery/guest service)
- Update task status

## Deployment

### Vercel (Recommended)

1. **Connect Repository**: Import your GitHub repository to Vercel

2. **Environment Variables**: Add the following environment variables in Vercel dashboard:
   \`\`\`
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   \`\`\`

3. **Deploy**: Vercel will automatically deploy your application

4. **Database Setup**: Run the SQL scripts in your Supabase dashboard

### Manual Deployment

1. **Build the application**:
   \`\`\`bash
   pnpm build
   \`\`\`

2. **Start production server**:
   \`\`\`bash
   pnpm start
   \`\`\`

## Database Schema

### Core Tables

- **users**: Extended user profiles with roles
- **tasks**: Task management with priorities and categories  
- **activity_logs**: Comprehensive activity tracking
- **task_comments**: Task-specific comments and notes

### Key Features

- **Row Level Security (RLS)**: All tables protected with appropriate policies
- **Real-time Subscriptions**: Live updates for tasks and activities
- **Audit Trail**: Complete activity logging for compliance
- **Role-based Access**: Granular permissions per user role

## API Routes

- `POST /api/export/activity-logs` - Export activity logs as PDF
- `POST /api/export/reports` - Export various reports as PDF

## Development

### Project Structure

\`\`\`
├── app/                    # Next.js app directory
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main application pages
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utility functions and configurations
├── scripts/               # Database migration scripts
└── public/                # Static assets
\`\`\`

### Key Components

- `RoleBasedLayout`: Main layout with role-specific navigation
- `TaskDashboard`: Main dashboard for task management
- `TaskCard`: Individual task display and actions
- `UserManagement`: Admin interface for user management
- `ActivityLogsView`: Activity monitoring interface
- `ReportsView`: Analytics and reporting interface

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

- All database operations use Row Level Security (RLS)
- User authentication handled by Supabase Auth
- Role-based access control throughout the application
- Environment variables for sensitive configuration
- HTTPS enforced in production

## Support

For support and questions:

1. Check the documentation above
2. Review the code comments and examples
3. Open an issue in the repository
4. Contact the development team

## License

This project is proprietary software for hotel operations management.

---

Built with ❤️ for efficient hotel operations management.
